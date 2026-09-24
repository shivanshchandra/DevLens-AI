import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


def _pick_env_file() -> str | None:
    """
    Choose which env file to load.
    Priority:
    1) ENV_FILE if explicitly set
    2) if ENV=production -> None (use system environment variables directly)
    3) if ENV=docker -> .env.docker
    4) else -> .env.local
    """
    explicit = os.getenv("ENV_FILE")
    if explicit:
        return explicit

    env = os.getenv("ENV", "local").lower()
    if env == "production":
        return None

    filename = ".env.docker" if env == "docker" else ".env.local"

    cwd_candidate = Path.cwd() / filename
    if cwd_candidate.is_file():
        return str(cwd_candidate)

    backend_dir = Path(__file__).resolve().parent.parent.parent
    backend_candidate = backend_dir / filename
    if backend_candidate.is_file():
        return str(backend_candidate)

    if (Path.cwd() / ".env").is_file():
        return str(Path.cwd() / ".env")
    if (backend_dir / ".env").is_file():
        return str(backend_dir / ".env")

    return filename


class Settings(BaseSettings):
    ENV: str = "local"

    DATABASE_URL: str | None = None
    REDIS_URL: str = "redis://localhost:6379/0"

    # GitHub / git scan settings
    GITHUB_TOKEN: str | None = None
    GIT_CLONE_TIMEOUT: int = 300
    GIT_FETCH_TIMEOUT: int = 300
    GIT_CHECKOUT_TIMEOUT: int = 120
    GITHUB_API_TIMEOUT: int = 20

    model_config = SettingsConfigDict(
        env_file=_pick_env_file(),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()