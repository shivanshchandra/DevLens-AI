from __future__ import annotations

import ast
from collections import defaultdict
from pathlib import Path
from typing import Any


LOW_SIGNAL_DIR_NAMES = {
    "tests",
    "test",
    "examples",
    "example",
    "docs",
    "doc",
    ".github",
    "scripts",
    "script",
}


def _to_module_path(rel_path: str) -> str:
    normalized = str(rel_path).replace("\\", "/").strip("/")
    if normalized.endswith(".py"):
        normalized = normalized[:-3]
    if normalized.endswith("/__init__"):
        normalized = normalized[: -len("/__init__")]
    return normalized.replace("/", ".").strip(".")


def _parent_directory(file_path: str) -> str:
    normalized = str(file_path or "").replace("\\", "/").strip("/")
    if not normalized:
        return "."
    parts = normalized.split("/")
    if len(parts) <= 1:
        return "."
    return "/".join(parts[:-1])


def _safe_parse_python(file_path: Path) -> ast.AST | None:
    try:
        source = file_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None

    try:
        return ast.parse(source)
    except Exception:
        return None


def _resolve_relative_import(
    current_module: str,
    module_name: str | None,
    level: int,
) -> str:
    """
    Resolve Python ImportFrom base module.

    Important:
    - level == 0 means absolute import, so return module_name as-is
    - level > 0 means relative import from current_module
    """
    if level <= 0:
        return module_name or ""

    parts = current_module.split(".") if current_module else []

    # For "from .x import y" inside pkg.mod, we want base package "pkg"
    # then append x -> pkg.x
    trim_count = min(level, len(parts))
    parts = parts[:-trim_count]

    if module_name:
        if parts:
            return ".".join(parts + module_name.split("."))
        return module_name

    return ".".join(parts)


def _best_internal_match(imported_module: str, known_modules: set[str]) -> str | None:
    if not imported_module:
        return None

    if imported_module in known_modules:
        return imported_module

    parts = imported_module.split(".")
    while len(parts) > 1:
        parts.pop()
        candidate = ".".join(parts)
        if candidate in known_modules:
            return candidate

    return None


def _is_low_signal_directory(path_value: str) -> bool:
    normalized = str(path_value or "").replace("\\", "/").strip("/")
    if not normalized or normalized == ".":
        return False
    parts = [p.lower() for p in normalized.split("/") if p]
    return any(part in LOW_SIGNAL_DIR_NAMES for part in parts)


def _path_weight(path_value: str) -> float:
    return 0.45 if _is_low_signal_directory(path_value) else 1.0


def _confidence_from_counts(outbound_count: int, inbound_count: int, weighted_score: int) -> str:
    if weighted_score >= 75 or inbound_count >= 7 or outbound_count >= 8:
        return "high"
    if weighted_score >= 40 or inbound_count >= 4 or outbound_count >= 4:
        return "medium"
    return "low"


def analyze_import_coupling(root_dir: str | Path) -> dict[str, Any]:
    """
    Python-focused import coupling analyzer v2 hardening.

    Detects:
    - files with many internal imports
    - internal dependency hubs
    - cross-directory coupling
    - possible boundary warnings

    Hardening:
    - down-weights low-signal/support folders like tests/examples/docs/.github
    - adds confidence labels
    """
    root = Path(root_dir).resolve()

    python_files: list[tuple[Path, str]] = []
    known_modules: set[str] = set()
    module_to_file: dict[str, str] = {}

    for file_path in root.rglob("*.py"):
        if not file_path.is_file():
            continue

        rel_path = str(file_path.relative_to(root)).replace("\\", "/")
        module_path = _to_module_path(rel_path)

        python_files.append((file_path, rel_path))
        if module_path:
            known_modules.add(module_path)
            module_to_file[module_path] = rel_path

    imports_by_file: dict[str, list[str]] = defaultdict(list)
    inbound_by_file: dict[str, set[str]] = defaultdict(set)
    cross_dir_edges: dict[tuple[str, str], int] = defaultdict(int)

    for file_path, rel_path in python_files:
        tree = _safe_parse_python(file_path)
        if tree is None:
            continue

        current_module = _to_module_path(rel_path)
        current_dir = _parent_directory(rel_path)
        current_weight = _path_weight(rel_path)

        seen_targets: set[str] = set()

        for node in ast.walk(tree):
            resolved_candidates: list[str] = []

            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name:
                        resolved_candidates.append(alias.name)

            elif isinstance(node, ast.ImportFrom):
                base_module = _resolve_relative_import(
                    current_module=current_module,
                    module_name=node.module,
                    level=int(getattr(node, "level", 0) or 0),
                )

                for alias in node.names:
                    if alias.name == "*":
                        if base_module:
                            resolved_candidates.append(base_module)
                        continue

                    if base_module:
                        resolved_candidates.append(f"{base_module}.{alias.name}")
                    else:
                        resolved_candidates.append(alias.name)

            for candidate in resolved_candidates:
                matched_module = _best_internal_match(candidate, known_modules)
                if not matched_module:
                    continue

                target_file = module_to_file.get(matched_module)
                if not target_file or target_file == rel_path:
                    continue

                if target_file in seen_targets:
                    continue

                seen_targets.add(target_file)
                imports_by_file[rel_path].append(target_file)
                inbound_by_file[target_file].add(rel_path)

                target_dir = _parent_directory(target_file)
                if current_dir != target_dir:
                    edge_weight = min(current_weight, _path_weight(target_file))
                    cross_dir_edges[(current_dir, target_dir)] += max(1, int(round(edge_weight * 2)))

    coupling_hotspots: list[dict[str, Any]] = []
    dependency_hubs: list[dict[str, Any]] = []

    all_files = sorted(set(list(imports_by_file.keys()) + list(inbound_by_file.keys())))

    for file_path in all_files:
        outbound_count = len(set(imports_by_file.get(file_path, [])))
        inbound_count = len(set(inbound_by_file.get(file_path, set())))
        weight = _path_weight(file_path)
        weighted_score = min(100, int(round((outbound_count * 10 + inbound_count * 8) * weight)))
        confidence = _confidence_from_counts(outbound_count, inbound_count, weighted_score)

        if outbound_count >= 3 or inbound_count >= 3:
            reasons: list[str] = []
            if outbound_count >= 5:
                reasons.append(f"imports many internal files ({outbound_count})")
            elif outbound_count >= 3:
                reasons.append(f"moderate internal import breadth ({outbound_count})")

            if inbound_count >= 5:
                reasons.append(f"depended on by many internal files ({inbound_count})")
            elif inbound_count >= 3:
                reasons.append(f"shared internal dependency ({inbound_count})")

            if _is_low_signal_directory(file_path):
                reasons.append("signal down-weighted because file is in a support/test-oriented directory")

            coupling_hotspots.append(
                {
                    "filePath": file_path,
                    "internalImportCount": outbound_count,
                    "internalInboundCount": inbound_count,
                    "score": weighted_score,
                    "confidence": confidence,
                    "reasons": reasons[:5],
                }
            )

        if inbound_count >= 4:
            hub_reasons = [f"many internal files depend on this file ({inbound_count})"]
            if _is_low_signal_directory(file_path):
                hub_reasons.append("dependency-hub signal is down-weighted in a support/test-oriented directory")

            dependency_hubs.append(
                {
                    "filePath": file_path,
                    "inboundDependencyCount": inbound_count,
                    "score": min(100, int(round(inbound_count * 12 * weight))),
                    "confidence": "high" if inbound_count >= 7 and weight >= 1.0 else "medium",
                    "reasons": hub_reasons[:4],
                }
            )

    boundary_warnings: list[dict[str, Any]] = []
    for (source_dir, target_dir), count in sorted(
        cross_dir_edges.items(),
        key=lambda item: (-item[1], item[0][0], item[0][1]),
    ):
        source_low_signal = _is_low_signal_directory(source_dir)
        target_low_signal = _is_low_signal_directory(target_dir)

        threshold = 5 if (source_low_signal or target_low_signal) else 3
        if count < threshold:
            continue

        if source_low_signal and target_low_signal:
            severity = "low"
            confidence = "low"
        elif count >= 8:
            severity = "high"
            confidence = "high"
        else:
            severity = "medium"
            confidence = "medium"

        boundary_warnings.append(
            {
                "sourceDirectory": source_dir,
                "targetDirectory": target_dir,
                "crossImportCount": count,
                "severity": severity,
                "confidence": confidence,
                "message": (
                    f"Directory '{source_dir}' imports across into '{target_dir}' "
                    f"{count} times, which may indicate tighter-than-expected module coupling."
                ),
            }
        )

    directory_coupling_hotspots: list[dict[str, Any]] = []
    directory_outbound: dict[str, int] = defaultdict(int)
    directory_unique_targets: dict[str, set[str]] = defaultdict(set)

    for (source_dir, target_dir), count in cross_dir_edges.items():
        directory_outbound[source_dir] += count
        directory_unique_targets[source_dir].add(target_dir)

    for source_dir in sorted(directory_outbound.keys()):
        outbound_count = int(directory_outbound[source_dir])
        unique_targets = len(directory_unique_targets[source_dir])
        weight = _path_weight(source_dir)
        score = min(100, int(round((outbound_count * 6 + unique_targets * 8) * weight)))

        directory_coupling_hotspots.append(
            {
                "directoryPath": source_dir,
                "crossImportCount": outbound_count,
                "uniqueTargetDirectories": unique_targets,
                "score": score,
                "confidence": "high" if score >= 65 and weight >= 1.0 else "medium" if score >= 35 else "low",
            }
        )

    coupling_hotspots = sorted(
        coupling_hotspots,
        key=lambda item: (-int(item["score"]), item["filePath"]),
    )[:8]

    dependency_hubs = sorted(
        dependency_hubs,
        key=lambda item: (-int(item["score"]), item["filePath"]),
    )[:8]

    boundary_warnings = boundary_warnings[:8]

    directory_coupling_hotspots = sorted(
        directory_coupling_hotspots,
        key=lambda item: (-int(item["score"]), item["directoryPath"]),
    )[:8]

    summary = {
        "pythonFilesAnalyzedForCoupling": len(python_files),
        "couplingHotspots": len(coupling_hotspots),
        "dependencyHubs": len(dependency_hubs),
        "boundaryWarnings": len(boundary_warnings),
        "directoryCouplingHotspots": len(directory_coupling_hotspots),
    }

    return {
        "summary": summary,
        "couplingHotspots": coupling_hotspots,
        "dependencyHubs": dependency_hubs,
        "boundaryWarnings": boundary_warnings,
        "directoryCouplingHotspots": directory_coupling_hotspots,
    }