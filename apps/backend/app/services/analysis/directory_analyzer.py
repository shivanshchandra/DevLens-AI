from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime

from app.services.analysis.secret_scanner import scan_for_secrets
from app.services.analysis.dependency_scanner import scan_dependencies
from app.services.analysis.scoring import compute_scores
from app.services.analysis.complexity_analyzer import analyze_complexity
from app.services.analysis.risk_engine import run_risk_engine


DEFAULT_EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    ".next",
    "dist",
    "build",
    "__pycache__",
    ".venv",
    "venv",
    ".mypy_cache",
    ".pytest_cache",
    ".turbo",
}


EXT_TO_LANG = {
    ".py": "Python",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".md": "Markdown",
    ".json": "JSON",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".html": "HTML",
    ".css": "CSS",
    ".go": "Go",
    ".java": "Java",
    ".rs": "Rust",
    ".cpp": "C++",
    ".c": "C",
    ".sh": "Shell",
}


TEXT_EXT_ALLOWLIST = set(EXT_TO_LANG.keys()) | {
    ".txt",
    ".toml",
    ".ini",
    ".env",
    ".example",
    ".cfg",
}


def _is_excluded(path: Path, exclude_dirs: set[str]) -> bool:
    parts = set(path.parts)
    return any(d in parts for d in exclude_dirs)


def _safe_read_lines(file_path: Path, max_bytes: int = 2_000_000) -> int:
    try:
        size = file_path.stat().st_size
        if size > max_bytes:
            return 0

        with file_path.open("r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)

    except Exception:
        return 0


def _risk_severity_counts(risk_findings: list[dict]) -> dict[str, int]:
    counts = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
    }

    for item in risk_findings:
        severity = str(item.get("severity") or "").lower()
        if severity in counts:
            counts[severity] += 1

    return counts


def analyze_directory(
    root_dir: str | Path,
    exclude_dirs: set[str] | None = None,
    max_files: int = 30_000,
) -> dict:

    root = Path(root_dir).resolve()
    exclude_dirs = exclude_dirs or set(DEFAULT_EXCLUDE_DIRS)

    files_scanned = 0
    total_loc = 0
    loc_by_lang: Dict[str, int] = {}

    for p in root.rglob("*"):

        if files_scanned >= max_files:
            break

        if p.is_dir():
            continue

        if _is_excluded(p, exclude_dirs):
            continue

        ext = p.suffix.lower()

        if ext not in TEXT_EXT_ALLOWLIST:
            continue

        loc = _safe_read_lines(p)
        if loc <= 0:
            continue

        files_scanned += 1
        total_loc += loc

        lang = EXT_TO_LANG.get(ext, "Other")
        loc_by_lang[lang] = loc_by_lang.get(lang, 0) + loc

    languages = []

    if total_loc > 0:
        for name, loc in sorted(loc_by_lang.items(), key=lambda x: x[1], reverse=True):
            pct = round((loc / total_loc) * 100)
            languages.append({"name": name, "percent": pct})

        s = sum(x["percent"] for x in languages)

        if s > 100 and languages:
            languages[0]["percent"] -= (s - 100)

    secret_findings = scan_for_secrets(root)
    dependency_findings = scan_dependencies(root)
    complexity_findings, complexity_hotspots = analyze_complexity(root)

    risk_result = run_risk_engine(root)
    risk_findings = risk_result.get("risk_findings", [])
    risk_summary = risk_result.get("risk_summary", {})

    findings = (
        secret_findings
        + dependency_findings
        + complexity_findings
        + risk_findings
    )

    risk_counts = _risk_severity_counts(risk_findings)

    scores = compute_scores(
        files=files_scanned,
        loc=total_loc,
        secret_count=len(secret_findings),
        vuln_count=len(dependency_findings),
        risk_count=len(risk_findings),
        critical_risk_count=risk_counts["critical"],
        high_risk_count=risk_counts["high"],
        medium_risk_count=risk_counts["medium"],
    )

    result = {
        "healthScore": scores["healthScore"],
        "grade": scores["grade"],
        "subScores": scores["subScores"],
        "metrics": {
            "files": files_scanned,
            "loc": total_loc,
            "languages": languages,
            "complexityHotspots": complexity_hotspots,
        },
        "secret_findings": secret_findings,
        "dependency_findings": dependency_findings,
        "risk_findings": risk_findings,
        "risk_summary": risk_summary,
        "findings": findings,
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "meta": {
            "schemaVersion": "v1",
            "rootAnalyzed": str(root),
        },
    }

    return result