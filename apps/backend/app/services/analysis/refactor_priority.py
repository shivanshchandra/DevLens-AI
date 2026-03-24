from __future__ import annotations

from typing import Any


SEVERITY_SCORE = {
    "critical": 40,
    "high": 20,
    "medium": 8,
    "low": 3,
}

LOW_SIGNAL_PATH_PARTS = {
    "tests",
    "test",
    "docs",
    "examples",
    "example",
    ".github",
    "scripts",
    "script",
    "migrations",
    "__pycache__",
}

GENERATED_OR_VENDOR_PATH_PARTS = {
    "node_modules",
    "vendor",
    "dist",
    "build",
    ".next",
    "coverage",
}

PROD_SIGNAL_PATH_PARTS = {
    "app",
    "src",
    "backend",
    "api",
    "services",
    "service",
    "core",
    "models",
    "routes",
    "controllers",
    "repositories",
}


def _normalize_path(file_path: str) -> str:
    return str(file_path or "").replace("\\", "/").strip().lower()


def _path_penalty(file_path: str) -> tuple[int, list[str]]:
    path = _normalize_path(file_path)
    if not path:
        return 0, []

    parts = [part for part in path.split("/") if part]
    filename = parts[-1] if parts else ""

    penalty = 0
    reasons: list[str] = []

    if any(part in LOW_SIGNAL_PATH_PARTS for part in parts):
        penalty += 8
        reasons.append("lower-signal support/test/docs path")

    if any(part in GENERATED_OR_VENDOR_PATH_PARTS for part in parts):
        penalty += 15
        reasons.append("generated/build/vendor path")

    if filename.endswith(".min.js") or filename.endswith(".min.css"):
        penalty += 12
        reasons.append("minified artifact")

    if filename.endswith(".generated.py") or filename.endswith(".g.py"):
        penalty += 12
        reasons.append("generated source artifact")

    return penalty, reasons


def _path_boost(file_path: str) -> tuple[int, list[str]]:
    path = _normalize_path(file_path)
    if not path:
        return 0, []

    parts = [part for part in path.split("/") if part]

    boost = 0
    reasons: list[str] = []

    if any(part in PROD_SIGNAL_PATH_PARTS for part in parts):
        boost += 6
        reasons.append("production application path")

    wrapped_path = f"/{path}/"
    if "/app/" in wrapped_path or "/src/" in wrapped_path:
        boost += 4
        reasons.append("core source tree")

    return boost, reasons


def _effort_from_score(score: int) -> str:
    if score >= 80:
        return "high"
    if score >= 35:
        return "medium"
    return "low"


def _recommended_action(reasons: list[str]) -> str:
    text = " ".join(reasons).lower()

    if "secret" in text:
        return "Remove exposed secrets first, rotate credentials, and move configuration to environment or a secret manager."
    if "dependency" in text or "vulnerable dependency" in text:
        return "Upgrade the vulnerable dependency first, then run compatibility tests and regression checks."
    if "complexity" in text:
        return "Refactor this file into smaller units, reduce branching, and add targeted tests around critical paths."
    if "risk" in text or "unsafe" in text:
        return "Replace risky implementation patterns with safer explicit logic before making further feature changes."

    return "Review this file first, reduce its highest-risk issues, and then perform focused cleanup/refactoring."


def _build_hotspot_map(complexity_hotspots: list[dict]) -> dict[str, int]:
    hotspot_map: dict[str, int] = {}
    for item in complexity_hotspots or []:
        file_path = str(item.get("filePath") or "")
        score = int(item.get("score") or 0)
        if file_path:
            hotspot_map[file_path] = score
    return hotspot_map


def build_refactor_priority(
    findings: list[dict],
    complexity_hotspots: list[dict] | None = None,
    file_locs: dict[str, int] | None = None,
    limit: int = 10,
) -> list[dict]:
    """
    Build a ranked list of files to fix first.

    Output shape:
    [
        {
            "filePath": "...",
            "priorityScore": 87,
            "estimatedEffort": "high|medium|low",
            "reasons": [...],
            "recommendedAction": "..."
        }
    ]
    """
    file_locs = file_locs or {}
    hotspot_map = _build_hotspot_map(complexity_hotspots or [])

    per_file: dict[str, dict[str, Any]] = {}

    for finding in findings or []:
        file_path = str(finding.get("filePath") or "").strip()
        if not file_path:
            continue

        severity = str(finding.get("severity") or "").lower()
        title = str(finding.get("title") or "Issue")
        rule_id = str(finding.get("ruleId") or "")
        ftype = str(finding.get("type") or "").lower()

        bucket = per_file.setdefault(
            file_path,
            {
                "score": 0,
                "reasons": [],
                "findingCount": 0,
                "hasSecret": False,
                "hasDependency": False,
                "hasComplexity": False,
                "hasRisk": False,
                "pathSignalsApplied": False,
            },
        )

        bucket["findingCount"] += 1
        bucket["score"] += SEVERITY_SCORE.get(severity, 2)

        reason = f"{severity or 'unknown'} finding: {title}"
        if reason not in bucket["reasons"]:
            bucket["reasons"].append(reason)

        if ftype == "security" and "secret" in title.lower():
            bucket["hasSecret"] = True
            bucket["score"] += 20

        if ftype == "dependency" or rule_id == "OSV":
            bucket["hasDependency"] = True
            bucket["score"] += 18

        if rule_id == "CYCLO_COMPLEXITY":
            bucket["hasComplexity"] = True
            bucket["score"] += 10

        if ftype == "risk":
            bucket["hasRisk"] = True
            bucket["score"] += 8

    for file_path, bucket in per_file.items():
        hotspot_score = hotspot_map.get(file_path, 0)
        loc = int(file_locs.get(file_path, 0) or 0)

        if not bucket.get("pathSignalsApplied"):
            path_boost, boost_reasons = _path_boost(file_path)
            path_penalty, penalty_reasons = _path_penalty(file_path)

            bucket["score"] += path_boost - path_penalty

            for reason in boost_reasons:
                if reason not in bucket["reasons"]:
                    bucket["reasons"].append(reason)

            for reason in penalty_reasons:
                if reason not in bucket["reasons"]:
                    bucket["reasons"].append(reason)

            bucket["pathSignalsApplied"] = True

        # hotspot contribution
        bucket["score"] += min(30, hotspot_score // 4)

        # LOC contribution
        if loc >= 800:
            bucket["score"] += 15
            if f"large file size: {loc} LOC" not in bucket["reasons"]:
                bucket["reasons"].append(f"large file size: {loc} LOC")
        elif loc >= 300:
            bucket["score"] += 8
            if f"moderate file size: {loc} LOC" not in bucket["reasons"]:
                bucket["reasons"].append(f"moderate file size: {loc} LOC")

        # finding density bonus
        if bucket["findingCount"] >= 5:
            bucket["score"] += 10
            density_reason = f"multiple findings clustered in one file ({bucket['findingCount']})"
            if density_reason not in bucket["reasons"]:
                bucket["reasons"].append(density_reason)

        # hotspot reason
        if hotspot_score >= 80:
            hotspot_reason = f"high complexity hotspot score: {hotspot_score}"
            if hotspot_reason not in bucket["reasons"]:
                bucket["reasons"].append(hotspot_reason)
        elif hotspot_score >= 50:
            hotspot_reason = f"moderate complexity hotspot score: {hotspot_score}"
            if hotspot_reason not in bucket["reasons"]:
                bucket["reasons"].append(hotspot_reason)

    ranked = sorted(
        per_file.items(),
        key=lambda item: (-int(item[1]["score"]), item[0]),
    )[:limit]

    result: list[dict] = []

    for file_path, bucket in ranked:
        score = max(0, int(bucket["score"]))
        reasons = bucket["reasons"][:5]

        result.append(
            {
                "filePath": file_path,
                "priorityScore": score,
                "estimatedEffort": _effort_from_score(score),
                "reasons": reasons,
                "recommendedAction": _recommended_action(reasons),
            }
        )

    return result