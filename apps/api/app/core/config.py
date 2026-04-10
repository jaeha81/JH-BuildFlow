from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_db_url(url: str, driver: str) -> str:
    """Railway injects postgresql:// — convert to the correct asyncpg/psycopg2 scheme."""
    for prefix in ("postgresql://", "postgres://"):
        if url.startswith(prefix):
            return driver + "://" + url[len(prefix):]
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/interior_platform"
    DATABASE_SYNC_URL: str = "postgresql+psycopg2://postgres:password@localhost:5432/interior_platform"

    # JWT
    SECRET_KEY: str = "change-me-in-production-minimum-32-characters-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    APP_ENV: str = "development"
    APP_PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    # Storage
    STORAGE_BACKEND: str = "local"
    STORAGE_LOCAL_ROOT: str = "./uploads"

    def model_post_init(self, __context: object) -> None:
        # Normalize Railway-injected DATABASE_URL (postgresql:// → driver-prefixed)
        object.__setattr__(
            self,
            "DATABASE_URL",
            _normalize_db_url(self.DATABASE_URL, "postgresql+asyncpg"),
        )
        object.__setattr__(
            self,
            "DATABASE_SYNC_URL",
            _normalize_db_url(self.DATABASE_SYNC_URL, "postgresql+psycopg2"),
        )


settings = Settings()
