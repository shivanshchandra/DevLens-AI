from app.services.analysis.refactor_priority import build_refactor_priority


def test_refactor_priority_prefers_prod_file_over_test_file_when_scores_are_close():
    findings = [
        {
            "id": "1",
            "filePath": "tests/test_auth.py",
            "severity": "high",
            "title": "High cyclomatic complexity",
            "ruleId": "CYCLO_COMPLEXITY",
            "type": "quality",
        },
        {
            "id": "2",
            "filePath": "app/services/auth.py",
            "severity": "high",
            "title": "High cyclomatic complexity",
            "ruleId": "CYCLO_COMPLEXITY",
            "type": "quality",
        },
    ]

    result = build_refactor_priority(findings)

    assert result[0]["filePath"] == "app/services/auth.py"


def test_refactor_priority_still_keeps_test_file_if_it_is_truly_worse():
    findings = [
        {
            "id": "1",
            "filePath": "tests/test_auth.py",
            "severity": "critical",
            "title": "Hardcoded secret",
            "ruleId": "HARDCODED_TOKEN",
            "type": "security",
        },
        {
            "id": "2",
            "filePath": "app/services/auth.py",
            "severity": "medium",
            "title": "High cyclomatic complexity",
            "ruleId": "CYCLO_COMPLEXITY",
            "type": "quality",
        },
    ]

    result = build_refactor_priority(findings)

    assert result[0]["filePath"] == "tests/test_auth.py"


def test_refactor_priority_downranks_docs_examples_noise():
    findings = [
        {
            "id": "1",
            "filePath": "docs/example.py",
            "severity": "high",
            "title": "Risky pattern",
            "ruleId": "UNSAFE_EVAL",
            "type": "risk",
        },
        {
            "id": "2",
            "filePath": "app/core/engine.py",
            "severity": "high",
            "title": "Risky pattern",
            "ruleId": "UNSAFE_EVAL",
            "type": "risk",
        },
    ]

    result = build_refactor_priority(findings)

    assert result[0]["filePath"] == "app/core/engine.py"


def test_refactor_priority_respects_hotspots_and_loc():
    findings = [
        {
            "id": "1",
            "filePath": "app/core/engine.py",
            "severity": "medium",
            "title": "High cyclomatic complexity",
            "ruleId": "CYCLO_COMPLEXITY",
            "type": "quality",
        },
        {
            "id": "2",
            "filePath": "app/api/routes.py",
            "severity": "medium",
            "title": "High cyclomatic complexity",
            "ruleId": "CYCLO_COMPLEXITY",
            "type": "quality",
        },
    ]

    result = build_refactor_priority(
        findings,
        complexity_hotspots=[
            {"filePath": "app/core/engine.py", "score": 92},
            {"filePath": "app/api/routes.py", "score": 35},
        ],
        file_locs={
            "app/core/engine.py": 900,
            "app/api/routes.py": 220,
        },
    )

    assert result[0]["filePath"] == "app/core/engine.py"


def test_refactor_priority_limits_results():
    findings = [
        {
            "id": str(i),
            "filePath": f"app/file_{i}.py",
            "severity": "low",
            "title": "Minor issue",
            "ruleId": "MINOR",
            "type": "quality",
        }
        for i in range(20)
    ]

    result = build_refactor_priority(findings, limit=5)

    assert len(result) == 5