from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple
import re

from app.services.analysis.directory_analyzer import EXT_TO_LANG, TEXT_EXT_ALLOWLIST, _safe_read_lines
from app.services.analysis.secret_scanner import SECRET_RULES
from app.services.analysis.dependency_scanner import scan_dependencies
from app.services.analysis.scoring import compute_scores


DEPENDENCY_FILE_NAMES = {"requirements.txt", "package.json"}


def _scan_changed_files_for_secrets(root: Path, changed_files: list[str], max_bytes: int = 1_000_000) -> list[dict]:
    findings: list[dict] = []
    fid = 1

    for rel_path in changed_files:
        file_path = (root / rel_path).resolve()
        if not file_path.exists() or not file_path.is_file():
            continue

        try:
            if file_path.stat().st_size > max_bytes:
                continue
            content = file_path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        for title, rule_id, rx in SECRET_RULES:
            if rx.search(content):
                severity = "critical" if rule_id in ("PRIVATE_KEY", "AWS_ACCESS_KEY_ID") else "high"
                findings.append(
                    {
                        "id": f"PS-{fid}",
                        "type": "security",
                        "severity": severity,
                        "title": f"Potential secret detected: {title}",
                        "filePath": rel_path,
                        "message": "Pattern match suggests a secret may be hardcoded in this PR change.",
                        "ruleId": rule_id,
                    }
                )
                fid += 1
                break

    return findings


def analyze_pull_request(root_dir: str | Path, pr_context: dict) -> dict:
    """
    Analyze only files changed in a pull request.
    Returns frontend-compatible result JSON.
    """
    root = Path(root_dir).resolve()
    pr_files = pr_context.get("files") or []

    changed_file_paths: list[str] = []
    total_changed_files = len(pr_files)
    skipped_removed_files = 0
    skipped_non_text_files = 0
    skipped_missing_files = 0

    for item in pr_files:
        rel = (item.get("filename") or "").replace("\\", "/").strip()
        status = (item.get("status") or "").lower()

        if not rel:
            continue

        # Removed files do not exist in checked-out PR head
        if status == "removed":
            skipped_removed_files += 1
            continue

        file_path = (root / rel).resolve()
        if not file_path.exists() or not file_path.is_file():
            skipped_missing_files += 1
            continue

        ext = file_path.suffix.lower()
        if ext and ext not in TEXT_EXT_ALLOWLIST:
            skipped_non_text_files += 1
            continue

        changed_file_paths.append(rel)

    files_scanned = 0
    total_loc = 0
    loc_by_lang: Dict[str, int] = {}
    file_locs: List[Tuple[str, int]] = []

    for rel_path in changed_file_paths:
        file_path = (root / rel_path).resolve()
        loc = _safe_read_lines(file_path)
        if loc <= 0:
            continue

        files_scanned += 1
        total_loc += loc

        lang = EXT_TO_LANG.get(file_path.suffix.lower(), "Other")
        loc_by_lang[lang] = loc_by_lang.get(lang, 0) + loc
        file_locs.append((rel_path, loc))

    languages = []
    if total_loc > 0:
        for name, loc in sorted(loc_by_lang.items(), key=lambda x: x[1], reverse=True):
            pct = round((loc / total_loc) * 100)
            languages.append({"name": name, "percent": pct})

        s = sum(x["percent"] for x in languages)
        if s > 100 and languages:
            languages[0]["percent"] -= (s - 100)

    hotspots = [
        {"filePath": fp, "score": min(100, int(loc / max(1, total_loc) * 5000))}
        for fp, loc in sorted(file_locs, key=lambda x: x[1], reverse=True)[:5]
    ]

    secret_findings = _scan_changed_files_for_secrets(root, changed_file_paths)

    changed_dependency_files = {
        Path(p).name for p in changed_file_paths if Path(p).name in DEPENDENCY_FILE_NAMES
    }
    dependency_findings = scan_dependencies(root) if changed_dependency_files else []

    scores = compute_scores(
        files=files_scanned,
        loc=total_loc,
        secret_count=len(secret_findings),
        vuln_count=len(dependency_findings),
    )

    total_additions = sum(int(item.get("additions", 0) or 0) for item in pr_files)
    total_deletions = sum(int(item.get("deletions", 0) or 0) for item in pr_files)
    total_changes = sum(int(item.get("changes", 0) or 0) for item in pr_files)

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
        "findings": secret_findings + dependency_findings,
        "secret_findings": secret_findings,
        "dependency_findings": dependency_findings,
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "meta": {
            "schemaVersion": "v1",
            "analysisScope": "pull_request_changed_files",
            "rootAnalyzed": str(root),
            "pr_number": pr_context.get("number"),
            "pr_title": pr_context.get("title"),
            "pr_state": pr_context.get("state"),
            "pr_url": pr_context.get("html_url"),
            "base_ref": pr_context.get("base_ref"),
            "head_ref": pr_context.get("head_ref"),
            "base_sha": pr_context.get("base_sha"),
            "head_sha": pr_context.get("head_sha"),
            "changed_files_total": total_changed_files,
            "changed_files_analyzed": files_scanned,
            "changed_files_selected": len(changed_file_paths),
            "diff_stats": {
                "additions": total_additions,
                "deletions": total_deletions,
                "changes": total_changes,
            },
            "skipped": {
                "removed_files": skipped_removed_files,
                "non_text_files": skipped_non_text_files,
                "missing_files": skipped_missing_files,
            },
        },
    }

    return result