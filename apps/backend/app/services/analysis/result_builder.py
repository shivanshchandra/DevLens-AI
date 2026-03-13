from __future__ import annotations

from datetime import datetime
from typing import Any


def _utc_now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def build_result_payload(
    *,
    scan_type: str,
    scores: dict,
    metrics: dict,
    findings: list[dict],
    secret_findings: list[dict],
    dependency_findings: list[dict],
    complexity_findings: list[dict],
    complexity_hotspots: list[dict],
    risk_findings: list[dict],
    risk_summary: dict,
    fix_suggestions: list[dict],
    top_files_to_fix: list[dict],
    file_features: list[dict],
    file_feature_summary: dict,
    meta: dict | None = None,
    pr_summary: dict | None = None,
    ml: dict | None = None,
    generated_at: str | None = None,
) -> dict[str, Any]:
    """
    Stable result contract builder.

    Important:
    - Keeps legacy keys for backward compatibility
    - Adds normalized sections for future ML/AI/frontend work
    """
    generated_at = generated_at or _utc_now_iso()
    meta = dict(meta or {})
    meta["schemaVersion"] = "v3"

    overview = {
        "scanType": scan_type,
        "healthScore": scores.get("healthScore"),
        "grade": scores.get("grade"),
        "generatedAt": generated_at,
    }

    summaries: dict[str, Any] = {
        "risk": risk_summary or {
            "total": 0,
            "bySeverity": {"critical": 0, "high": 0, "medium": 0, "low": 0},
            "byRule": [],
            "topRiskyFiles": [],
        },
        "fileFeatures": file_feature_summary or {
            "totalFilesProfiled": 0,
            "filesWithFindings": 0,
            "hotspotFiles": 0,
            "filesByLanguage": [],
            "topRiskyFiles": [],
        },
    }

    if pr_summary is not None:
        summaries["pr"] = pr_summary

    if ml is not None:
        summaries["ml"] = {
            "predictedRiskLevel": ml.get("summary", {}).get("predictedRiskLevel"),
            "predictedRiskScore": ml.get("summary", {}).get("predictedRiskScore"),
            "predictedDebtLevel": ml.get("summary", {}).get("predictedDebtLevel"),
            "predictedDebtScore": ml.get("summary", {}).get("predictedDebtScore"),
            "version": ml.get("version"),
        }

    finding_groups = {
        "all": findings,
        "secrets": secret_findings,
        "dependencies": dependency_findings,
        "complexity": complexity_findings,
        "risk": risk_findings,
    }

    recommendations = {
        "fixSuggestions": fix_suggestions,
        "topFilesToFix": top_files_to_fix,
    }

    result = {
        # legacy keys kept for compatibility
        "healthScore": scores.get("healthScore"),
        "grade": scores.get("grade"),
        "subScores": scores.get("subScores", {}),
        "metrics": {
            **metrics,
            "complexityHotspots": complexity_hotspots,
        },
        "findings": findings,
        "secret_findings": secret_findings,
        "dependency_findings": dependency_findings,
        "risk_findings": risk_findings,
        "risk_summary": risk_summary,
        "fix_suggestions": fix_suggestions,
        "top_files_to_fix": top_files_to_fix,
        "file_features": file_features,
        "file_feature_summary": file_feature_summary,
        "generatedAt": generated_at,
        "meta": meta,

        # new normalized contract
        "overview": overview,
        "summaries": summaries,
        "finding_groups": finding_groups,
        "recommendations": recommendations,
    }

    if pr_summary is not None:
        result["pr_summary"] = pr_summary

    if ml is not None:
        result["ml"] = ml

    return result