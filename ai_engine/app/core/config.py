import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SentraCore XDR AI Engine"
    environment: str = "development"
    host: str = "0.0.0.0"
    port: int = 8001
    artifact_dir: str = "/tmp/sentracore-ai-artifacts" if os.getenv("VERCEL") else str(Path(__file__).resolve().parents[2] / "artifacts")
    random_seed: int = 42
    enable_optional_shap: bool = False
    trusted_domains: str = "sentinelbank.com,novabiotech.com,company.com,company.local,microsoft.com,google.com,okta.com"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
