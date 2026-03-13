from app.services.ml.inference import run_ml_inference

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

print(run_ml_inference(sample_result))