from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes.analysis import router as analysis_router
from app.core.config import get_settings
from app.services.model_registry import model_registry


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    model_registry.train_all()
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Multi-model intelligence engine for SentraCore XDR.",
    lifespan=lifespan,
)
app.include_router(analysis_router)
