from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Required, no default: app must fail to boot if unset (fail-closed, Section 5.2).
    device_token_signing_key: str

    database_path: str = "data/netprofit.db"
    api_v1_prefix: str = "/api/v1"
    server_port: int = 8001
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8001"]


settings = Settings()
