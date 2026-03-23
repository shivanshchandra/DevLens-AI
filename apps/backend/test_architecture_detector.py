from app.services.analysis.architecture_detector import detect_architecture_signals


def test_architecture_detector_returns_expected_shape(tmp_path):
    root_dir = str(tmp_path)

    file_locs = {
        "src/app.py": 950,
        "src/helpers.py": 220,
        "tests/test_app.py": 500,
    }

    findings = [
        {
            "filePath": "src/app.py",
            "severity": "high",
            "title": "High cyclomatic complexity",
        },
        {
            "filePath": "src/app.py",
            "severity": "medium",
            "title": "Risky pattern detected",
        },
        {
            "filePath": "tests/test_app.py",
            "severity": "medium",
            "title": "High cyclomatic complexity",
        },
    ]

    complexity_hotspots = [
        {"filePath": "src/app.py", "score": 90},
        {"filePath": "tests/test_app.py", "score": 85},
    ]

    result = detect_architecture_signals(
        root_dir=root_dir,
        file_locs=file_locs,
        findings=findings,
        complexity_hotspots=complexity_hotspots,
    )

    assert "summary" in result
    assert "directoryHotspots" in result
    assert "fileHotspots" in result
    assert "possibleGodFiles" in result
    assert "smells" in result
    assert "recommendations" in result
    assert "couplingHotspots" in result
    assert "dependencyHubs" in result
    assert "boundaryWarnings" in result
    assert "directoryCouplingHotspots" in result

    assert isinstance(result["recommendations"], list)
    assert isinstance(result["smells"], list)


def test_architecture_detector_downweights_test_directory_pressure(tmp_path):
    result = detect_architecture_signals(
        root_dir=str(tmp_path),
        file_locs={
            "tests/test_big.py": 1200,
            "src/core.py": 900,
        },
        findings=[
            {"filePath": "tests/test_big.py", "severity": "high", "title": "Complexity"},
            {"filePath": "tests/test_big.py", "severity": "high", "title": "Risk"},
            {"filePath": "src/core.py", "severity": "high", "title": "Complexity"},
            {"filePath": "src/core.py", "severity": "high", "title": "Risk"},
        ],
        complexity_hotspots=[
            {"filePath": "tests/test_big.py", "score": 95},
            {"filePath": "src/core.py", "score": 80},
        ],
    )

    hotspots = result["fileHotspots"]
    tests_item = next(item for item in hotspots if item["filePath"] == "tests/test_big.py")
    src_item = next(item for item in hotspots if item["filePath"] == "src/core.py")

    assert tests_item["score"] < 100
    assert src_item["score"] >= tests_item["score"]