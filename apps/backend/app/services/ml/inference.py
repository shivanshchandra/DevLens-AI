from __future__ import annotations

from typing import Any

from app.services.ml.feature_vector import build_ml_feature_vector
from app.services.ml.risk_model import predict_risk
from app.services.ml.debt_model import predict_technical_debt
from app.services.ml.explainability import build_ml_explanations


def run_ml_inference(result: dict[str, Any]) -> dict[str, Any]:
    """
    Runs ML Foundation v1 on top of the existing scan result payload.

    Safe behavior:
    - does not mutate original result
    - produces a standalone ML block
    - easy to attach later in jobs.py/result_builder.py
    """
    feature_vector = build_ml_feature_vector(result)
    risk_prediction = predict_risk(feature_vector)
    debt_prediction = predict_technical_debt(feature_vector)
    explanations = build_ml_explanations(
        result=result,
        feature_vector=feature_vector,
        risk_prediction=risk_prediction,
        debt_prediction=debt_prediction,
    )

    return {
        "version": "v1",
        "featureVector": feature_vector,
        "riskPrediction": risk_prediction,
        "technicalDebtPrediction": debt_prediction,
        "explanations": explanations,
        "summary": {
            "predictedRiskLevel": risk_prediction["level"],
            "predictedRiskScore": risk_prediction["score"],
            "predictedDebtLevel": debt_prediction["level"],
            "predictedDebtScore": debt_prediction["score"],
        },
    }

