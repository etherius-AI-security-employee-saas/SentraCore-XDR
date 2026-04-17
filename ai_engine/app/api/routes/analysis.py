from fastapi import APIRouter

from app.schemas.contracts import AnalyzeEventRequest, TrainResponse
from app.services.model_registry import model_registry


router = APIRouter(prefix="/v1", tags=["analysis"])


@router.get("/health")
def healthcheck():
    return {"status": "ok", "service": "ai-engine"}


@router.post("/analyze/event")
def analyze_event(payload: AnalyzeEventRequest):
    return model_registry.analyze_event(payload.model_dump())


@router.post("/models/train", response_model=TrainResponse)
def retrain_models():
    metrics = model_registry.train_all()
    return TrainResponse(message="AI pipelines retrained successfully.", metrics=metrics)
