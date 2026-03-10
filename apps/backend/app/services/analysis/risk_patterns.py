from __future__ import annotations

import re
from pathlib import Path
from typing import Iterable


RISK_RULES = [
    {
        "title": "Unsafe eval usage",
        "ruleId": "UNSAFE_EVAL",
        "severity": "high",
        "pattern": re.compile(r"\beval\s*\("),
        "message": "Use of eval() can execute arbitrary code and should be avoided.",
    },
    {
        "title": "Unsafe exec usage",
        "ruleId": "UNSAFE_EXEC",
        "severity": "high",
        "pattern": re.compile(r"\bexec\s*\("),
        "message": "Use of exec() can execute arbitrary code and should be avoided.",
    },
    {
        "title": "Shell execution with shell=True",
        "ruleId": "UNSAFE_SUBPROCESS_SHELL_TRUE",
        "severity": "high",
        "pattern": re.compile(r"\bsubprocess\.(run|Popen|call|check_call|check_output)\s*\([^\)]*shell\s*=\s*True", re.DOTALL),
        "message": "Using subprocess with shell=True can introduce command injection risk.",
    },
    {
        "title": "Weak hash algorithm usage",
        "ruleId": "WEAK_HASH_MD5",
        "severity": "medium",
        "pattern": re.compile(r"\b(hashlib\.)?md5\s*\("),
        "message": "MD5 is considered cryptographically weak and should not be used for security-sensitive logic.",
    },
    {
        "title": "Weak hash algorithm usage",
        "ruleId": "WEAK_HASH_SHA1",
        "severity": "medium",
        "pattern": re.compile(r"\b(hashlib\.)?sha1\s*\("),
        "message": "SHA1 is considered cryptographically weak and should not be used for security-sensitive logic.",
    },
    {
        "title": "Hardcoded password assignment",
        "ruleId": "HARDCODED_PASSWORD",
        "severity": "high",
        "pattern": re.compile(
            r"""(?ix)
            \b(password|passwd|pwd)\b
            \s*[:=]\s*
            ["'][^"'\n]{4,}["']
            """
        ),
        "message": "A hardcoded password-like value was detected in source code.",
    },
    {
        "title": "Hardcoded token or API key assignment",
        "ruleId": "HARDCODED_TOKEN",
        "severity": "high",
        "pattern": re.compile(
            r"""(?ix)
            \b(api[_-]?key|token|secret|access[_-]?token)\b
            \s*[:=]\s*
            ["'][^"'\n]{8,}["']
            """
        ),
        "message": "A hardcoded token, secret, or API key-like value was detected in source code.",
    },
    {
        "title": "Private key material detected",
        "ruleId": "PRIVATE_KEY_BLOCK",
        "severity": "critical",
        "pattern": re.compile(r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"),
        "message": "Private key material appears to be present in the file.",
    },
]


TEXT_EXTENSIONS = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".json",
    ".yml",
    ".yaml",
    ".toml",
    ".ini",
    ".cfg",
    ".env",
    ".sh",
    ".md",
    ".txt",
}


EXCLUDED_DIRS = {
    ".git",
    "node_modules",
    ".next",
    "dist",
    "build",
    "__pycache__",
    ".venv",
    "venv",
    ".mypy_cache",
    ".pytest_cache",
    ".turbo",
    ".idea",
    ".vscode",
}


def _is_excluded(path: Path) -> bool:
    parts = set(path.parts)
    return any(d in parts for d in EXCLUDED_DIRS)


def iter_risk_files(
    root: str | Path,
    include_paths: Iterable[str] | None = None,
    max_files: int = 20_000,
) -> list[Path]:
    """
    Return candidate files for risk scanning.

    - If include_paths is provided, only scan those relative paths.
    - Otherwise scan the full directory tree.
    """
    root = Path(root).resolve()
    results: list[Path] = []

    if include_paths is not None:
        for rel in include_paths:
            rel = (rel or "").replace("\\", "/").strip()
            if not rel:
                continue

            file_path = (root / rel).resolve()

            if not str(file_path).startswith(str(root)):
                continue
            if not file_path.exists() or not file_path.is_file():
                continue
            if _is_excluded(file_path):
                continue

            ext = file_path.suffix.lower()
            if ext and ext not in TEXT_EXTENSIONS:
                continue

            results.append(file_path)

        return results[:max_files]

    count = 0
    for p in root.rglob("*"):
        if count >= max_files:
            break
        if p.is_dir():
            continue
        if _is_excluded(p):
            continue

        ext = p.suffix.lower()
        if ext and ext not in TEXT_EXTENSIONS:
            continue

        results.append(p)
        count += 1

    return results


def scan_risk_patterns(
    root: str | Path,
    include_paths: Iterable[str] | None = None,
    max_files: int = 20_000,
    max_bytes: int = 1_000_000,
) -> list[dict]:
    """
    Scan files for risky code patterns.
    Returns findings in the same general JSON style as existing analyzers.
    """
    root = Path(root).resolve()
    findings: list[dict] = []
    fid = 1

    candidate_files = iter_risk_files(root, include_paths=include_paths, max_files=max_files)

    for file_path in candidate_files:
        try:
            if file_path.stat().st_size > max_bytes:
                continue
            content = file_path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        rel_path = str(file_path.relative_to(root)).replace("\\", "/")

        for rule in RISK_RULES:
            match = rule["pattern"].search(content)
            if not match:
                continue

            line_no = content[: match.start()].count("\n") + 1

            findings.append(
                {
                    "id": f"R-{fid}",
                    "type": "risk",
                    "severity": rule["severity"],
                    "title": rule["title"],
                    "filePath": rel_path,
                    "message": rule["message"],
                    "ruleId": rule["ruleId"],
                    "line": line_no,
                }
            )
            fid += 1

    return findings