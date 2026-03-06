# apps/backend/app/services/analysis/git_utils.py

from __future__ import annotations

import os
import subprocess
from pathlib import Path


def _run_git(cmd: list[str], cwd: Path | None = None, timeout: int = 300) -> None:
    """
    Run a git command safely:
    - non-interactive (won't prompt for credentials)
    - captures output for clean error messages
    """
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"

    try:
        subprocess.run(
            cmd,
            cwd=str(cwd) if cwd else None,
            check=True,
            capture_output=True,
            text=True,
            env=env,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired as e:
        raise RuntimeError(f"Git command timed out: {' '.join(cmd[:3])}") from e
    except subprocess.CalledProcessError as e:
        msg = (e.stderr or e.stdout or "").strip()
        raise RuntimeError(f"Git command failed: {' '.join(cmd[:3])} - {msg[:400]}") from e


def clone_repo(repo_url: str, dest_dir: str | Path, depth: int = 1) -> Path:
    """
    Clone a git repo into dest_dir.
    - Shallow clone by default (depth=1) for speed.
    - Non-interactive (won't hang asking credentials).
    """
    dest = Path(dest_dir).resolve()
    dest.parent.mkdir(parents=True, exist_ok=True)

    cmd = ["git", "clone", "--depth", str(depth), repo_url, str(dest)]
    _run_git(cmd, cwd=None, timeout=300)

    return dest


def checkout_ref(repo_dir: str | Path, ref: str, depth: int = 50) -> None:
    """
    Checkout a branch/tag/commit in an already cloned repo.
    Works even after shallow clone by fetching the ref.
    """
    repo = Path(repo_dir).resolve()

    ref = (ref or "").strip()
    if not ref:
        return

    # Fetch the ref (helps when depth=1 clone doesn't include it)
    # This supports branches and tags in most cases.
    _run_git(["git", "fetch", "--depth", str(depth), "origin", ref], cwd=repo, timeout=300)

    # Try checkout as-is
    _run_git(["git", "checkout", ref], cwd=repo, timeout=120)