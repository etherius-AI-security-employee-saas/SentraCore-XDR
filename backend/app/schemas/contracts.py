from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


SeverityLevel = Literal["low", "medium", "high", "critical"]


class EventIngestRequest(BaseModel):
    tenant_slug: str
    user_email: str
    event_type: str
    source: str = "monitoring-agent"
    severity: SeverityLevel = "low"
    attack_stage: str = "pre-attack"
    source_ip: str = "0.0.0.0"
    device: str = "managed-endpoint"
    geo: str = "Bengaluru, IN"
    verification_state: str = "verified"
    summary: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None


class FeedbackRequest(BaseModel):
    tenant_slug: str
    user_email: Optional[str] = None
    model_area: str
    signal: str
    note: str = ""


class LiveFeedItem(BaseModel):
    kind: str
    title: str
    severity: SeverityLevel = "low"
    timestamp: datetime
    payload: dict[str, Any] = Field(default_factory=dict)


class AlertResponse(BaseModel):
    id: str
    title: str
    description: str
    severity: SeverityLevel
    category: str
    status: str
    confidence: float
    detection_source: str
    explanation: dict[str, Any]
    created_at: datetime
    user_name: str
    user_email: str


class UserRiskRow(BaseModel):
    user_id: str
    full_name: str
    email: str
    role: str
    department: str
    risk_score: float
    delta: float
    severity: SeverityLevel
    fingerprint: str
    last_event_type: str
    last_seen_at: datetime
    top_signal: str


class DashboardOverview(BaseModel):
    tenant: dict[str, Any]
    global_risk_score: float
    risk_delta: float
    risk_trend: list[dict[str, Any]]
    activity_distribution: list[dict[str, Any]]
    threat_categories: list[dict[str, Any]]
    activity_heatmap: list[dict[str, Any]]
    live_feed: list[LiveFeedItem]
    alerts_summary: dict[str, int]
    zero_trust: dict[str, Any]
    ai_insights: list[dict[str, Any]]


class TimelineStep(BaseModel):
    id: str
    label: str
    stage: str
    timestamp: datetime
    severity: SeverityLevel
    detail: str
    actor: str


class AttackTimelineResponse(BaseModel):
    id: str
    title: str
    description: str
    current_stage: str
    steps: list[TimelineStep]
    started_at: datetime
    last_updated_at: datetime


class SimulationRequest(BaseModel):
    tenant_slug: str
    scenario: Literal["phishing_campaign", "credential_takeover", "insider_exfiltration", "decoy_tripwire"]
    target_email: Optional[str] = None
