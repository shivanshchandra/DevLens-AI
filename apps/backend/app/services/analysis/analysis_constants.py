from __future__ import annotations

DEFAULT_EXCLUDE_DIRS = {
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
}

EXT_TO_LANG = {
    ".py": "Python",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".md": "Markdown",
    ".json": "JSON",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".html": "HTML",
    ".css": "CSS",
    ".go": "Go",
    ".java": "Java",
    ".rs": "Rust",
    ".cpp": "C++",
    ".c": "C",
    ".sh": "Shell",
}

TEXT_EXT_ALLOWLIST = set(EXT_TO_LANG.keys()) | {
    ".txt",
    ".toml",
    ".ini",
    ".env",
    ".example",
    ".cfg",
}