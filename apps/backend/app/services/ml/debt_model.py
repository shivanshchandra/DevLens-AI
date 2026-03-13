from __future__ import annotations

from typing import Any


def _clamp(value: float, min_value: float = 0.0, max_value: float = 100.0) -> float:
    return max(min_value, min(max_value, value))


def _debt_level(score: float) -> str:
    if score >= 80:
        return "critical"
    if score >= 60:
        return "high"
    if score >= 35:
        return "medium"
    return "low"


def predict_technical_debt(feature_vector: dict[str, Any]) -> dict[str, Any]:
    """
    Baseline technical debt predictor for ML Foundation v1.

    Focus:
    - complexity / hotspot pressure
    - finding concentration
    - maintainability weakness
    - oversized files / broad issue spread
    """
    hotspot_ratio = float(feature_vector.get("hotspot_files_ratio", 0.0))
    avg_hotspot = float(feature_vector.get("avg_hotspot_score", 0.0))
    max_hotspot = float(feature_vector.get("max_hotspot_score", 0.0))
    avg_findings_per_file = float(feature_vector.get("avg_findings_per_file", 0.0))
    concentration = float(feature_vector.get("top_5_finding_concentration", 0.0))
    maintainability = float(feature_vector.get("maintainability_score", 100.0))
    quality = float(feature_vector.get("quality_score", 100.0))
    avg_loc_per_file = float(feature_vector.get("avg_loc_per_file", 0.0))
    max_loc_in_file = float(feature_vector.get("max_loc_in_file", 0.0))
    complexity_per_file = float(feature_vector.get("avg_complexity_count_per_file", 0.0))
    top_files_to_fix_count = float(feature_vector.get("top_files_to_fix_count", 0.0))

    score = 0.0
    score += hotspot_ratio * 28.0
    score += (avg_hotspot / 100.0) * 18.0
    score += (max_hotspot / 100.0) * 12.0
    score += min(20.0, avg_findings_per_file * 8.0)
    score += concentration * 15.0
    score += max(0.0, (100.0 - maintainability)) * 0.30
    score += max(0.0, (100.0 - quality)) * 0.18
    score += min(8.0, avg_loc_per_file / 300.0)
    score += min(8.0, max_loc_in_file / 1200.0)
    score += min(10.0, complexity_per_file * 5.0)
    score += min(6.0, top_files_to_fix_count * 1.2)

    score = _clamp(score)

    drivers: list[str] = []
    if hotspot_ratio >= 0.2:
        drivers.append("many files are complexity hotspots")
    if avg_hotspot >= 35:
        drivers.append("elevated average hotspot score")
    if concentration >= 0.5:
        drivers.append("findings concentrated in a few files")
    if maintainability < 70:
        drivers.append("maintainability score is weak")
    if max_loc_in_file >= 1000:
        drivers.append("very large file detected")
    if complexity_per_file >= 1.5:
        drivers.append("complexity findings are frequent")

    if not drivers:
        drivers.append("no strong technical debt drivers detected")

    confidence = 0.58
    if hotspot_ratio > 0.15 and avg_findings_per_file > 0.5:
        confidence = 0.74
    elif hotspot_ratio > 0.05 or avg_findings_per_file > 0.25:
        confidence = 0.66

    return {
        "model": "baseline-debt-v1",
        "score": round(score, 2),
        "level": _debt_level(score),
        "confidence": round(confidence, 2),
        "drivers": drivers[:5],
    }
