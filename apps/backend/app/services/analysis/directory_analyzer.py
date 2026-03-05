# apps/backend/app/services/analysis/directory_analyzer.py

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime
from app.services.analysis.secret_scanner import scan_for_secrets
from app.services.analysis.dependency_scanner import scan_dependencies
from app.services.analysis.scoring import compute_scores

# Folders we do NOT want to scan
DEFAULT_EXCLUDE_DIRS = {
    ".git", "node_modules", ".next", "dist", "build", "__pycache__",
    ".venv", "venv", ".mypy_cache", ".pytest_cache", ".turbo",
}


# Basic language mapping (you can expand later)
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
    ".txt", ".toml", ".ini", ".env", ".example", ".cfg"
}


def _is_excluded(path: Path, exclude_dirs: set[str]) -> bool:
    parts = set(path.parts)
    return any(d in parts for d in exclude_dirs)


def _safe_read_lines(file_path: Path, max_bytes: int = 2_000_000) -> int:
    """
    Returns line count for a text file safely.
    - skips huge files
    - ignores decode errors
    """
    try:
        size = file_path.stat().st_size
        if size > max_bytes:
            return 0
        with file_path.open("r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0


def analyze_directory(
    root_dir: str | Path,
    exclude_dirs: set[str] | None = None,
    max_files: int = 30_000,
) -> dict:
    """
    Phase-1 real analysis: file discovery + LOC + language distribution + hotspot files.
    Returns results JSON compatible with your frontend expectations (close to mock shape).
    """
    root = Path(root_dir).resolve()
    exclude_dirs = exclude_dirs or set(DEFAULT_EXCLUDE_DIRS)

    files_scanned = 0
    total_loc = 0
    loc_by_lang: Dict[str, int] = {}
    file_locs: List[Tuple[str, int]] = []

    for p in root.rglob("*"):
        if files_scanned >= max_files:
            break

        if p.is_dir():
            continue

        if _is_excluded(p, exclude_dirs):
            continue

        ext = p.suffix.lower()

        # only count text-ish files for now
        if ext not in TEXT_EXT_ALLOWLIST:
            continue

        loc = _safe_read_lines(p)
        if loc <= 0:
            continue

        files_scanned += 1
        total_loc += loc

        lang = EXT_TO_LANG.get(ext, "Other")
        loc_by_lang[lang] = loc_by_lang.get(lang, 0) + loc

        rel_path = str(p.relative_to(root))
        file_locs.append((rel_path, loc))

    # Convert loc_by_lang -> percent list
    languages = []
    if total_loc > 0:
        for name, loc in sorted(loc_by_lang.items(), key=lambda x: x[1], reverse=True):
            pct = round((loc / total_loc) * 100)
            languages.append({"name": name, "percent": pct})

        # normalize rounding so percentages don't exceed 100
        s = sum(x["percent"] for x in languages)
        if s > 100 and languages:
            languages[0]["percent"] -= (s - 100)

    # Hotspots = top 5 largest LOC files (temporary heuristic)
    hotspots = [
        {"filePath": fp, "score": min(100, int(loc / max(1, total_loc) * 5000))}
        for fp, loc in sorted(file_locs, key=lambda x: x[1], reverse=True)[:5]
    ]

    # Very simple placeholder scoring (replace later)
    # Health decreases if huge LOC or many files
    health = 100
    if total_loc > 50_000:
        health -= 10
    if files_scanned > 2_000:
        health -= 10
    health = max(0, min(100, health))

    grade = "A" if health >= 90 else "B" if health >= 80 else "C" if health >= 70 else "D"

    secret_findings = scan_for_secrets(root)
    dependency_findings = scan_dependencies(root)

    secret_count = len(secret_findings)
    vuln_count = len(dependency_findings)

    scores = compute_scores(files_scanned, total_loc, secret_count, vuln_count)

    result = {
        "healthScore": scores["healthScore"],
        "grade": scores["grade"],
        "subScores": scores["subScores"],
        "metrics": {
            "files": files_scanned,
            "loc": total_loc,
            "languages": languages,
            "complexityHotspots": hotspots,
        },
        "secret_findings": secret_findings,
        "dependency_findings": dependency_findings,
        "findings": secret_findings + dependency_findings,  
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "meta": {
            "schemaVersion": "v1",
            "rootAnalyzed": str(root),
        }
    }

    return result