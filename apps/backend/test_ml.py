from app.services.ml.inference import run_ml_inference


def test_ml_inference_basic():
    sample_result = {
        "healthScore": 74,
        "subScores": {"quality": 70, "security": 65, "maintainability": 68},
        "metrics": {"files": 120, "loc": 18000},
        "findings": [
            {"severity": "high"},
            {"severity": "medium"},
            {"severity": "critical"},
        ],
        "risk_findings": [{"severity": "high"}],
        "dependency_findings": [{"severity": "medium"}],
        "secret_findings": [{"severity": "critical"}],
        "top_files_to_fix": [{"filePath": "app/main.py"}],
        "fix_suggestions": [{"title": "Refactor risky logic"}],
        "file_feature_summary": {
            "filesWithFindings": 8,
            "hotspotFiles": 3,
        },
        "file_features": [
            {
                "filePath": "app/main.py",
                "language": "Python",
                "loc": 600,
                "findingCount": 4,
                "hotspotScore": 78,
                "secretCount": 1,
                "riskCount": 2,
                "dependencyIssueCount": 0,
                "complexityFindingCount": 1,
                "isConfigFile": False,
                "isTestFile": False,
                "isDependencyFile": False,
                "changedInPr": False,
            },
            {
                "filePath": "app/utils.py",
                "language": "Python",
                "loc": 300,
                "findingCount": 2,
                "hotspotScore": 52,
                "secretCount": 0,
                "riskCount": 1,
                "dependencyIssueCount": 1,
                "complexityFindingCount": 1,
                "isConfigFile": False,
                "isTestFile": False,
                "isDependencyFile": False,
                "changedInPr": True,
            },
        ],
    }

    result = run_ml_inference(sample_result)

    assert result is not None

    assert "riskPrediction" in result
    assert "score" in result["riskPrediction"]
    assert "level" in result["riskPrediction"]

    assert "technicalDebtPrediction" in result
    assert "score" in result["technicalDebtPrediction"]
    assert "level" in result["technicalDebtPrediction"]

    assert "summary" in result


def test_ml_inference_empty_input():
    result = run_ml_inference({})

    assert result is not None
    assert "riskPrediction" in result
    assert "technicalDebtPrediction" in result
    assert "summary" in result


def test_ml_inference_explainability_shape():
    sample_result = {
        "healthScore": 61,
        "subScores": {"quality": 58, "security": 55, "maintainability": 62},
        "metrics": {"files": 80, "loc": 12000},
        "findings": [
            {"severity": "critical", "type": "security"},
            {"severity": "high", "type": "risk"},
            {"severity": "medium", "type": "complexity"},
        ],
        "risk_findings": [{"severity": "high"}],
        "dependency_findings": [{"severity": "medium"}],
        "secret_findings": [{"severity": "critical"}],
        "top_files_to_fix": [{"filePath": "app/main.py"}],
        "fix_suggestions": [{"title": "Remove hardcoded secret"}],
        "file_feature_summary": {
            "filesWithFindings": 6,
            "hotspotFiles": 2,
        },
        "file_features": [
            {
                "filePath": "app/main.py",
                "language": "Python",
                "loc": 500,
                "findingCount": 4,
                "hotspotScore": 75,
                "secretCount": 1,
                "riskCount": 2,
                "dependencyIssueCount": 0,
                "complexityFindingCount": 1,
                "isConfigFile": False,
                "isTestFile": False,
                "isDependencyFile": False,
                "changedInPr": False,
            }
        ],
    }

    result = run_ml_inference(sample_result)

    assert result is not None

    assert "explanations" in result
    assert "risk" in result["explanations"]
    assert "technicalDebt" in result["explanations"]

    assert "topContributingFiles" in result["explanations"]
    assert isinstance(result["explanations"]["topContributingFiles"], list)

    assert "nextActions" in result["explanations"]
    assert isinstance(result["explanations"]["nextActions"], list)