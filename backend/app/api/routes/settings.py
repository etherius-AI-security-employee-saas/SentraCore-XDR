from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models import Tenant


router = APIRouter(prefix="/settings", tags=["settings"])
settings = get_settings()


@router.get("")
def get_settings_snapshot(db: Session = Depends(get_db)):
    tenants = db.scalars(select(Tenant)).all()
    return {
        "platform": {
            "name": settings.app_name,
            "environment": settings.environment,
            "ai_engine_url": settings.ai_engine_url,
            "default_tenant_slug": settings.default_tenant_slug,
        },
        "tenants": [
            {
                "name": tenant.name,
                "slug": tenant.slug,
                "sector": tenant.sector,
                "zero_trust_mode": tenant.zero_trust_mode,
            }
            for tenant in tenants
        ],
        "rbac": [
            {"role": "SOC Analyst", "permissions": ["read_alerts", "triage", "launch_replay"]},
            {"role": "Security Admin", "permissions": ["manage_policies", "tenant_admin", "review_feedback"]},
            {"role": "Executive", "permissions": ["view_risk_posture", "view_incident_summaries"]},
        ],
        "streaming": {"mode": "websocket", "demo_streaming_enabled": settings.demo_streaming_enabled},
    }
