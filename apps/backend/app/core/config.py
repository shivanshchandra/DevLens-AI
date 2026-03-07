import os
from pydantic_settings import BaseSettings, SettingsConfigDict


def _pick_env_file() -> str:
    """
    Choose which env file to load.
    Priority:
    1) ENV_FILE if explicitly set
    2) if ENV=docker -> .env.docker
    3) else -> .env.local
    """
    explicit = os.getenv("ENV_FILE")
    if explicit:
        return explicit

    env = os.getenv("ENV", "local").lower()
    if env == "docker":
        return ".env.docker"
    return ".env.local"


class Settings(BaseSettings):
    ENV: str = "local"

    DATABASE_URL: str | None = None
    REDIS_URL: str = "redis://localhost:6379/0"

    # GitHub / git scan settings
    GITHUB_TOKEN: str | None = None
    GIT_CLONE_TIMEOUT: int = 300
    GIT_FETCH_TIMEOUT: int = 300
    GIT_CHECKOUT_TIMEOUT: int = 120

    model_config = SettingsConfigDict(
        env_file=_pick_env_file(),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()