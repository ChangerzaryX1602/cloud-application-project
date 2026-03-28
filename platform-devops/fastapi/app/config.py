from __future__ import annotations

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ERPNext connection
    ERPNEXT_URL: str = "http://frontend:8080"           # internal Docker URL
    ERPNEXT_PUBLIC_URL: str = ""                        # public browser-facing URL (e.g. https://erpnext.mysterchat.com)
    ERPNEXT_CLIENT_ID: str = ""
    ERPNEXT_CLIENT_SECRET: str = ""

    # ERPNext API key auth (used as bearer in Authorization header)
    ERPNEXT_API_KEY: str = ""
    ERPNEXT_API_SECRET: str = ""

    # JWT settings
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    # Infrastructure
    REDIS_URL: str = "redis://redis-cache:6379"

    # Webhook HMAC secret (optional – skip verification when empty)
    WEBHOOK_SECRET: str = ""

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    # Misc
    DEBUG: bool = False

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: object) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v  # type: ignore[return-value]


settings = Settings()
