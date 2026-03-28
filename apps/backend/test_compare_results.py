from app.services.analysis.compare_results import compare_scan_results


def _result(
    *,
    health=80,
    grade="B",
    findings=None,
    top_files_to_fix=None,
    architecture=None,
    ml=None,
):
    return {
        "healthScore": health,
        "grade": grade,
        "findings": findings or [],
        "top_files_to_fix": top_files_to_fix or [],
        "architecture": architecture or {
            "summary": {
                "possibleGodFiles": 1,
                "hotspotDirectories": 2,
                "architectureSmells": 2,
                "architectureRiskScore": 50,
                "couplingHotspots": 1,
                "dependencyHubs": 1,
                "boundaryWarnings": 1,
            }
        },
        "ml": ml or {
            "summary": {
                "predictedRiskLevel": "medium",
                "predictedRiskScore": 60,
                "predictedDebtLevel": "medium",
                "predictedDebtScore": 55,
            }
        },
    }


def test_compare_results_improved_case():
    base = _result(
        health=72,
        grade="C",
        findings=[
            {
                "id": "F1",
                "severity": "critical",
                "type": "security",
                "ruleId": "SECRET",
                "title": "Hardcoded secret",
                "filePath": "app/settings.py",
                "message": "Secret found",
            },
            {
                "id": "F2",
                "severity": "high",
                "type": "risk",
                "ruleId": "RISK-1",
                "title": "Unsafe eval",
                "filePath": "app/core.py",
                "message": "Avoid eval",
            },
        ],
        top_files_to_fix=[
            {"filePath": "app/settings.py", "priorityScore": 91},
            {"filePath": "app/core.py", "priorityScore": 70},
        ],
    )

    target = _result(
        health=84,
        grade="B",
        findings=[
            {
                "id": "F2b",
                "severity": "medium",
                "type": "risk",
                "ruleId": "RISK-1",
                "title": "Unsafe eval",
                "filePath": "app/core.py",
                "message": "Avoid eval",
            }
        ],
        top_files_to_fix=[
            {"filePath": "app/core.py", "priorityScore": 60},
        ],
        architecture={
            "summary": {
                "possibleGodFiles": 0,
                "hotspotDirectories": 1,
                "architectureSmells": 1,
                "architectureRiskScore": 34,
                "couplingHotspots": 1,
                "dependencyHubs": 0,
                "boundaryWarnings": 0,
            }
        },
        ml={
            "summary": {
                "predictedRiskLevel": "low",
                "predictedRiskScore": 38,
                "predictedDebtLevel": "low",
                "predictedDebtScore": 40,
            }
        },
    )

    result = compare_scan_results(base, target)

    assert result["verdict"] == "improved"
    assert result["overview"]["healthScoreDelta"] == 12
    assert result["overview"]["gradeChanged"] is True
    assert result["findings"]["deltas"]["critical"] == -1
    assert result["architecture"]["riskDelta"] == -16
    assert result["ml"]["riskScoreDelta"] == -22


def test_compare_results_regressed_case():
    base = _result(
        health=88,
        grade="B",
        findings=[],
        architecture={
            "summary": {
                "possibleGodFiles": 0,
                "hotspotDirectories": 1,
                "architectureSmells": 1,
                "architectureRiskScore": 25,
                "couplingHotspots": 0,
                "dependencyHubs": 0,
                "boundaryWarnings": 0,
            }
        },
        ml={
            "summary": {
                "predictedRiskLevel": "low",
                "predictedRiskScore": 25,
                "predictedDebtLevel": "low",
                "predictedDebtScore": 20,
            }
        },
    )

    target = _result(
        health=74,
        grade="C",
        findings=[
            {
                "id": "F10",
                "severity": "critical",
                "type": "security",
                "ruleId": "SECRET",
                "title": "Hardcoded secret",
                "filePath": "app/secrets.py",
                "message": "Secret found",
            },
            {
                "id": "F11",
                "severity": "high",
                "type": "risk",
                "ruleId": "RISK-2",
                "title": "Unsafe shell call",
                "filePath": "app/runner.py",
                "message": "shell=True used",
            },
        ],
        architecture={
            "summary": {
                "possibleGodFiles": 2,
                "hotspotDirectories": 3,
                "architectureSmells": 4,
                "architectureRiskScore": 64,
                "couplingHotspots": 2,
                "dependencyHubs": 1,
                "boundaryWarnings": 1,
            }
        },
        ml={
            "summary": {
                "predictedRiskLevel": "high",
                "predictedRiskScore": 70,
                "predictedDebtLevel": "medium",
                "predictedDebtScore": 48,
            }
        },
    )

    result = compare_scan_results(base, target)

    assert result["verdict"] == "regressed"
    assert result["overview"]["healthScoreDelta"] == -14
    assert result["findings"]["deltas"]["critical"] == 1
    assert result["findings"]["deltas"]["high"] == 1
    assert result["architecture"]["riskDelta"] == 39
    assert result["ml"]["riskScoreDelta"] == 45


def test_compare_results_unchanged_case():
    base = _result()
    target = _result()

    result = compare_scan_results(base, target)

    assert result["verdict"] == "unchanged"
    assert result["overview"]["healthScoreDelta"] == 0
    assert result["findings"]["newFindings"] == []
    assert result["findings"]["resolvedFindings"] == []


def test_compare_results_tolerates_missing_sections():
    base = {
        "healthScore": 70,
        "grade": "C",
        "findings": [],
    }
    target = {
        "healthScore": 72,
        "grade": "C",
        "findings": [],
    }

    result = compare_scan_results(base, target)

    assert result["overview"]["healthScoreDelta"] == 2
    assert result["architecture"]["riskDelta"] == 0
    assert result["ml"]["riskScoreDelta"] == 0
    assert result["refactor"]["topChangedFiles"] == []