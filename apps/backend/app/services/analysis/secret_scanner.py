from __future__ import annotations
import re
from pathlib import Path
from typing import List

# Simple secret rules (pattern-based)
SECRET_RULES = [
    ("Private Key Block", "PRIVATE_KEY", re.compile(r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----")),
    ("AWS Access Key", "AWS_ACCESS_KEY_ID", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("Generic API Key", "GENERIC_API_KEY", re.compile(r"(?i)\b(api[_-]?key|token|secret)\b\s*[:=]\s*['\"][^'\"]{8,}['\"]")),
    ("Password Assignment", "PASSWORD_ASSIGN", re.compile(r"(?i)\b(password|passwd|pwd)\b\s*[:=]\s*['\"][^'\"]{6,}['\"]")),
]

# Directories to skip
EXCLUDE_DIRS = {
    ".git", "node_modules", ".next", "dist", "build", "__pycache__", ".venv", "venv",
    ".mypy_cache", ".pytest_cache", ".turbo", ".idea", ".vscode"
}

# ✅ Files / paths we explicitly ignore to avoid noisy false positives
# (especially because you will push docker-compose.yml to GitHub)
EXCLUDE_PATH_CONTAINS = [
    "infra/docker/docker-compose.yml",
    ".env.example",
]

# Text-like extensions we scan
TEXT_EXT = {
    ".py",".js",".ts",".tsx",".jsx",".json",".yml",".yaml",".env",".txt",".toml",".ini",".md",".cfg",".example"
}


def _is_excluded(path: Path) -> bool:
    parts = set(path.parts)
    return any(d in parts for d in EXCLUDE_DIRS)


def scan_for_secrets(root: str | Path, max_files: int = 20_000, max_bytes: int = 1_000_000) -> List[dict]:
    """
    Returns findings as a list[dict] (directly JSON-ready).
    We scan text-ish files for common secret patterns.
    """
    root = Path(root).resolve()
    findings: List[dict] = []
    fid = 1

    for p in root.rglob("*"):
        if fid > 200:  # cap findings to avoid spam
            break
        if max_files <= 0:
            break

        if p.is_dir():
            continue
        if _is_excluded(p):
            continue

        rel = str(p.relative_to(root)).replace("\\", "/")

        # ✅ skip noisy known paths
        if any(x in rel for x in EXCLUDE_PATH_CONTAINS):
            continue

        ext = p.suffix.lower()
        # allow .env specifically even though suffix can be empty in some cases
        if ext and ext not in TEXT_EXT:
            continue

        try:
            if p.stat().st_size > max_bytes:
                continue
            content = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        max_files -= 1

        for title, rule_id, rx in SECRET_RULES:
            if rx.search(content):
                severity = "critical" if rule_id in ("PRIVATE_KEY", "AWS_ACCESS_KEY_ID") else "high"
                findings.append({
                    "id": f"S-{fid}",
                    "type": "security",
                    "severity": severity,
                    "title": f"Potential secret detected: {title}",
                    "filePath": rel,
                    "message": "Pattern match suggests a secret may be hardcoded. Move it to env vars / secret manager.",
                    "ruleId": rule_id,
                })
                fid += 1
                break

    return findings