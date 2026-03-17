from app.services.analysis.result_builder import build_result_payload


def test_result_builder_basic():
    result = build_result_payload(
        scan_type="repo",
        scores={
            "healthScore": 80,
            "grade": "B",
            "subScores": {"quality": 78, "security": 75, "maintainability": 82},
        },
        metrics={"files": 100, "loc": 15000},
        findings=[{"id": "1"}],
        secret_findings=[],
        dependency_findings=[],
        complexity_findings=[],
        complexity_hotspots=[],
        risk_findings=[],
        risk_summary={"total": 1},
        fix_suggestions=[{"title": "Fix issue"}],
        top_files_to_fix=[{"filePath": "app/main.py"}],
        file_features=[],
        file_feature_summary={"filesWithFindings": 5},
    )

    assert result is not None

    # Core fields
    assert "healthScore" in result
    assert "subScores" in result
    assert "metrics" in result

    # New contract
    assert "overview" in result
    assert "summaries" in result
    assert "finding_groups" in result
    assert "recommendations" in result


def test_result_builder_with_ml():
    result = build_result_payload(
        scan_type="repo",
        scores={"healthScore": 70, "grade": "C"},
        metrics={},
        findings=[],
        secret_findings=[],
        dependency_findings=[],
        complexity_findings=[],
        complexity_hotspots=[],
        risk_findings=[],
        risk_summary={},
        fix_suggestions=[],
        top_files_to_fix=[],
        file_features=[],
        file_feature_summary={},
        ml={
            "summary": {
                "predictedRiskLevel": "high",
                "predictedRiskScore": 85,
                "predictedDebtLevel": "medium",
                "predictedDebtScore": 60,
            },
            "version": "v1",
        },
    )

    assert "ml" in result
    assert "summaries" in result
    assert "ml" in result["summaries"]

    ml_summary = result["summaries"]["ml"]

    assert ml_summary["predictedRiskLevel"] == "high"
    assert ml_summary["predictedDebtLevel"] == "medium"


def test_result_builder_defaults():
    result = build_result_payload(
        scan_type="repo",
        scores={},
        metrics={},
        findings=[],
        secret_findings=[],
        dependency_findings=[],
        complexity_findings=[],
        complexity_hotspots=[],
        risk_findings=[],
        risk_summary={},
        fix_suggestions=[],
        top_files_to_fix=[],
        file_features=[],
        file_feature_summary={},
    )

    # Ensure defaults exist
    assert "summaries" in result
    assert "risk" in result["summaries"]
    assert "fileFeatures" in result["summaries"]