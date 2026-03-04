# apps/backend/app/services/analysis/git_utils.py

from __future__ import annotations

import os
import subprocess
from pathlib import Path


def clone_repo(repo_url: str, dest_dir: str | Path, depth: int = 1) -> Path:
    """
    Clone a git repo into dest_dir.
    - Shallow clone by default (depth=1) for speed.
    - Non-interactive (won't hang asking credentials).
    """
    dest = Path(dest_dir).resolve()
    dest.parent.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"  # never prompt in Docker

    # Basic clone (you can extend later for branch/commit checkout)
    cmd = ["git", "clone", "--depth", str(depth), repo_url, str(dest)]

    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True, env=env, timeout=300)
    except subprocess.TimeoutExpired as e:
        raise RuntimeError("Git clone timed out") from e
    except subprocess.CalledProcessError as e:
        msg = (e.stderr or e.stdout or "").strip()
        raise RuntimeError(f"Git clone failed: {msg[:400]}") from e

    return dest