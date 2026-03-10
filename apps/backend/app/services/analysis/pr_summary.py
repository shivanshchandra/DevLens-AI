from __future__ import annotations

from typing import Any


SEVERITY_ORDER = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
}


def _count_by_severity(findings: list[dict]) -> dict[str, int]:
    counts = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
    }

    for item in findings:
        severity = str(item.get("severity") or "").lower()
        if severity in counts:
            counts[severity] += 1

    return counts


def _top_risks(findings: list[dict], limit: int = 5) -> list[dict]:
    ranked = sorted(
        findings,
        key=lambda item: (
            -SEVERITY_ORDER.get(str(item.get("severity") or "").lower(), 1),
            str(item.get("filePath") or ""),
            str(item.get("title") or ""),
        ),
    )

    top_items = []
    for item in ranked[:limit]:
        top_items.append(
            {
                "severity": item.get("severity"),
                "title": item.get("title"),
                "filePath": item.get("filePath"),
                "ruleId": item.get("ruleId"),
                "message": item.get("message"),
            }
        )

    return top_items


def _classify_change_size(changed_files_total: int, additions: int, deletions: int, changes: int) -> str:
    if changed_files_total >= 20 or changes >= 800:
        return "large"
    if changed_files_total >= 8 or changes >= 250:
        return "medium"
    return "small"


def _build_overview(
    pr_title: str | None,
    changed_files_total: int,
    additions: int,
    deletions: int,
    severity_counts: dict[str, int],
) -> str:
    title_text = f"PR '{pr_title}'" if pr_title else "This pull request"

    risk_parts = []
    if severity_counts["critical"] > 0:
        risk_parts.append(f"{severity_counts['critical']} critical")
    if severity_counts["high"] > 0:
        risk_parts.append(f"{severity_counts['high']} high")
    if severity_counts["medium"] > 0:
        risk_parts.append(f"{severity_counts['medium']} medium")
    if severity_counts["low"] > 0:
        risk_parts.append(f"{severity_counts['low']} low")

    risk_text = ", ".join(risk_parts) if risk_parts else "no significant"
    return (
        f"{title_text} changes {changed_files_total} file(s) "
        f"with {additions} addition(s) and {deletions} deletion(s), "
        f"and currently shows {risk_text} risk finding(s)."
    )


def _build_review_recommendation(
    severity_counts: dict[str, int],
    changed_files_total: int,
    changes: int,
) -> str:
    if severity_counts["critical"] > 0:
        return (
            "Review required before merge. Critical-risk findings are present and should be resolved first."
        )

    if severity_counts["high"] > 0:
        return (
            "Careful review recommended. Focus on high-risk findings and verify input handling, command execution, and secrets."
        )

    if changed_files_total >= 20 or changes >= 800:
        return (
            "This is a large pull request. Review in smaller logical sections and prioritize files with the highest findings first."
        )

    if severity_counts["medium"] > 0:
        return (
            "Moderate review recommended. Check flagged files for maintainability and security concerns before merge."
        )

    return "No major risk signals detected. Proceed with normal code review and test verification."


def build_pr_summary(
    pr_context: dict[str, Any],
    findings: list[dict],
) -> dict:
    pr_files = pr_context.get("files") or []

    changed_files_total = len(pr_files)
    additions = sum(int(item.get("additions", 0) or 0) for item in pr_files)
    deletions = sum(int(item.get("deletions", 0) or 0) for item in pr_files)
    changes = sum(int(item.get("changes", 0) or 0) for item in pr_files)

    severity_counts = _count_by_severity(findings)
    top_risks = _top_risks(findings)
    size_label = _classify_change_size(changed_files_total, additions, deletions, changes)

    return {
        "overview": _build_overview(
            pr_title=pr_context.get("title"),
            changed_files_total=changed_files_total,
            additions=additions,
            deletions=deletions,
            severity_counts=severity_counts,
        ),
        "change_size": {
            "label": size_label,
            "changed_files_total": changed_files_total,
            "additions": additions,
            "deletions": deletions,
            "changes": changes,
        },
        "top_risks": top_risks,
        "review_recommendation": _build_review_recommendation(
            severity_counts=severity_counts,
            changed_files_total=changed_files_total,
            changes=changes,
        ),
    }