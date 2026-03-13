from __future__ import annotations

from typing import Any


def _safe_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def _safe_dict(value: Any) -> dict:
    return value if isinstance(value, dict) else {}


def _top_contributing_files(result: dict[str, Any], limit: int = 5) -> list[dict[str, Any]]:
    file_features = _safe_list(result.get("file_features"))
    top_files_to_fix = _safe_list(result.get("top_files_to_fix"))

    # Prefer refactor-priority output if available
    prioritized: list[dict[str, Any]] = []
    for item in top_files_to_fix[:limit]:
        if not isinstance(item, dict):
            continue
        prioritized.append(
            {
                "filePath": item.get("filePath"),
                "priorityScore": item.get("priorityScore"),
                "estimatedEffort": item.get("estimatedEffort"),
                "recommendedAction": item.get("recommendedAction"),
                "reasons": item.get("reasons", []),
            }
        )

    if prioritized:
        return prioritized

    # Fallback: derive from file_features
    ranked = sorted(
        file_features,
        key=lambda item: (
            -int(item.get("findingCount", 0) or 0),
            -int(item.get("hotspotScore", 0) or 0),
            -int(item.get("loc", 0) or 0),
            str(item.get("filePath") or ""),
        ),
    )

    derived: list[dict[str, Any]] = []
    for item in ranked[:limit]:
        derived.append(
            {
                "filePath": item.get("filePath"),
                "priorityScore": (
                    int(item.get("findingCount", 0) or 0) * 10
                    + int(item.get("hotspotScore", 0) or 0)
                ),
                "estimatedEffort": (
                    "high"
                    if int(item.get("loc", 0) or 0) >= 800
                    else "medium"
                    if int(item.get("loc", 0) or 0) >= 300
                    else "low"
                ),
                "recommendedAction": "Review this file first because it combines findings, size, or hotspot pressure.",
                "reasons": [
                    f"finding count: {int(item.get('findingCount', 0) or 0)}",
                    f"hotspot score: {int(item.get('hotspotScore', 0) or 0)}",
                    f"loc: {int(item.get('loc', 0) or 0)}",
                ],
            }
        )

    return derived


def _build_risk_explanation(
    result: dict[str, Any],
    feature_vector: dict[str, Any],
    risk_prediction: dict[str, Any],
) -> dict[str, Any]:
    risk_summary = _safe_dict(result.get("risk_summary"))
    by_severity = _safe_dict(risk_summary.get("bySeverity"))

    risk_score = risk_prediction.get("score")
    risk_level = risk_prediction.get("level")
    drivers = _safe_list(risk_prediction.get("drivers"))

    risk_findings = int(feature_vector.get("risk_findings_count", 0) or 0)
    high_findings = int(feature_vector.get("high_findings_count", 0) or 0)
    critical_findings = int(feature_vector.get("critical_findings_count", 0) or 0)
    risky_files_ratio = float(feature_vector.get("risky_files_ratio", 0.0) or 0.0)
    concentration = float(feature_vector.get("top_5_finding_concentration", 0.0) or 0.0)
    security_score = int(feature_vector.get("security_score", 0) or 0)

    reasons: list[str] = []
    if critical_findings > 0:
        reasons.append(f"{critical_findings} critical findings increase repository risk immediately.")
    if high_findings > 0:
        reasons.append(f"{high_findings} high-severity findings create meaningful operational risk.")
    if risk_findings > 0:
        reasons.append(f"{risk_findings} explicit risk-pattern findings were detected.")
    if risky_files_ratio >= 0.10:
        reasons.append("Risk is spread across multiple files instead of being isolated.")
    elif risky_files_ratio > 0:
        reasons.append("Risk is present but remains limited to a small portion of files.")
    if concentration >= 0.50:
        reasons.append("A large share of findings is concentrated in a small set of files.")
    if security_score < 70:
        reasons.append("The security sub-score is weak, which increases risk pressure.")

    if not reasons:
        reasons.append("No strong risk drivers were detected in the current scan.")

    narrative = (
        f"Predicted repository risk is {risk_level} ({risk_score}). "
        f"This prediction is based on detected risky patterns, severity distribution, "
        f"and how concentrated the findings are across files."
    )

    return {
        "title": "Risk explanation",
        "narrative": narrative,
        "reasons": reasons[:5],
        "drivers": drivers[:5],
        "stats": {
            "riskFindings": risk_findings,
            "criticalFindings": critical_findings,
            "highFindings": high_findings,
            "riskyFilesRatio": risky_files_ratio,
            "topFindingConcentration": concentration,
            "securityScore": security_score,
            "riskSummaryBySeverity": by_severity,
        },
    }


def _build_debt_explanation(
    result: dict[str, Any],
    feature_vector: dict[str, Any],
    debt_prediction: dict[str, Any],
) -> dict[str, Any]:
    debt_score = debt_prediction.get("score")
    debt_level = debt_prediction.get("level")
    drivers = _safe_list(debt_prediction.get("drivers"))

    hotspot_files = int(feature_vector.get("hotspot_files", 0) or 0)
    avg_hotspot = float(feature_vector.get("avg_hotspot_score", 0.0) or 0.0)
    max_hotspot = int(feature_vector.get("max_hotspot_score", 0) or 0)
    avg_findings_per_file = float(feature_vector.get("avg_findings_per_file", 0.0) or 0.0)
    maintainability_score = int(feature_vector.get("maintainability_score", 0) or 0)
    max_loc_in_file = int(feature_vector.get("max_loc_in_file", 0) or 0)
    top_files_to_fix_count = int(feature_vector.get("top_files_to_fix_count", 0) or 0)

    reasons: list[str] = []
    if hotspot_files > 0:
        reasons.append(f"{hotspot_files} hotspot files suggest concentrated complexity pressure.")
    if avg_hotspot >= 20:
        reasons.append("Average hotspot score indicates ongoing maintainability pressure.")
    if max_hotspot >= 80:
        reasons.append("At least one file has a very high hotspot score.")
    if avg_findings_per_file >= 0.25:
        reasons.append("Findings are recurring often enough to suggest technical debt buildup.")
    if maintainability_score < 75:
        reasons.append("Maintainability score is below the healthy range.")
    if max_loc_in_file >= 1000:
        reasons.append("A very large file increases change difficulty and refactor cost.")
    if top_files_to_fix_count >= 5:
        reasons.append("Several files already qualify for prioritized cleanup.")

    if not reasons:
        reasons.append("No strong technical debt drivers were detected in the current scan.")

    narrative = (
        f"Predicted technical debt is {debt_level} ({debt_score}). "
        f"This is influenced by hotspot pressure, maintainability score, "
        f"large-file concentration, and recurring findings."
    )

    return {
        "title": "Technical debt explanation",
        "narrative": narrative,
        "reasons": reasons[:5],
        "drivers": drivers[:5],
        "stats": {
            "hotspotFiles": hotspot_files,
            "avgHotspotScore": avg_hotspot,
            "maxHotspotScore": max_hotspot,
            "avgFindingsPerFile": avg_findings_per_file,
            "maintainabilityScore": maintainability_score,
            "maxLocInFile": max_loc_in_file,
            "topFilesToFixCount": top_files_to_fix_count,
        },
    }


def _build_next_actions(
    result: dict[str, Any],
    feature_vector: dict[str, Any],
    risk_prediction: dict[str, Any],
    debt_prediction: dict[str, Any],
) -> list[str]:
    actions: list[str] = []

    risk_level = str(risk_prediction.get("level") or "").lower()
    debt_level = str(debt_prediction.get("level") or "").lower()
    risk_findings = int(feature_vector.get("risk_findings_count", 0) or 0)
    hotspot_files = int(feature_vector.get("hotspot_files", 0) or 0)
    top_files = _safe_list(result.get("top_files_to_fix"))

    if risk_findings > 0:
        actions.append("Review and remove unsafe execution patterns such as eval/exec first.")
    if risk_level in {"high", "critical"}:
        actions.append("Prioritize security-sensitive files before broad refactoring.")
    if hotspot_files > 0:
        actions.append("Refactor the top hotspot files into smaller and simpler units.")
    if debt_level in {"medium", "high", "critical"}:
        actions.append("Reduce complexity in the highest-priority files and add focused tests.")
    if top_files:
        actions.append("Start with the top files to fix list because it already combines severity, size, and complexity.")

    if not actions:
        actions.append("No urgent remediation actions were inferred from the current scan.")

    # remove duplicates while preserving order
    deduped: list[str] = []
    seen: set[str] = set()
    for action in actions:
        if action not in seen:
            deduped.append(action)
            seen.add(action)

    return deduped[:5]


def build_ml_explanations(
    result: dict[str, Any],
    feature_vector: dict[str, Any],
    risk_prediction: dict[str, Any],
    debt_prediction: dict[str, Any],
) -> dict[str, Any]:
    return {
        "risk": _build_risk_explanation(result, feature_vector, risk_prediction),
        "technicalDebt": _build_debt_explanation(result, feature_vector, debt_prediction),
        "topContributingFiles": _top_contributing_files(result, limit=5),
        "nextActions": _build_next_actions(result, feature_vector, risk_prediction, debt_prediction),
    }
