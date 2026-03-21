from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import Any


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


def detect_architecture_signals(
    *,
    file_locs: dict[str, int],
    findings: list[dict],
    complexity_hotspots: list[dict],
) -> dict[str, Any]:
    """
    Heuristic architecture detector v1.

    Goals:
    - detect code concentration by directory
    - detect possible god/overloaded files
    - detect maintainability hotspots by directory/module
    - produce architecture summary + recommendations
    - remain fully backward-compatible with current flow
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

        reasons: list[str] = []
        score = 0

        if loc >= 800:
            score += 30
            reasons.append(f"very large file ({loc} LOC)")
        elif loc >= 400:
            score += 18
            reasons.append(f"large file ({loc} LOC)")
        elif loc >= 250:
            score += 8
            reasons.append(f"moderately large file ({loc} LOC)")

        if finding_count >= 6:
            score += 28
            reasons.append(f"many findings clustered in one file ({finding_count})")
        elif finding_count >= 3:
            score += 14
            reasons.append(f"multiple findings in one file ({finding_count})")

        if hotspot_score >= 80:
            score += 28
            reasons.append(f"very high complexity hotspot ({hotspot_score})")
        elif hotspot_score >= 60:
            score += 18
            reasons.append(f"high complexity hotspot ({hotspot_score})")
        elif hotspot_score >= 40:
            score += 10
            reasons.append(f"moderate complexity hotspot ({hotspot_score})")

        if score > 0:
            file_hotspots.append(
                {
                    "filePath": normalized_file,
                    "loc": loc,
                    "findingCount": finding_count,
                    "hotspotScore": hotspot_score,
                    "score": min(100, score),
                    "reasons": reasons[:5],
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

        score = 0
        if loc >= 3000:
            score += 30
        elif loc >= 1500:
            score += 18
        elif loc >= 700:
            score += 10

        if file_count >= 20:
            score += 20
        elif file_count >= 10:
            score += 10

        if issue_count >= 12:
            score += 22
        elif issue_count >= 6:
            score += 12
        elif issue_count >= 3:
            score += 6

        if hotspot_count >= 4:
            score += 18
        elif hotspot_count >= 2:
            score += 10

        loc_share = round((loc / total_loc) * 100, 1) if total_loc > 0 else 0.0

        directory_hotspots.append(
            {
                "directoryPath": directory,
                "fileCount": file_count,
                "loc": loc,
                "locShare": loc_share,
                "issueCount": issue_count,
                "hotspotCount": hotspot_count,
                "score": min(100, score),
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

    smells: list[dict[str, Any]] = []
    recommendations: list[str] = []

    if directory_hotspots:
        top_dir = directory_hotspots[0]
        if float(top_dir["locShare"]) >= 45:
            smells.append(
                {
                    "id": "ARCH-1",
                    "title": "High directory concentration",
                    "severity": "high" if float(top_dir["locShare"]) >= 60 else "medium",
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

    clustered_dirs = [d for d in directory_hotspots if int(d["hotspotCount"]) >= 2 and int(d["issueCount"]) >= 4]
    if clustered_dirs:
        smells.append(
            {
                "id": "ARCH-3",
                "title": "Hotspot clustering by directory",
                "severity": "medium",
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

    if len(possible_god_files) >= 3:
        recommendations.append(
            "Create a focused refactor plan for the top overloaded files before adding more features in those areas."
        )

    if not recommendations:
        recommendations.append(
            "Architecture signals look relatively stable; continue monitoring large files, hotspot directories, and clustered findings."
        )

    architecture_risk_score = min(
        100,
        (
            min(40, len(possible_god_files) * 10)
            + min(35, len(smells) * 12)
            + min(25, sum(1 for d in directory_hotspots if float(d["locShare"]) >= 25) * 8)
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
    }

    return {
        "summary": summary,
        "directoryHotspots": directory_hotspots,
        "fileHotspots": file_hotspots,
        "possibleGodFiles": possible_god_files,
        "smells": smells,
        "recommendations": recommendations[:6],
    }