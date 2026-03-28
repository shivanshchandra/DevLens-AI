from __future__ import annotations

import hashlib
from typing import Any


SEVERITIES = ("critical", "high", "medium", "low")


def _as_number(value: Any, default: int | float = 0) -> int | float:
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return value
    try:
        if "." in str(value):
            return float(value)
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_dict(value: Any) -> dict:
    return value if isinstance(value, dict) else {}


def _safe_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def _severity_counts(findings: list[dict]) -> dict[str, int]:
    counts = {severity: 0 for severity in SEVERITIES}
    for finding in findings:
        severity = str(finding.get("severity") or "").lower()
        if severity in counts:
            counts[severity] += 1
    return counts


def _normalize_text(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _finding_fingerprint(finding: dict[str, Any]) -> str:
    parts = [
        _normalize_text(finding.get("severity")),
        _normalize_text(finding.get("type")),
        _normalize_text(finding.get("ruleId")),
        _normalize_text(finding.get("title")),
        _normalize_text(finding.get("filePath")),
        _normalize_text(finding.get("message")),
    ]
    raw = "|".join(parts)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def _indexed_findings(findings: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    indexed: dict[str, dict[str, Any]] = {}
    for finding in findings:
        fp = _finding_fingerprint(finding)
        indexed[fp] = {
            "fingerprint": fp,
            "id": finding.get("id"),
            "title": finding.get("title"),
            "ruleId": finding.get("ruleId"),
            "severity": finding.get("severity"),
            "filePath": finding.get("filePath"),
            "message": finding.get("message"),
            "type": finding.get("type"),
        }
    return indexed


def _get_arch_summary(result: dict[str, Any]) -> dict[str, Any]:
    architecture = _safe_dict(result.get("architecture"))
    return _safe_dict(architecture.get("summary"))


def _get_ml_summary(result: dict[str, Any]) -> dict[str, Any]:
    ml = _safe_dict(result.get("ml"))
    return _safe_dict(ml.get("summary"))


def _top_files_index(result: dict[str, Any]) -> dict[str, dict[str, Any]]:
    indexed: dict[str, dict[str, Any]] = {}
    for rank, item in enumerate(_safe_list(result.get("top_files_to_fix")), start=1):
        file_path = str(item.get("filePath") or "").strip()
        if not file_path:
            continue
        indexed[file_path] = {
            "rank": rank,
            "priorityScore": int(_as_number(item.get("priorityScore"), 0)),
        }
    return indexed


def _compare_top_files(base_result: dict[str, Any], target_result: dict[str, Any]) -> list[dict[str, Any]]:
    base_index = _top_files_index(base_result)
    target_index = _top_files_index(target_result)

    all_paths = sorted(set(base_index.keys()) | set(target_index.keys()))
    changes: list[dict[str, Any]] = []

    for file_path in all_paths:
        base_item = base_index.get(file_path)
        target_item = target_index.get(file_path)

        base_rank = base_item["rank"] if base_item else None
        target_rank = target_item["rank"] if target_item else None
        base_score = base_item["priorityScore"] if base_item else None
        target_score = target_item["priorityScore"] if target_item else None

        if base_rank is None and target_rank is not None:
            direction = "new"
        elif base_rank is not None and target_rank is None:
            direction = "resolved"
        elif base_rank is not None and target_rank is not None:
            if target_rank < base_rank:
                direction = "regressed"
            elif target_rank > base_rank:
                direction = "improved"
            else:
                direction = "unchanged"
        else:
            direction = "unchanged"

        if direction != "unchanged":
            changes.append(
                {
                    "filePath": file_path,
                    "baseRank": base_rank,
                    "targetRank": target_rank,
                    "direction": direction,
                    "basePriorityScore": base_score,
                    "targetPriorityScore": target_score,
                    "priorityScoreDelta": (
                        None if base_score is None or target_score is None else target_score - base_score
                    ),
                }
            )

    changes.sort(
        key=lambda item: (
            {"regressed": 0, "new": 1, "improved": 2, "resolved": 3}.get(item["direction"], 9),
            item["targetRank"] if item["targetRank"] is not None else 999,
            item["baseRank"] if item["baseRank"] is not None else 999,
            item["filePath"],
        )
    )

    return changes[:10]


def _build_summary(
    *,
    verdict: str,
    health_delta: int | float,
    critical_delta: int,
    high_delta: int,
    resolved_count: int,
    new_count: int,
    architecture_risk_delta: int,
) -> str:
    parts: list[str] = []

    if health_delta > 0:
        parts.append("health score improved")
    elif health_delta < 0:
        parts.append("health score declined")

    if critical_delta < 0:
        parts.append("critical findings decreased")
    elif critical_delta > 0:
        parts.append("new critical findings appeared")

    if high_delta < 0:
        parts.append("high-severity findings decreased")
    elif high_delta > 0:
        parts.append("high-severity findings increased")

    if architecture_risk_delta < 0:
        parts.append("architecture risk improved")
    elif architecture_risk_delta > 0:
        parts.append("architecture risk worsened")

    if resolved_count > 0:
        parts.append(f"{resolved_count} findings were resolved")

    if new_count > 0:
        parts.append(f"{new_count} new findings appeared")

    if not parts:
        if verdict == "unchanged":
            return "The target scan is broadly unchanged compared with the base scan."
        if verdict == "improved":
            return "The target scan shows a modest overall improvement over the base scan."
        return "The target scan shows a modest overall regression compared with the base scan."

    sentence = ", ".join(parts[:4])
    prefix = {
        "improved": "The target scan improved overall",
        "regressed": "The target scan regressed overall",
        "unchanged": "The target scan is mostly unchanged overall",
    }[verdict]
    return f"{prefix}: {sentence}."


def compare_scan_results(base_result: dict[str, Any], target_result: dict[str, Any]) -> dict[str, Any]:
    base_findings = _safe_list(base_result.get("findings"))
    target_findings = _safe_list(target_result.get("findings"))

    base_counts = _severity_counts(base_findings)
    target_counts = _severity_counts(target_findings)
    deltas = {severity: target_counts[severity] - base_counts[severity] for severity in SEVERITIES}

    base_health = _as_number(base_result.get("healthScore"), 0)
    target_health = _as_number(target_result.get("healthScore"), 0)
    health_delta = target_health - base_health

    base_grade = base_result.get("grade")
    target_grade = target_result.get("grade")

    base_indexed = _indexed_findings(base_findings)
    target_indexed = _indexed_findings(target_findings)

    new_finding_keys = sorted(set(target_indexed.keys()) - set(base_indexed.keys()))
    resolved_finding_keys = sorted(set(base_indexed.keys()) - set(target_indexed.keys()))

    new_findings = [target_indexed[key] for key in new_finding_keys][:20]
    resolved_findings = [base_indexed[key] for key in resolved_finding_keys][:20]

    base_arch = _get_arch_summary(base_result)
    target_arch = _get_arch_summary(target_result)

    base_arch_risk = int(_as_number(base_arch.get("architectureRiskScore"), 0))
    target_arch_risk = int(_as_number(target_arch.get("architectureRiskScore"), 0))
    arch_risk_delta = target_arch_risk - base_arch_risk

    base_ml = _get_ml_summary(base_result)
    target_ml = _get_ml_summary(target_result)

    base_ml_risk = _as_number(base_ml.get("predictedRiskScore"), 0)
    target_ml_risk = _as_number(target_ml.get("predictedRiskScore"), 0)
    base_ml_debt = _as_number(base_ml.get("predictedDebtScore"), 0)
    target_ml_debt = _as_number(target_ml.get("predictedDebtScore"), 0)

    ml_risk_delta = target_ml_risk - base_ml_risk
    ml_debt_delta = target_ml_debt - base_ml_debt

    verdict_score = 0

    if health_delta >= 5:
        verdict_score += 2
    elif health_delta <= -5:
        verdict_score -= 2

    verdict_score -= deltas["critical"] * 3
    verdict_score -= deltas["high"] * 2
    verdict_score -= max(0, arch_risk_delta // 8)
    verdict_score += max(0, (-arch_risk_delta) // 8)

    if ml_risk_delta <= -10:
        verdict_score += 1
    elif ml_risk_delta >= 10:
        verdict_score -= 1

    if ml_debt_delta <= -10:
        verdict_score += 1
    elif ml_debt_delta >= 10:
        verdict_score -= 1

    verdict_score += min(3, len(resolved_findings))
    verdict_score -= min(3, len(new_findings))

    if verdict_score >= 2:
        verdict = "improved"
    elif verdict_score <= -2:
        verdict = "regressed"
    else:
        verdict = "unchanged"

    return {
        "verdict": verdict,
        "summary": _build_summary(
            verdict=verdict,
            health_delta=health_delta,
            critical_delta=deltas["critical"],
            high_delta=deltas["high"],
            resolved_count=len(resolved_findings),
            new_count=len(new_findings),
            architecture_risk_delta=arch_risk_delta,
        ),
        "overview": {
            "baseHealthScore": base_health,
            "targetHealthScore": target_health,
            "healthScoreDelta": health_delta,
            "baseGrade": base_grade,
            "targetGrade": target_grade,
            "gradeChanged": base_grade != target_grade,
        },
        "findings": {
            "baseCounts": base_counts,
            "targetCounts": target_counts,
            "deltas": deltas,
            "newFindings": new_findings,
            "resolvedFindings": resolved_findings,
        },
        "refactor": {
            "topChangedFiles": _compare_top_files(base_result, target_result),
        },
        "architecture": {
            "baseRiskScore": base_arch_risk,
            "targetRiskScore": target_arch_risk,
            "riskDelta": arch_risk_delta,
            "possibleGodFilesDelta": int(_as_number(target_arch.get("possibleGodFiles"), 0))
            - int(_as_number(base_arch.get("possibleGodFiles"), 0)),
            "hotspotDirectoriesDelta": int(_as_number(target_arch.get("hotspotDirectories"), 0))
            - int(_as_number(base_arch.get("hotspotDirectories"), 0)),
            "architectureSmellsDelta": int(_as_number(target_arch.get("architectureSmells"), 0))
            - int(_as_number(base_arch.get("architectureSmells"), 0)),
            "couplingHotspotsDelta": int(_as_number(target_arch.get("couplingHotspots"), 0))
            - int(_as_number(base_arch.get("couplingHotspots"), 0)),
            "dependencyHubsDelta": int(_as_number(target_arch.get("dependencyHubs"), 0))
            - int(_as_number(base_arch.get("dependencyHubs"), 0)),
            "boundaryWarningsDelta": int(_as_number(target_arch.get("boundaryWarnings"), 0))
            - int(_as_number(base_arch.get("boundaryWarnings"), 0)),
        },
        "ml": {
            "basePredictedRiskScore": base_ml.get("predictedRiskScore"),
            "targetPredictedRiskScore": target_ml.get("predictedRiskScore"),
            "riskScoreDelta": ml_risk_delta,
            "basePredictedDebtScore": base_ml.get("predictedDebtScore"),
            "targetPredictedDebtScore": target_ml.get("predictedDebtScore"),
            "debtScoreDelta": ml_debt_delta,
            "basePredictedRiskLevel": base_ml.get("predictedRiskLevel"),
            "targetPredictedRiskLevel": target_ml.get("predictedRiskLevel"),
            "basePredictedDebtLevel": base_ml.get("predictedDebtLevel"),
            "targetPredictedDebtLevel": target_ml.get("predictedDebtLevel"),
        },
    }