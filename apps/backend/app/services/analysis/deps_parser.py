from __future__ import annotations
import json
from pathlib import Path


def parse_requirements_txt(path: Path) -> list[str]:
    pkgs: list[str] = []
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        name = line.split("==")[0].split(">=")[0].split("<=")[0].strip()
        if name:
            pkgs.append(name)
    return pkgs


def parse_package_json(path: Path) -> list[str]:
    data = json.loads(path.read_text(encoding="utf-8", errors="ignore"))
    pkgs: list[str] = []
    for key in ("dependencies", "devDependencies", "peerDependencies"):
        d = data.get(key) or {}
        pkgs.extend(list(d.keys()))
    return pkgs