from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Glow Clothings API"
    environment: str = "development"
    cors_origins: str = "http://localhost:3000"
    database_url: str
    supabase_url: str
    supabase_jwt_secret: str | None = None
    supabase_jwks_url: str | None = None
    auth_required: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
