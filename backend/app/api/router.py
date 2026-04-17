from fastapi import APIRouter

from app.api.routes import alerts, dashboard, ingest, intelligence, settings, simulations, timeline, users


api_router = APIRouter()
api_router.include_router(dashboard.router)
api_router.include_router(alerts.router)
api_router.include_router(users.router)
api_router.include_router(intelligence.router)
api_router.include_router(timeline.router)
api_router.include_router(simulations.router)
api_router.include_router(settings.router)
api_router.include_router(ingest.router)
