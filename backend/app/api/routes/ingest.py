from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.schemas.contracts import EventIngestRequest, FeedbackRequest
from app.services.event_pipeline import event_pipeline_service


router = APIRouter(prefix="", tags=["ingest"])
settings = get_settings()


@router.post("/events/ingest")
async def ingest_event(payload: EventIngestRequest, db: Session = Depends(get_db)):
    try:
        event = event_pipeline_service.ingest_event(db, payload)
        if settings.stream_processing_mode == "synchronous":
            result = await event_pipeline_service.process_pending_event(db, event.id, payload.tenant_slug)
            return {"message": "Event processed synchronously.", "event_id": event.id, "result": result}
        await event_pipeline_service.enqueue(event, payload.tenant_slug)
        return {"message": "Event accepted into the streaming pipeline.", "event_id": event.id}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/feedback")
def submit_feedback(payload: FeedbackRequest, db: Session = Depends(get_db)):
    try:
        event_pipeline_service.submit_feedback(
            db,
            tenant_slug=payload.tenant_slug,
            user_email=payload.user_email,
            model_area=payload.model_area,
            signal=payload.signal,
            note=payload.note,
        )
        return {"message": "Feedback captured for continuous learning simulation."}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
