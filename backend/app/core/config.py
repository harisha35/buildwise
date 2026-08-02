from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="BUILDWISE_", extra="ignore")

    environment: str = "development"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/buildwise"

    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    storage_dir: str = "./storage_data"

    timezone: str = "Asia/Kolkata"

    cors_origins: list[str] = ["http://localhost:3000"]

    auth_rate_limit_attempts: int = 10
    auth_rate_limit_window_seconds: int = 60

    frontend_base_url: str = "http://localhost:3000"

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str = "no-reply@buildwise.local"
    smtp_use_tls: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
