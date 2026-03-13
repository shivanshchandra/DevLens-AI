from __future__ import annotations

from typing import Any


SEVERITY_KEYS = ("critical", "high", "medium", "low")


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_dict(value: Any) -> dict:
    return value if isinstance(value, dict) else {}


def _safe_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def _clamp_ratio(numerator: float, denominator: float) -> float:
    if denominator <= 0:
        return 0.0
    value = numerator / denominator
    return round(max(0.0, min(1.0, value)), 4)


def _severity_totals_from_findings(findings: list[dict]) -> dict[str, int]:
    counts = {key: 0 for key in SEVERITY_KEYS}

    for item in findings:
        sev = str(item.get("severity") or "").lower()
        if sev in counts:
            counts[sev] += 1

    return counts


def _language_distribution(file_features: list[dict]) -> tuple[int, float, str]:
    if not file_features:
        return 0, 0.0, "Other"

    by_language: dict[str, int] = {}
    for item in file_features:
        language = str(item.get("language") or "Other")
        by_language[language] = by_language.get(language, 0) + 1

    language_count = len(by_language)
    dominant_language = max(by_language.items(), key=lambda x: x[1])[0]
    dominant_count = by_language[dominant_language]
    dominant_ratio = dominant_count / max(1, len(file_features))

    return language_count, dominant_ratio, dominant_language


def _mean(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def build_ml_feature_vector(result: dict[str, Any]) -> dict[str, Any]:
    """
    Converts the current result payload into ML-ready structured features.

    ML Foundation v1:
    - no training
    - no external model loading
    - only stable numeric feature preparation
    """
    metrics = _safe_dict(result.get("metrics"))
    file_features = _safe_list(result.get("file_features"))
    top_files_to_fix = _safe_list(result.get("top_files_to_fix"))
    fix_suggestions = _safe_list(result.get("fix_suggestions"))
    findings = _safe_list(result.get("findings"))
    risk_findings = _safe_list(result.get("risk_findings"))
    dependency_findings = _safe_list(result.get("dependency_findings"))
    secret_findings = _safe_list(result.get("secret_findings"))
    file_feature_summary = _safe_dict(result.get("file_feature_summary"))
    sub_scores = _safe_dict(result.get("subScores"))

    total_files = _safe_int(metrics.get("files"))
    total_loc = _safe_int(metrics.get("loc"))

    profiled_files = len(file_features)
    summary_profiled_files = _safe_int(file_feature_summary.get("totalFilesProfiled"))
    profiled_base = summary_profiled_files if summary_profiled_files > 0 else profiled_files
    profiled_base = max(1, profiled_base)

    total_findings = len(findings)
    total_risk_findings = len(risk_findings)
    total_dependency_findings = len(dependency_findings)
    total_secret_findings = len(secret_findings)

    severity_totals = _severity_totals_from_findings(findings)

    hotspot_scores = [_safe_int(item.get("hotspotScore")) for item in file_features]
    file_locs = [_safe_int(item.get("loc")) for item in file_features]
    finding_counts = [_safe_int(item.get("findingCount")) for item in file_features]
    secret_counts = [_safe_int(item.get("secretCount")) for item in file_features]
    risk_counts = [_safe_int(item.get("riskCount")) for item in file_features]
    dependency_counts = [_safe_int(item.get("dependencyIssueCount")) for item in file_features]
    complexity_counts = [_safe_int(item.get("complexityFindingCount")) for item in file_features]

    files_with_findings = min(
        _safe_int(file_feature_summary.get("filesWithFindings")),
        profiled_base,
    )
    hotspot_files = min(
        _safe_int(file_feature_summary.get("hotspotFiles")),
        profiled_base,
    )

    risky_files = sum(1 for item in file_features if _safe_int(item.get("riskCount")) > 0)
    files_with_secrets = sum(1 for item in file_features if _safe_int(item.get("secretCount")) > 0)
    files_with_dependencies = sum(
        1 for item in file_features if _safe_int(item.get("dependencyIssueCount")) > 0
    )
    files_with_complexity = sum(
        1 for item in file_features if _safe_int(item.get("complexityFindingCount")) > 0
    )
    config_files = sum(1 for item in file_features if bool(item.get("isConfigFile")))
    test_files = sum(1 for item in file_features if bool(item.get("isTestFile")))
    dependency_files = sum(1 for item in file_features if bool(item.get("isDependencyFile")))
    changed_in_pr_files = sum(1 for item in file_features if bool(item.get("changedInPr")))

    total_hotspot_score = sum(hotspot_scores)

    top_5_finding_concentration = (
        sum(sorted(finding_counts, reverse=True)[:5]) / max(1, total_findings)
        if total_findings > 0
        else 0.0
    )

    top_5_hotspot_concentration = (
        sum(sorted(hotspot_scores, reverse=True)[:5]) / max(1, total_hotspot_score)
        if total_hotspot_score > 0
        else 0.0
    )

    language_count, dominant_language_ratio, dominant_language = _language_distribution(file_features)

    vector = {
        # size / shape
        "total_files": total_files,
        "profiled_files": profiled_files,
        "total_loc": total_loc,
        "avg_loc_per_file": _mean([float(x) for x in file_locs]),
        "max_loc_in_file": max(file_locs) if file_locs else 0,
        "language_count": language_count,
        "dominant_language_ratio": round(dominant_language_ratio, 4),
        "dominant_language": dominant_language,

        # finding totals
        "total_findings": total_findings,
        "risk_findings_count": total_risk_findings,
        "dependency_findings_count": total_dependency_findings,
        "secret_findings_count": total_secret_findings,
        "critical_findings_count": severity_totals["critical"],
        "high_findings_count": severity_totals["high"],
        "medium_findings_count": severity_totals["medium"],
        "low_findings_count": severity_totals["low"],

        # file-level distribution
        "files_with_findings": files_with_findings,
        "files_with_findings_ratio": _clamp_ratio(files_with_findings, profiled_base),
        "risky_files": risky_files,
        "risky_files_ratio": _clamp_ratio(risky_files, profiled_base),
        "files_with_secrets": files_with_secrets,
        "files_with_secrets_ratio": _clamp_ratio(files_with_secrets, profiled_base),
        "files_with_dependency_issues": files_with_dependencies,
        "files_with_dependency_issues_ratio": _clamp_ratio(files_with_dependencies, profiled_base),
        "files_with_complexity_issues": files_with_complexity,
        "files_with_complexity_issues_ratio": _clamp_ratio(files_with_complexity, profiled_base),

        # hotspot / concentration
        "hotspot_files": hotspot_files,
        "hotspot_files_ratio": _clamp_ratio(hotspot_files, profiled_base),
        "avg_hotspot_score": round(_mean([float(x) for x in hotspot_scores]), 4),
        "max_hotspot_score": max(hotspot_scores) if hotspot_scores else 0,
        "top_5_finding_concentration": round(max(0.0, min(1.0, top_5_finding_concentration)), 4),
        "top_5_hotspot_concentration": round(max(0.0, min(1.0, top_5_hotspot_concentration)), 4),

        # issue density
        "avg_findings_per_file": round(total_findings / profiled_base, 4),
        "avg_risk_count_per_file": round(_mean([float(x) for x in risk_counts]), 4),
        "avg_secret_count_per_file": round(_mean([float(x) for x in secret_counts]), 4),
        "avg_dependency_count_per_file": round(_mean([float(x) for x in dependency_counts]), 4),
        "avg_complexity_count_per_file": round(_mean([float(x) for x in complexity_counts]), 4),

        # guidance / prioritization
        "top_files_to_fix_count": len(top_files_to_fix),
        "fix_suggestions_count": len(fix_suggestions),

        # file categories
        "config_file_ratio": _clamp_ratio(config_files, profiled_base),
        "test_file_ratio": _clamp_ratio(test_files, profiled_base),
        "dependency_file_ratio": _clamp_ratio(dependency_files, profiled_base),
        "changed_in_pr_ratio": _clamp_ratio(changed_in_pr_files, profiled_base),

        # current platform scoring
        "health_score": _safe_int(result.get("healthScore")),
        "quality_score": _safe_int(sub_scores.get("quality")),
        "security_score": _safe_int(sub_scores.get("security")),
        "maintainability_score": _safe_int(sub_scores.get("maintainability")),

        # metadata
        "feature_schema_version": "v1",
    }

    return vector

