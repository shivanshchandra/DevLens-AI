from __future__ import annotations
import urllib.request
import json


OSV_QUERY_URL = "https://api.osv.dev/v1/query"


def query_osv(ecosystem: str, package_name: str) -> list[dict]:
    """
    Query OSV for a package. Returns list of vulnerabilities (can be empty).
    Uses urllib to avoid adding new dependencies.
    """
    payload = {
        "package": {"ecosystem": ecosystem, "name": package_name}
    }

    req = urllib.request.Request(
        OSV_QUERY_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return data.get("vulns", []) or []