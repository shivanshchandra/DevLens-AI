from __future__ import annotations

from pathlib import Path
from typing import Dict

from app.services.analysis.analysis_constants import (
    DEFAULT_EXCLUDE_DIRS,
    EXT_TO_LANG,
    TEXT_EXT_ALLOWLIST,
)
from app.services.analysis.secret_scanner import scan_for_secrets
from app.services.analysis.dependency_scanner import scan_dependencies
from app.services.analysis.scoring import compute_scores
from app.services.analysis.complexity_analyzer import analyze_complexity
from app.services.analysis.risk_engine import run_risk_engine
from app.services.analysis.fix_suggestions import build_fix_suggestions
from app.services.analysis.refactor_priority import build_refactor_priority
from app.services.analysis.file_feature_extractor import (
    build_file_features,
    summarize_file_features,
)
from app.services.analysis.architecture_detector import detect_architecture_signals
from app.services.analysis.result_builder import build_result_payload


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
    file_locs: Dict[str, int] = {}

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

        rel_path = str(p.relative_to(root)).replace("\\", "/")
        file_locs[rel_path] = loc

    languages = []
    if total_loc > 0:
        for name, loc in sorted(loc_by_lang.items(), key=lambda x: x[1], reverse=True):
            pct = round((loc / total_loc) * 100)
            languages.append({"name": name, "percent": pct})

        pct_sum = sum(x["percent"] for x in languages)
        if pct_sum > 100 and languages:
            languages[0]["percent"] -= (pct_sum - 100)

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

    file_features = build_file_features(
        root_dir=root,
        findings=findings,
        complexity_hotspots=complexity_hotspots,
        include_paths=None,
        exclude_dirs=exclude_dirs,
        max_files=max_files,
    )
    file_feature_summary = summarize_file_features(file_features)

    fix_suggestions = build_fix_suggestions(findings)
    top_files_to_fix = build_refactor_priority(
        findings=findings,
        complexity_hotspots=complexity_hotspots,
        file_locs=file_locs,
    )

    architecture = detect_architecture_signals(
        root_dir=str(root),
        file_locs=file_locs,
        findings=findings,
        complexity_hotspots=complexity_hotspots,
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

    metrics = {
        "files": files_scanned,
        "loc": total_loc,
        "languages": languages,
    }

    meta = {
        "rootAnalyzed": str(root),
        "analysisScope": "repository",
    }

    return build_result_payload(
        scan_type="github_or_zip",
        scores=scores,
        metrics=metrics,
        findings=findings,
        secret_findings=secret_findings,
        dependency_findings=dependency_findings,
        complexity_findings=complexity_findings,
        complexity_hotspots=complexity_hotspots,
        risk_findings=risk_findings,
        risk_summary=risk_summary,
        fix_suggestions=fix_suggestions,
        top_files_to_fix=top_files_to_fix,
        file_features=file_features,
        file_feature_summary=file_feature_summary,
        architecture=architecture,
        meta=meta,
    )