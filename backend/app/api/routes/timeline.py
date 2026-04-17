from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.dashboard_service import dashboard_service


router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("")
def get_timelines(tenant_slug: str, db: Session = Depends(get_db)):
    try:
        return dashboard_service.get_timelines(db, tenant_slug)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
