from app.services.ai.insight_generator import generate_ai_insights


def _base_result():
    return {
        "healthScore": 90,
        "grade": "A",
        "findings": [],
        "risk_summary": {
            "bySeverity": {
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
            }
        },
        "architecture": {
            "summary": {
                "architectureSmells": 0,
                "couplingHotspots": 0,
                "dependencyHubs": 0,
                "architectureRiskLevel": "low",
            }
        },
        "ml": {
            "summary": {
                "predictedRiskLevel": "low",
                "predictedDebtLevel": "low",
            }
        },
        "fix_suggestions": [],
        "top_files_to_fix": [],
    }


def test_generate_ai_insights_healthy_repo_low_risk():
    result = _base_result()

    ai = generate_ai_insights(result)

    assert ai["version"] == "v1"
    assert "summary" in ai
    assert "riskExplanation" in ai
    assert "refactorPlan" in ai
    assert "grounding" in ai
    assert ai["riskExplanation"]["level"] == "low"
    assert ai["grounding"]["healthScore"] == 90
    assert ai["grounding"]["predictedRiskLevel"] == "low"


def test_generate_ai_insights_critical_findings_force_critical():
    result = _base_result()
    result["healthScore"] = 82
    result["grade"] = "B"
    result["findings"] = [{"id": "F1"}, {"id": "F2"}]
    result["risk_summary"] = {
        "bySeverity": {
            "critical": 1,
            "high": 0,
            "medium": 1,
            "low": 0,
        }
    }

    ai = generate_ai_insights(result)

    assert ai["riskExplanation"]["level"] == "critical"
    assert ai["grounding"]["criticalCount"] == 1
    assert any("critical findings" in bullet.lower() for bullet in ai["riskExplanation"]["bullets"])


def test_generate_ai_insights_multiple_structural_signals_raise_risk():
    result = _base_result()
    result["healthScore"] = 78
    result["grade"] = "B"
    result["architecture"] = {
        "summary": {
            "architectureSmells": 3,
            "couplingHotspots": 2,
            "dependencyHubs": 1,
            "architectureRiskLevel": "high",
        }
    }

    ai = generate_ai_insights(result)

    assert ai["riskExplanation"]["level"] in {"high", "critical"}
    assert ai["grounding"]["architectureRiskLevel"] == "high"
    assert ai["grounding"]["couplingHotspots"] == 2
    assert ai["grounding"]["dependencyHubs"] == 1


def test_generate_ai_insights_ml_signal_can_raise_overall_risk():
    result = _base_result()
    result["healthScore"] = 88
    result["ml"] = {
        "summary": {
            "predictedRiskLevel": "high",
            "predictedDebtLevel": "medium",
        }
    }

    ai = generate_ai_insights(result)

    assert ai["riskExplanation"]["level"] == "high"
    assert ai["grounding"]["predictedRiskLevel"] == "high"
    assert "predicted delivery risk is high" in ai["summary"].lower()


def test_generate_ai_insights_includes_top_refactor_targets():
    result = _base_result()
    result["healthScore"] = 65
    result["grade"] = "C"
    result["risk_summary"] = {
        "bySeverity": {
            "critical": 0,
            "high": 2,
            "medium": 3,
            "low": 1,
        }
    }
    result["findings"] = [{"id": "F1"}, {"id": "F2"}, {"id": "F3"}]
    result["fix_suggestions"] = [{"title": "Fix issue 1"}]
    result["top_files_to_fix"] = [
        {"filePath": "app/core/service.py"},
        {"filePath": "app/api/routes/scans.py"},
        {"filePath": "app/models/scan.py"},
    ]

    ai = generate_ai_insights(result)

    assert ai["grounding"]["topRefactorTargets"] == [
        "app/core/service.py",
        "app/api/routes/scans.py",
        "app/models/scan.py",
    ]
    assert any("app/core/service.py" in bullet for bullet in ai["riskExplanation"]["bullets"])
    assert any("app/core/service.py" in step for step in ai["refactorPlan"]["steps"])