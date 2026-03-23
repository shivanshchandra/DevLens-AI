from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.services.analysis.import_coupling_analyzer import analyze_import_coupling


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


def _parent_directory(file_path: str) -> str:
    normalized = str(file_path or "").replace("\\", "/").strip("/")
    if not normalized:
        return "."
    parts = normalized.split("/")
    if len(parts) <= 1:
        return "."
    return "/".join(parts[:-1])


def _risk_level(score: int) -> str:
    if score >= 75:
        return "high"
    if score >= 45:
        return "medium"
    return "low"


def _is_low_signal_directory(path_value: str) -> bool:
    normalized = str(path_value or "").replace("\\", "/").strip("/")
    if not normalized or normalized == ".":
        return False
    parts = [p.lower() for p in normalized.split("/") if p]
    return any(part in LOW_SIGNAL_DIR_NAMES for part in parts)


def _path_weight(path_value: str) -> float:
    return 0.55 if _is_low_signal_directory(path_value) else 1.0


def _confidence_from_file_signals(
    *,
    loc: int,
    finding_count: int,
    hotspot_score: int,
    final_score: int,
    file_path: str,
) -> str:
    strong_count = 0
    if loc >= 800:
        strong_count += 1
    if finding_count >= 4:
        strong_count += 1
    if hotspot_score >= 70:
        strong_count += 1
    if not _is_low_signal_directory(file_path) and final_score >= 60:
        strong_count += 1

    if strong_count >= 3:
        return "high"
    if strong_count >= 2:
        return "medium"
    return "low"


def detect_architecture_signals(
    *,
    root_dir: str,
    file_locs: dict[str, int],
    findings: list[dict],
    complexity_hotspots: list[dict],
) -> dict[str, Any]:
    """
    Architecture detector v2 hardened.

    Includes:
    - code concentration by directory
    - possible god/overloaded files
    - maintainability hotspots
    - import coupling hotspots
    - dependency hubs
    - boundary warnings

    Hardening:
    - down-weights low-signal/support folders like tests/examples/docs/.github
    - adds confidence labels
    - softens recommendations and risk contribution from noisy folders
    """
    file_locs = file_locs or {}
    findings = findings or []
    complexity_hotspots = complexity_hotspots or []

    total_loc = sum(int(v or 0) for v in file_locs.values())
    total_files = len(file_locs)

    hotspot_map: dict[str, int] = {}
    for item in complexity_hotspots:
        file_path = str(item.get("filePath") or "").replace("\\", "/")
        if not file_path:
            continue
        hotspot_map[file_path] = int(item.get("score") or 0)

    findings_by_file: dict[str, list[dict]] = defaultdict(list)
    for finding in findings:
        file_path = str(finding.get("filePath") or "").replace("\\", "/")
        if not file_path:
            continue
        findings_by_file[file_path].append(finding)

    dir_stats: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "directoryPath": ".",
            "fileCount": 0,
            "loc": 0,
            "issueCount": 0,
            "hotspotCount": 0,
            "score": 0,
        }
    )

    file_hotspots: list[dict[str, Any]] = []

    for file_path, loc in file_locs.items():
        normalized_file = str(file_path).replace("\\", "/")
        directory = _parent_directory(normalized_file)
        file_findings = findings_by_file.get(normalized_file, [])
        hotspot_score = int(hotspot_map.get(normalized_file, 0))
        finding_count = len(file_findings)
        weight = _path_weight(normalized_file)

        reasons: list[str] = []
        raw_score = 0

        if loc >= 800:
            raw_score += 30
            reasons.append(f"very large file ({loc} LOC)")
        elif loc >= 400:
            raw_score += 18
            reasons.append(f"large file ({loc} LOC)")
        elif loc >= 250:
            raw_score += 8
            reasons.append(f"moderately large file ({loc} LOC)")

        if finding_count >= 6:
            raw_score += 28
            reasons.append(f"many findings clustered in one file ({finding_count})")
        elif finding_count >= 3:
            raw_score += 14
            reasons.append(f"multiple findings in one file ({finding_count})")

        if hotspot_score >= 80:
            raw_score += 28
            reasons.append(f"very high complexity hotspot ({hotspot_score})")
        elif hotspot_score >= 60:
            raw_score += 18
            reasons.append(f"high complexity hotspot ({hotspot_score})")
        elif hotspot_score >= 40:
            raw_score += 10
            reasons.append(f"moderate complexity hotspot ({hotspot_score})")

        final_score = min(100, int(round(raw_score * weight)))

        if score := final_score:
            if _is_low_signal_directory(normalized_file):
                reasons.append("signal down-weighted because file is in a support/test-oriented directory")

            file_hotspots.append(
                {
                    "filePath": normalized_file,
                    "loc": loc,
                    "findingCount": finding_count,
                    "hotspotScore": hotspot_score,
                    "score": score,
                    "confidence": _confidence_from_file_signals(
                        loc=loc,
                        finding_count=finding_count,
                        hotspot_score=hotspot_score,
                        final_score=score,
                        file_path=normalized_file,
                    ),
                    "reasons": reasons[:6],
                }
            )

        bucket = dir_stats[directory]
        bucket["directoryPath"] = directory
        bucket["fileCount"] += 1
        bucket["loc"] += loc
        bucket["issueCount"] += finding_count
        if hotspot_score >= 40:
            bucket["hotspotCount"] += 1

    directory_hotspots: list[dict[str, Any]] = []
    for directory, bucket in dir_stats.items():
        loc = int(bucket["loc"])
        file_count = int(bucket["fileCount"])
        issue_count = int(bucket["issueCount"])
        hotspot_count = int(bucket["hotspotCount"])
        weight = _path_weight(directory)

        raw_score = 0
        if loc >= 3000:
            raw_score += 30
        elif loc >= 1500:
            raw_score += 18
        elif loc >= 700:
            raw_score += 10

        if file_count >= 20:
            raw_score += 20
        elif file_count >= 10:
            raw_score += 10

        if issue_count >= 12:
            raw_score += 22
        elif issue_count >= 6:
            raw_score += 12
        elif issue_count >= 3:
            raw_score += 6

        if hotspot_count >= 4:
            raw_score += 18
        elif hotspot_count >= 2:
            raw_score += 10

        loc_share = round((loc / total_loc) * 100, 1) if total_loc > 0 else 0.0
        score = min(100, int(round(raw_score * weight)))

        directory_hotspots.append(
            {
                "directoryPath": directory,
                "fileCount": file_count,
                "loc": loc,
                "locShare": loc_share,
                "issueCount": issue_count,
                "hotspotCount": hotspot_count,
                "score": score,
                "confidence": "high" if score >= 60 and weight >= 1.0 else "medium" if score >= 30 else "low",
            }
        )

    directory_hotspots = sorted(
        directory_hotspots,
        key=lambda item: (-int(item["score"]), -int(item["loc"]), item["directoryPath"]),
    )[:8]

    possible_god_files: list[dict[str, Any]] = []
    for item in sorted(file_hotspots, key=lambda x: (-int(x["score"]), x["filePath"])):
        if (
            int(item["loc"]) >= 400
            or int(item["findingCount"]) >= 4
            or int(item["hotspotScore"]) >= 70
        ):
            possible_god_files.append(item)

    possible_god_files = possible_god_files[:8]
    file_hotspots = sorted(
        file_hotspots,
        key=lambda item: (-int(item["score"]), -int(item["loc"]), item["filePath"]),
    )[:8]

    coupling = analyze_import_coupling(root_dir)

    coupling_hotspots = coupling.get("couplingHotspots", [])
    dependency_hubs = coupling.get("dependencyHubs", [])
    boundary_warnings = coupling.get("boundaryWarnings", [])
    directory_coupling_hotspots = coupling.get("directoryCouplingHotspots", [])

    smells: list[dict[str, Any]] = []
    recommendations: list[str] = []

    if directory_hotspots:
        top_dir = directory_hotspots[0]
        if float(top_dir["locShare"]) >= 45 and not _is_low_signal_directory(top_dir["directoryPath"]):
            smells.append(
                {
                    "id": "ARCH-1",
                    "title": "High directory concentration",
                    "severity": "high" if float(top_dir["locShare"]) >= 60 else "medium",
                    "confidence": top_dir.get("confidence", "medium"),
                    "message": (
                        f"Directory '{top_dir['directoryPath']}' contains "
                        f"{top_dir['locShare']}% of analyzed LOC, which may indicate structural concentration."
                    ),
                    "evidence": {
                        "directoryPath": top_dir["directoryPath"],
                        "locShare": top_dir["locShare"],
                        "loc": top_dir["loc"],
                        "fileCount": top_dir["fileCount"],
                    },
                    "recommendation": "Split oversized modules into clearer boundaries and reduce concentration in a single directory.",
                }
            )
            recommendations.append(
                f"Reduce code concentration in '{top_dir['directoryPath']}' by splitting responsibilities into smaller modules."
            )

    if possible_god_files:
        top_file = possible_god_files[0]
        smells.append(
            {
                "id": "ARCH-2",
                "title": "Possible god file detected",
                "severity": "high" if int(top_file["score"]) >= 70 else "medium",
                "confidence": top_file.get("confidence", "medium"),
                "message": (
                    f"File '{top_file['filePath']}' appears overloaded with size/findings/complexity pressure."
                ),
                "evidence": {
                    "filePath": top_file["filePath"],
                    "loc": top_file["loc"],
                    "findingCount": top_file["findingCount"],
                    "hotspotScore": top_file["hotspotScore"],
                    "score": top_file["score"],
                },
                "recommendation": "Break this file into smaller units, reduce branching, and isolate responsibilities.",
            }
        )
        recommendations.append(
            f"Refactor overloaded file '{top_file['filePath']}' into smaller focused modules."
        )

    clustered_dirs = [
        d for d in directory_hotspots
        if int(d["hotspotCount"]) >= 2 and int(d["issueCount"]) >= 4 and not _is_low_signal_directory(d["directoryPath"])
    ]
    if clustered_dirs:
        smells.append(
            {
                "id": "ARCH-3",
                "title": "Hotspot clustering by directory",
                "severity": "medium",
                "confidence": clustered_dirs[0].get("confidence", "medium"),
                "message": (
                    "Multiple hotspots and findings are concentrated in the same directory, "
                    "which may indicate maintainability bottlenecks."
                ),
                "evidence": {
                    "directories": [
                        {
                            "directoryPath": d["directoryPath"],
                            "hotspotCount": d["hotspotCount"],
                            "issueCount": d["issueCount"],
                        }
                        for d in clustered_dirs[:4]
                    ]
                },
                "recommendation": "Review module boundaries and reduce repeated complexity concentration inside the same folder.",
            }
        )
        recommendations.append(
            "Review hotspot-heavy directories first and reduce repeated complexity concentration at the module level."
        )

    if dependency_hubs:
        top_hub = dependency_hubs[0]
        smells.append(
            {
                "id": "ARCH-4",
                "title": "Dependency hub detected",
                "severity": "high" if int(top_hub.get("inboundDependencyCount", 0)) >= 7 else "medium",
                "confidence": top_hub.get("confidence", "medium"),
                "message": (
                    f"File '{top_hub['filePath']}' is depended on by many internal files, "
                    "which may increase blast radius for changes."
                ),
                "evidence": top_hub,
                "recommendation": "Stabilize the public contract of this file or split responsibilities to reduce hub pressure.",
            }
        )
        recommendations.append(
            f"Review dependency hub '{top_hub['filePath']}' and stabilize its public contract or reduce fan-in around it."
        )

    if boundary_warnings:
        top_warning = boundary_warnings[0]
        smells.append(
            {
                "id": "ARCH-5",
                "title": "Cross-directory boundary pressure",
                "severity": top_warning.get("severity", "medium"),
                "confidence": top_warning.get("confidence", "medium"),
                "message": top_warning.get("message"),
                "evidence": top_warning,
                "recommendation": "Tighten module boundaries where cross-directory imports are becoming too frequent.",
            }
        )
        recommendations.append(
            f"Tighten boundaries between '{top_warning.get('sourceDirectory')}' and '{top_warning.get('targetDirectory')}' where cross-module imports are concentrated."
        )

    if len(possible_god_files) >= 3:
        recommendations.append(
            "Create a focused refactor plan for the top overloaded files before adding more features in those areas."
        )

    if coupling_hotspots:
        recommendations.append(
            "Prioritize refactoring files with both high internal import breadth and high inbound dependency pressure."
        )

    if not recommendations:
        recommendations.append(
            "Architecture signals look relatively stable; continue monitoring large files, hotspot directories, clustered findings, and coupling hotspots."
        )

    architecture_risk_score = min(
        100,
        (
            min(26, len(possible_god_files) * 7)
            + min(24, len(smells) * 8)
            + min(18, len([x for x in coupling_hotspots if x.get("confidence") != "low"]) * 4)
            + min(12, len([x for x in boundary_warnings if x.get("severity") != "low"]) * 6)
            + min(10, sum(1 for d in directory_hotspots if float(d["locShare"]) >= 25 and not _is_low_signal_directory(d["directoryPath"])) * 5)
        ),
    )

    summary = {
        "totalFilesAnalyzed": total_files,
        "totalLocAnalyzed": total_loc,
        "possibleGodFiles": len(possible_god_files),
        "hotspotDirectories": len([d for d in directory_hotspots if int(d["score"]) >= 25]),
        "architectureSmells": len(smells),
        "architectureRiskScore": architecture_risk_score,
        "architectureRiskLevel": _risk_level(architecture_risk_score),
        "couplingHotspots": len(coupling_hotspots),
        "dependencyHubs": len(dependency_hubs),
        "boundaryWarnings": len(boundary_warnings),
        "directoryCouplingHotspots": len(directory_coupling_hotspots),
    }

    return {
        "summary": summary,
        "directoryHotspots": directory_hotspots,
        "fileHotspots": file_hotspots,
        "possibleGodFiles": possible_god_files,
        "smells": smells,
        "recommendations": recommendations[:8],
        "couplingHotspots": coupling_hotspots,
        "dependencyHubs": dependency_hubs,
        "boundaryWarnings": boundary_warnings,
        "directoryCouplingHotspots": directory_coupling_hotspots,
    }