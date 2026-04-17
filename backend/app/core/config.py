import os
from functools import lru_cache
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SentraCore XDR Gateway"
    environment: str = "development"
    api_prefix: str = "/api/v1"
    host: str = "0.0.0.0"
    port: int = 8000
    database_url: str = "sqlite:////tmp/sentracore_xdr.db" if os.getenv("VERCEL") else "sqlite:///./sentracore_xdr.db"
    redis_url: Optional[str] = None
    ai_engine_url: str = "http://127.0.0.1:8001"
    seed_demo_data: bool = True
    demo_streaming_enabled: bool = False if os.getenv("VERCEL") else True
    demo_stream_interval_seconds: int = 8
    stream_processing_mode: str = "synchronous" if os.getenv("VERCEL") else "streaming"
    cors_origins: List[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )
    default_tenant_slug: str = "sentinel-bank"
    simulated_attack_window_minutes: int = 90

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
