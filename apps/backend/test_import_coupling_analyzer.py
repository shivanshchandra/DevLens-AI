from pathlib import Path

from app.services.analysis.import_coupling_analyzer import analyze_import_coupling


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def test_import_coupling_returns_expected_shape(tmp_path: Path):
    write_file(
        tmp_path / "pkg" / "__init__.py",
        "",
    )
    write_file(
        tmp_path / "pkg" / "a.py",
        "from pkg import b\nfrom pkg import c\n",
    )
    write_file(
        tmp_path / "pkg" / "b.py",
        "from pkg import c\n",
    )
    write_file(
        tmp_path / "pkg" / "c.py",
        "VALUE = 1\n",
    )

    result = analyze_import_coupling(tmp_path)

    assert "summary" in result
    assert "couplingHotspots" in result
    assert "dependencyHubs" in result
    assert "boundaryWarnings" in result
    assert "directoryCouplingHotspots" in result

    assert isinstance(result["couplingHotspots"], list)
    assert isinstance(result["dependencyHubs"], list)
    assert isinstance(result["boundaryWarnings"], list)
    assert isinstance(result["directoryCouplingHotspots"], list)


def test_import_coupling_identifies_dependency_hub(tmp_path: Path):
    write_file(tmp_path / "pkg" / "__init__.py", "")
    write_file(tmp_path / "pkg" / "shared.py", "VALUE = 1\n")
    write_file(tmp_path / "pkg" / "a.py", "from pkg import shared\n")
    write_file(tmp_path / "pkg" / "b.py", "from pkg import shared\n")
    write_file(tmp_path / "pkg" / "c.py", "from pkg import shared\n")
    write_file(tmp_path / "pkg" / "d.py", "from pkg import shared\n")

    result = analyze_import_coupling(tmp_path)
    hubs = result["dependencyHubs"]

    assert any(item["filePath"].endswith("shared.py") for item in hubs)