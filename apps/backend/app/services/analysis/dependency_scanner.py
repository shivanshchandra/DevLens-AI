from __future__ import annotations
from pathlib import Path
from typing import List

from app.services.analysis.deps_parser import parse_requirements_txt, parse_package_json
from app.services.analysis.osv_client import query_osv


def scan_dependencies(root: str | Path, max_packages: int = 50) -> List[dict]:
    """
    Scan dependency files and return findings (JSON-ready).
    Safe: OSV failure won't crash the scan (handled by try/except).
    """
    root = Path(root).resolve()
    findings: List[dict] = []
    fid = 1

    # Python: requirements.txt
    req = root / "requirements.txt"
    if req.exists():
        for name in parse_requirements_txt(req)[:max_packages]:
            try:
                vulns = query_osv("PyPI", name)
            except Exception:
                vulns = []

            for v in vulns[:3]:
                findings.append({
                    "id": f"D-{fid}",
                    "type": "dependency",
                    "severity": "high",
                    "title": f"Vulnerable dependency: {name}",
                    "filePath": "requirements.txt",
                    "message": f"OSV reported vulnerability: {v.get('id', 'unknown')}",
                    "ruleId": "OSV",
                })
                fid += 1

    # Node: package.json
    pkg = root / "package.json"
    if pkg.exists():
        for name in parse_package_json(pkg)[:max_packages]:
            try:
                vulns = query_osv("npm", name)
            except Exception:
                vulns = []

            for v in vulns[:3]:
                findings.append({
                    "id": f"D-{fid}",
                    "type": "dependency",
                    "severity": "high",
                    "title": f"Vulnerable dependency: {name}",
                    "filePath": "package.json",
                    "message": f"OSV reported vulnerability: {v.get('id', 'unknown')}",
                    "ruleId": "OSV",
                })
                fid += 1

    return findings