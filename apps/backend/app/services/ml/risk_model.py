from __future__ import annotations

from typing import Any


def _clamp(value: float, min_value: float = 0.0, max_value: float = 100.0) -> float:
    return max(min_value, min(max_value, value))


def _risk_level(score: float) -> str:
    if score >= 85:
        return "critical"
    if score >= 65:
        return "high"
    if score >= 35:
        return "medium"
    return "low"


def predict_risk(feature_vector: dict[str, Any]) -> dict[str, Any]:
    """
    Calibrated baseline risk predictor for ML Foundation v1.

    Goal:
    - avoid over-scoring generally healthy repositories
    - emphasize actual risky findings more than generic quality findings
    - keep the score explainable
    """
    critical = float(feature_vector.get("critical_findings_count", 0))
    high = float(feature_vector.get("high_findings_count", 0))
    medium = float(feature_vector.get("medium_findings_count", 0))
    secrets = float(feature_vector.get("secret_findings_count", 0))
    dependencies = float(feature_vector.get("dependency_findings_count", 0))
    risk_findings = float(feature_vector.get("risk_findings_count", 0))

    hotspot_ratio = float(feature_vector.get("hotspot_files_ratio", 0.0))
    risky_ratio = float(feature_vector.get("risky_files_ratio", 0.0))
    concentration = float(feature_vector.get("top_5_finding_concentration", 0.0))

    security_score = float(feature_vector.get("security_score", 100.0))
    health_score = float(feature_vector.get("health_score", 100.0))
    maintainability_score = float(feature_vector.get("maintainability_score", 100.0))

    score = 0.0

    # direct severity pressure
    score += critical * 20.0
    score += high * 3.5
    score += medium * 0.5

    # explicit risky/security signals
    score += secrets * 15.0
    score += dependencies * 2.0
    score += risk_findings * 5.0

    # spread of actual risky behavior matters more than generic finding count
    score += hotspot_ratio * 12.0
    score += risky_ratio * 35.0
    score += concentration * 8.0

    # weak platform scores add some pressure, but not too much
    score += max(0.0, (100.0 - security_score)) * 0.10
    score += max(0.0, (100.0 - health_score)) * 0.05
    score += max(0.0, (100.0 - maintainability_score)) * 0.05

    # damping for repos with low risky spread and no critical/security disasters
    if critical == 0 and secrets == 0 and risky_ratio < 0.05:
        score -= 18.0

    if risk_findings <= 5 and hotspot_ratio < 0.08:
        score -= 8.0

    if health_score >= 80:
        score -= 5.0

    score = _clamp(score)

    drivers: list[str] = []
    if critical > 0:
        drivers.append(f"{int(critical)} critical findings")
    if high > 0:
        drivers.append(f"{int(high)} high severity findings")
    if secrets > 0:
        drivers.append(f"{int(secrets)} secret-related findings")
    if risk_findings > 0:
        drivers.append(f"{int(risk_findings)} risk-pattern findings")
    if hotspot_ratio >= 0.15:
        drivers.append("hotspots concentrated across multiple files")
    if risky_ratio >= 0.10:
        drivers.append("high ratio of risky files")
    if concentration >= 0.50:
        drivers.append("issues heavily concentrated in top files")
    if security_score < 70:
        drivers.append("security sub-score is weak")

    if not drivers:
        drivers.append("no strong risk drivers detected")

    confidence = 0.55
    signal_count = sum(
        1
        for v in [critical, high, medium, secrets, dependencies, risk_findings]
        if v > 0
    )
    if signal_count >= 5:
        confidence = 0.78
    elif signal_count >= 3:
        confidence = 0.68
    elif signal_count >= 1:
        confidence = 0.60

    return {
        "model": "baseline-risk-v1.2",
        "score": round(score, 2),
        "level": _risk_level(score),
        "confidence": round(confidence, 2),
        "drivers": drivers[:5],
    }