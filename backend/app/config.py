from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Required, no default: app must fail to boot if unset (fail-closed, Section 5.2).
    device_token_signing_key: str = Field(min_length=32)

    database_path: str = "data/netprofit.db"
    # Optional second place for backups, such as a USB drive or a synced folder.
    backup_copy_dir: str | None = None
    api_v1_prefix: str = "/api/v1"
    server_port: int = 8001
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8001"]


settings = Settings()
