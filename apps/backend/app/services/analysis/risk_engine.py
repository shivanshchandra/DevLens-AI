from __future__ import annotations

from pathlib import Path
from typing import Iterable

from app.services.analysis.risk_patterns import scan_risk_patterns


SEVERITY_ORDER = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
}


def _count_by_severity(findings: list[dict]) -> dict:
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


def _count_by_rule(findings: list[dict]) -> list[dict]:
    counter: dict[str, int] = {}

    for item in findings:
        rule_id = str(item.get("ruleId") or "UNKNOWN")
        counter[rule_id] = counter.get(rule_id, 0) + 1

    return [
        {"ruleId": rule_id, "count": count}
        for rule_id, count in sorted(counter.items(), key=lambda x: (-x[1], x[0]))
    ]


def _top_risky_files(findings: list[dict], limit: int = 5) -> list[dict]:
    file_scores: dict[str, int] = {}

    for item in findings:
        file_path = str(item.get("filePath") or "")
        if not file_path:
            continue

        severity = str(item.get("severity") or "").lower()
        score = SEVERITY_ORDER.get(severity, 1)
        file_scores[file_path] = file_scores.get(file_path, 0) + score

    ranked = sorted(file_scores.items(), key=lambda x: (-x[1], x[0]))[:limit]

    return [{"filePath": file_path, "score": score} for file_path, score in ranked]


def run_risk_engine(
    root_dir: str | Path,
    include_paths: Iterable[str] | None = None,
) -> dict:
    """
    DevLens Risk Engine v1

    Current detectors:
    - risky code patterns

    Returns:
    {
        "risk_findings": [...],
        "risk_summary": {...}
    }
    """
    root = Path(root_dir).resolve()

    risk_findings = scan_risk_patterns(root, include_paths=include_paths)

    risk_findings = sorted(
        risk_findings,
        key=lambda item: (
            -SEVERITY_ORDER.get(str(item.get("severity") or "").lower(), 1),
            str(item.get("filePath") or ""),
            int(item.get("line") or 0),
            str(item.get("ruleId") or ""),
        ),
    )

    risk_summary = {
        "total": len(risk_findings),
        "bySeverity": _count_by_severity(risk_findings),
        "byRule": _count_by_rule(risk_findings),
        "topRiskyFiles": _top_risky_files(risk_findings),
    }

    return {
        "risk_findings": risk_findings,
        "risk_summary": risk_summary,
    }