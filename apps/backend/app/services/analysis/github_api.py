from __future__ import annotations

import json
import urllib.request
import urllib.error
from urllib.parse import urlparse
from typing import Any

from app.core.config import settings
from app.services.analysis.git_utils import normalize_github_repo_url


class GitHubApiError(RuntimeError):
    """Base GitHub API error."""


class GitHubApiNotFoundError(GitHubApiError):
    """Raised when repo or PR is not found."""


class GitHubApiAuthError(GitHubApiError):
    """Raised when auth fails or private repo access is denied."""


class GitHubApiRateLimitError(GitHubApiError):
    """Raised when GitHub API rate limit is hit."""


def _build_headers() -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "devlens-ai",
    }

    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"

    return headers


def _repo_api_base(repo_url: str) -> tuple[str, str]:
    """
    Convert:
      https://github.com/<owner>/<repo>
    into:
      owner, repo
    """
    normalized = normalize_github_repo_url(repo_url)
    parsed = urlparse(normalized)
    parts = parsed.path.strip("/").split("/")
    owner, repo = parts[0], parts[1]
    return owner, repo


def _get_json(url: str) -> Any:
    req = urllib.request.Request(
        url,
        headers=_build_headers(),
        method="GET",
    )

    try:
        with urllib.request.urlopen(req, timeout=settings.GITHUB_API_TIMEOUT) as resp:
            data = resp.read().decode("utf-8")
            return json.loads(data)

    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="ignore")
        except Exception:
            pass

        if e.code == 401 or e.code == 403:
            body_lower = body.lower()
            if "rate limit" in body_lower:
                raise GitHubApiRateLimitError(
                    "GitHub API rate limit exceeded. Add a GITHUB_TOKEN or try again later."
                ) from e
            raise GitHubApiAuthError(
                "GitHub API access denied. The repository may be private or require a valid GITHUB_TOKEN."
            ) from e

        if e.code == 404:
            raise GitHubApiNotFoundError(
                "GitHub repository or pull request was not found."
            ) from e

        raise GitHubApiError(f"GitHub API request failed with status {e.code}.") from e

    except urllib.error.URLError as e:
        raise GitHubApiError("GitHub API request failed due to a network error.") from e

    except Exception as e:
        raise GitHubApiError("Unexpected GitHub API error.") from e


def get_pull_request(repo_url: str, pr_number: int) -> dict:
    """
    Fetch pull request details from GitHub.
    Returns the raw PR JSON.
    """
    owner, repo = _repo_api_base(repo_url)
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"
    return _get_json(url)


def list_pull_request_files(repo_url: str, pr_number: int, max_files: int = 300) -> list[dict]:
    """
    Fetch changed files in a pull request.
    Handles GitHub pagination.
    Returns list of file objects from GitHub API.
    """
    owner, repo = _repo_api_base(repo_url)

    files: list[dict] = []
    page = 1
    per_page = 100

    while len(files) < max_files:
        url = (
            f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/files"
            f"?per_page={per_page}&page={page}"
        )
        batch = _get_json(url)

        if not isinstance(batch, list):
            raise GitHubApiError("Unexpected GitHub API response while fetching PR files.")

        if not batch:
            break

        files.extend(batch)

        if len(batch) < per_page:
            break

        page += 1

    return files[:max_files]


def get_pull_request_context(repo_url: str, pr_number: int) -> dict:
    """
    Convenience helper returning the exact PR context we need for DevLens.
    """
    pr = get_pull_request(repo_url, pr_number)
    files = list_pull_request_files(repo_url, pr_number)

    return {
        "number": pr.get("number"),
        "title": pr.get("title"),
        "state": pr.get("state"),
        "base_ref": ((pr.get("base") or {}).get("ref")),
        "head_ref": ((pr.get("head") or {}).get("ref")),
        "base_sha": ((pr.get("base") or {}).get("sha")),
        "head_sha": ((pr.get("head") or {}).get("sha")),
        "html_url": pr.get("html_url"),
        "changed_files_count": pr.get("changed_files"),
        "files": [
            {
                "filename": f.get("filename"),
                "status": f.get("status"),
                "additions": f.get("additions", 0),
                "deletions": f.get("deletions", 0),
                "changes": f.get("changes", 0),
                "patch": f.get("patch"),
            }
            for f in files
        ],
    }