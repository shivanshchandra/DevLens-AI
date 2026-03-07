from __future__ import annotations

import os
import subprocess
from pathlib import Path
from urllib.parse import urlparse

from app.core.config import settings


class GitError(RuntimeError):
    """Base git-related error."""


class InvalidRepoUrlError(GitError):
    """Raised when repo_url is invalid or unsupported."""


class GitAuthError(GitError):
    """Raised when auth/private repo access fails."""


class GitNotFoundError(GitError):
    """Raised when repository is not found."""


class GitRefError(GitError):
    """Raised when a ref is invalid or cannot be checked out."""


class GitTimeoutError(GitError):
    """Raised when a git command times out."""


class GitNetworkError(GitError):
    """Raised when git fails due to network/DNS issues."""


def normalize_github_repo_url(repo_url: str) -> str:
    """
    Allow only:
      https://github.com/<owner>/<repo>
      https://github.com/<owner>/<repo>.git

    Returns normalized URL without trailing .git or slash.
    """
    raw = (repo_url or "").strip()
    if not raw:
        raise InvalidRepoUrlError(
            "Invalid repository URL. Only https://github.com/<owner>/<repo> URLs are supported."
        )

    parsed = urlparse(raw)

    if parsed.scheme != "https" or parsed.netloc.lower() != "github.com":
        raise InvalidRepoUrlError(
            "Invalid repository URL. Only https://github.com/<owner>/<repo> URLs are supported."
        )

    path = (parsed.path or "").strip("/")
    parts = [p for p in path.split("/") if p]

    if len(parts) != 2:
        raise InvalidRepoUrlError(
            "Invalid repository URL. Use this format: https://github.com/<owner>/<repo>"
        )

    owner, repo = parts
    if not owner or not repo:
        raise InvalidRepoUrlError(
            "Invalid repository URL. Use this format: https://github.com/<owner>/<repo>"
        )

    if repo.endswith(".git"):
        repo = repo[:-4]

    if not repo:
        raise InvalidRepoUrlError(
            "Invalid repository URL. Repository name is missing."
        )

    return f"https://github.com/{owner}/{repo}"


def normalize_ref(ref: str | None) -> str | None:
    if ref is None:
        return None

    value = ref.strip()
    if not value:
        return None

    if len(value) > 200:
        raise GitRefError("Invalid ref. Ref is too long.")

    if value.startswith("-"):
        raise GitRefError("Invalid ref. Ref cannot start with '-'.")

    return value


def _build_clone_url(repo_url: str) -> str:
    """
    If GITHUB_TOKEN is configured, inject it into the clone URL so private repos can work.
    """
    token = settings.GITHUB_TOKEN
    if not token:
        return repo_url

    parsed = urlparse(repo_url)
    return f"{parsed.scheme}://{token}@{parsed.netloc}{parsed.path}"


def _classify_git_error(message: str, cmd: list[str], ref: str | None = None) -> GitError:
    msg = (message or "").strip().lower()
    cmd_name = " ".join(cmd[:3])

    if "could not resolve host" in msg or "temporary failure in name resolution" in msg:
        return GitNetworkError("GitHub clone failed due to a network or DNS issue.")

    if "operation timed out" in msg or "connection timed out" in msg:
        return GitNetworkError("GitHub clone failed due to a network timeout.")

    if "repository not found" in msg:
        return GitNotFoundError("Repository not found on GitHub.")

    if "authentication failed" in msg or "could not read username" in msg:
        return GitAuthError(
            "Access denied to repository. It may be private or require a GitHub token."
        )

    if "permission denied" in msg or "access denied" in msg:
        return GitAuthError(
            "Access denied to repository. It may be private or require a GitHub token."
        )

    if "fatal: couldn't find remote ref" in msg:
        return GitRefError(f"Invalid ref: '{ref}' was not found in the repository.")

    if "pathspec" in msg and "did not match any file(s) known to git" in msg:
        return GitRefError(f"Invalid ref: '{ref}' was not found in the repository.")

    return GitError(f"Git command failed: {cmd_name} - {message[:300]}")


def _run_git(cmd: list[str], cwd: Path | None = None, timeout: int = 300, ref: str | None = None) -> None:
    """
    Run a git command safely:
    - non-interactive
    - output captured
    - classified error handling
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
        joined = " ".join(cmd[:3])
        if "clone" in cmd:
            raise GitTimeoutError("Git clone timed out while downloading repository.") from e
        if "fetch" in cmd:
            raise GitTimeoutError(f"Git fetch timed out while resolving ref '{ref}'.") from e
        if "checkout" in cmd:
            raise GitTimeoutError(f"Git checkout timed out for ref '{ref}'.") from e
        raise GitTimeoutError(f"Git command timed out: {joined}") from e
    except subprocess.CalledProcessError as e:
        msg = (e.stderr or e.stdout or "").strip()
        raise _classify_git_error(msg, cmd, ref=ref) from e


def clone_repo(repo_url: str, dest_dir: str | Path, depth: int = 1) -> tuple[Path, str]:
    """
    Clone a GitHub repo into dest_dir.

    Returns:
        (repo_path, normalized_repo_url)
    """
    normalized_url = normalize_github_repo_url(repo_url)
    auth_url = _build_clone_url(normalized_url)

    dest = Path(dest_dir).resolve()
    dest.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "git",
        "clone",
        "--depth",
        str(depth),
        "--single-branch",
        auth_url,
        str(dest),
    ]
    _run_git(cmd, cwd=None, timeout=settings.GIT_CLONE_TIMEOUT)

    return dest, normalized_url


def checkout_ref(repo_dir: str | Path, ref: str, depth: int = 50) -> str:
    """
    Checkout a branch/tag/commit in an already cloned repo.
    Returns the normalized ref string.
    """
    repo = Path(repo_dir).resolve()
    clean_ref = normalize_ref(ref)
    if not clean_ref:
        raise GitRefError("Invalid ref. Ref cannot be empty.")

    _run_git(
        ["git", "fetch", "--depth", str(depth), "origin", clean_ref],
        cwd=repo,
        timeout=settings.GIT_FETCH_TIMEOUT,
        ref=clean_ref,
    )

    _run_git(
        ["git", "checkout", clean_ref],
        cwd=repo,
        timeout=settings.GIT_CHECKOUT_TIMEOUT,
        ref=clean_ref,
    )

    return clean_ref