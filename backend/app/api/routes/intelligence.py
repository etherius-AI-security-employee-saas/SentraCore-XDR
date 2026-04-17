from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.dashboard_service import dashboard_service


router = APIRouter(prefix="/threat-intelligence", tags=["threat-intelligence"])


@router.get("")
def get_threat_intelligence(tenant_slug: str, db: Session = Depends(get_db)):
    try:
        return dashboard_service.get_threat_intel(db, tenant_slug)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
