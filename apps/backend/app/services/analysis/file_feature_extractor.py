from __future__ import annotations

from pathlib import Path
from typing import Iterable

from app.services.analysis.directory_analyzer import (
    EXT_TO_LANG,
    TEXT_EXT_ALLOWLIST,
    DEFAULT_EXCLUDE_DIRS,
)


SEVERITY_KEYS = ("critical", "high", "medium", "low")


def _is_excluded(path: Path, exclude_dirs: set[str]) -> bool:
    parts = set(path.parts)
    return any(d in parts for d in exclude_dirs)


def _iter_target_files(
    root: Path,
    include_paths: Iterable[str] | None = None,
    exclude_dirs: set[str] | None = None,
    max_files: int = 30_000,
) -> list[Path]:
    exclude_dirs = exclude_dirs or set(DEFAULT_EXCLUDE_DIRS)
    files: list[Path] = []

    if include_paths is not None:
        for rel in include_paths:
            rel = (rel or "").replace("\\", "/").strip()
            if not rel:
                continue

            p = (root / rel).resolve()

            if not str(p).startswith(str(root)):
                continue
            if not p.exists() or not p.is_file():
                continue
            if _is_excluded(p, exclude_dirs):
                continue

            ext = p.suffix.lower()
            if ext and ext not in TEXT_EXT_ALLOWLIST:
                continue

            files.append(p)

        return files[:max_files]

    count = 0
    for p in root.rglob("*"):
        if count >= max_files:
            break
        if p.is_dir():
            continue
        if _is_excluded(p, exclude_dirs):
            continue

        ext = p.suffix.lower()
        if ext and ext not in TEXT_EXT_ALLOWLIST:
            continue

        files.append(p)
        count += 1

    return files


def _safe_read_text(file_path: Path, max_bytes: int = 2_000_000) -> str:
    try:
        if file_path.stat().st_size > max_bytes:
            return ""
        return file_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def _count_comment_lines(lines: list[str], suffix: str) -> int:
    comment_markers = {
        ".py": "#",
        ".sh": "#",
        ".yml": "#",
        ".yaml": "#",
        ".toml": "#",
        ".ini": ";",
        ".cfg": ";",
        ".js": "//",
        ".jsx": "//",
        ".ts": "//",
        ".tsx": "//",
        ".java": "//",
        ".go": "//",
        ".rs": "//",
        ".c": "//",
        ".cpp": "//",
        ".css": "/*",
        ".html": "<!--",
        ".md": "",
        ".json": "",
    }

    marker = comment_markers.get(suffix, "")
    if not marker:
        return 0

    count = 0
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith(marker):
            count += 1
    return count


def _empty_severity_counts() -> dict[str, int]:
    return {key: 0 for key in SEVERITY_KEYS}


def _aggregate_hotspots(complexity_hotspots: list[dict] | None) -> dict[str, int]:
    hotspot_map: dict[str, int] = {}

    for item in complexity_hotspots or []:
        file_path = str(item.get("filePath") or "").replace("\\", "/").strip()
        score = int(item.get("score") or 0)
        if not file_path:
            continue

        hotspot_map[file_path] = max(hotspot_map.get(file_path, 0), score)

    return hotspot_map


def _group_findings_by_file(findings: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}

    for item in findings or []:
        file_path = str(item.get("filePath") or "").replace("\\", "/").strip()
        if not file_path:
            continue
        grouped.setdefault(file_path, []).append(item)

    return grouped


def _infer_hotspot_level(score: int) -> str:
    if score >= 80:
        return "high"
    if score >= 50:
        return "medium"
    if score > 0:
        return "low"
    return "none"


def build_file_features(
    root_dir: str | Path,
    findings: list[dict],
    complexity_hotspots: list[dict] | None = None,
    include_paths: Iterable[str] | None = None,
    exclude_dirs: set[str] | None = None,
    max_files: int = 30_000,
) -> list[dict]:
    """
    Build per-file structured features without changing existing scan behavior.

    Output example:
    [
        {
            "filePath": "...",
            "language": "Python",
            "extension": ".py",
            "loc": 120,
            "blankLines": 18,
            "commentLines": 7,
            "sizeBytes": 4281,
            "findingCount": 3,
            "severityCounts": {...},
            "secretCount": 1,
            "dependencyIssueCount": 0,
            "riskCount": 1,
            "complexityFindingCount": 1,
            "hotspotScore": 70,
            "hotspotLevel": "medium",
            "isDependencyFile": false,
            "isConfigFile": false,
            "isTestFile": false,
            "changedInPr": true/false
        }
    ]
    """
    root = Path(root_dir).resolve()
    exclude_dirs = exclude_dirs or set(DEFAULT_EXCLUDE_DIRS)

    candidate_files = _iter_target_files(
        root=root,
        include_paths=include_paths,
        exclude_dirs=exclude_dirs,
        max_files=max_files,
    )

    grouped_findings = _group_findings_by_file(findings)
    hotspot_map = _aggregate_hotspots(complexity_hotspots)

    include_set = None
    if include_paths is not None:
        include_set = {
            str((root / rel).resolve().relative_to(root)).replace("\\", "/")
            for rel in include_paths
            if rel
            and (root / rel).resolve().exists()
            and str((root / rel).resolve()).startswith(str(root))
        }

    results: list[dict] = []

    for file_path in candidate_files:
        rel_path = str(file_path.relative_to(root)).replace("\\", "/")
        content = _safe_read_text(file_path)
        if not content:
            continue

        lines = content.splitlines()
        total_lines = len(lines)
        blank_lines = sum(1 for line in lines if not line.strip())
        comment_lines = _count_comment_lines(lines, file_path.suffix.lower())
        loc = max(0, total_lines - blank_lines)

        language = EXT_TO_LANG.get(file_path.suffix.lower(), "Other")
        file_findings = grouped_findings.get(rel_path, [])
        severity_counts = _empty_severity_counts()

        secret_count = 0
        dependency_issue_count = 0
        risk_count = 0
        complexity_finding_count = 0
        quality_count = 0
        security_count = 0

        for finding in file_findings:
            severity = str(finding.get("severity") or "").lower()
            if severity in severity_counts:
                severity_counts[severity] += 1

            ftype = str(finding.get("type") or "").lower()
            rule_id = str(finding.get("ruleId") or "").upper()

            if ftype == "security":
                security_count += 1
            if ftype == "quality":
                quality_count += 1
            if ftype == "risk":
                risk_count += 1
            if ftype == "dependency" or rule_id == "OSV":
                dependency_issue_count += 1
            if rule_id == "CYCLO_COMPLEXITY":
                complexity_finding_count += 1
            if "secret" in str(finding.get("title") or "").lower() or rule_id in {
                "PRIVATE_KEY",
                "PRIVATE_KEY_BLOCK",
                "AWS_ACCESS_KEY_ID",
                "GENERIC_API_KEY",
                "PASSWORD_ASSIGN",
                "HARDCODED_PASSWORD",
                "HARDCODED_TOKEN",
            }:
                secret_count += 1

        hotspot_score = int(hotspot_map.get(rel_path, 0) or 0)

        lower_name = file_path.name.lower()
        lower_rel = rel_path.lower()

        results.append(
            {
                "filePath": rel_path,
                "language": language,
                "extension": file_path.suffix.lower(),
                "loc": loc,
                "totalLines": total_lines,
                "blankLines": blank_lines,
                "commentLines": comment_lines,
                "sizeBytes": int(file_path.stat().st_size),
                "findingCount": len(file_findings),
                "severityCounts": severity_counts,
                "secretCount": secret_count,
                "dependencyIssueCount": dependency_issue_count,
                "riskCount": risk_count,
                "complexityFindingCount": complexity_finding_count,
                "qualityCount": quality_count,
                "securityCount": security_count,
                "hotspotScore": hotspot_score,
                "hotspotLevel": _infer_hotspot_level(hotspot_score),
                "isDependencyFile": lower_name in {"requirements.txt", "package.json"},
                "isConfigFile": file_path.suffix.lower() in {
                    ".json",
                    ".yml",
                    ".yaml",
                    ".toml",
                    ".ini",
                    ".cfg",
                    ".env",
                },
                "isTestFile": (
                    "/test" in lower_rel
                    or "/tests" in lower_rel
                    or lower_name.startswith("test_")
                    or lower_name.endswith(".spec.ts")
                    or lower_name.endswith(".spec.tsx")
                    or lower_name.endswith(".test.ts")
                    or lower_name.endswith(".test.tsx")
                    or lower_name.endswith(".spec.js")
                    or lower_name.endswith(".test.js")
                    or lower_name.endswith("_test.py")
                ),
                "changedInPr": include_set is not None and rel_path in include_set,
            }
        )

    results.sort(
        key=lambda item: (
            -int(item["findingCount"]),
            -int(item["hotspotScore"]),
            -int(item["loc"]),
            item["filePath"],
        )
    )

    return results


def summarize_file_features(file_features: list[dict], limit: int = 10) -> dict:
    top_risky = sorted(
        file_features,
        key=lambda item: (
            -(
                int(item.get("severityCounts", {}).get("critical", 0)) * 10
                + int(item.get("severityCounts", {}).get("high", 0)) * 5
                + int(item.get("severityCounts", {}).get("medium", 0)) * 2
                + int(item.get("severityCounts", {}).get("low", 0))
                + int(item.get("hotspotScore", 0)) // 10
            ),
            item.get("filePath", ""),
        ),
    )[:limit]

    by_language: dict[str, int] = {}
    files_with_findings = 0
    hotspot_files = 0

    for item in file_features:
        language = str(item.get("language") or "Other")
        by_language[language] = by_language.get(language, 0) + 1

        if int(item.get("findingCount", 0)) > 0:
            files_with_findings += 1

        if int(item.get("hotspotScore", 0)) >= 50:
            hotspot_files += 1

    return {
        "totalFilesProfiled": len(file_features),
        "filesWithFindings": files_with_findings,
        "hotspotFiles": hotspot_files,
        "filesByLanguage": [
            {"name": name, "count": count}
            for name, count in sorted(by_language.items(), key=lambda x: (-x[1], x[0]))
        ],
        "topRiskyFiles": [
            {
                "filePath": item["filePath"],
                "language": item["language"],
                "loc": item["loc"],
                "findingCount": item["findingCount"],
                "hotspotScore": item["hotspotScore"],
                "severityCounts": item["severityCounts"],
            }
            for item in top_risky
        ],
    }