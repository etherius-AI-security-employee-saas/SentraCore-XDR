from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AnalyzeEventRequest(BaseModel):
    event: dict[str, Any]
    user_context: dict[str, Any]
    recent_events: list[dict[str, Any]] = Field(default_factory=list)
    threat_indicators: list[dict[str, Any]] = Field(default_factory=list)


class TrainResponse(BaseModel):
    message: str
    metrics: dict[str, Any]
