from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.db.session import SessionLocal, initialize_database
from app.services.event_pipeline import event_pipeline_service
from app.services.simulator import demo_attack_simulator
from app.stream.broker import broker
from app.stream.websocket_manager import manager


settings = get_settings()


async def consume_events() -> None:
    while True:
        message = await broker.consume("events")
        with SessionLocal() as db:
            await event_pipeline_service.process_pending_event(db, message["event_id"], message["tenant_slug"])


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()

    consumer = None
    if settings.stream_processing_mode != "synchronous":
        consumer = asyncio.create_task(consume_events(), name="sentracore-event-consumer")

    simulator = None
    if settings.demo_streaming_enabled and settings.stream_processing_mode != "synchronous":
        simulator = asyncio.create_task(
            demo_attack_simulator.run_loop(SessionLocal, settings.demo_stream_interval_seconds),
            name="sentracore-demo-simulator",
        )
    yield
    if consumer:
        consumer.cancel()
    if simulator:
        simulator.cancel()
    for task in [consumer, simulator]:
        if task:
            try:
                await task
            except asyncio.CancelledError:
                pass


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Enterprise XDR platform for human-centric threat detection, response, and behavioral intelligence.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/health")
def healthcheck():
    return {"status": "ok", "service": "gateway", "environment": settings.environment}


@app.websocket("/ws/live")
async def live_stream(websocket: WebSocket, tenant_slug: str = settings.default_tenant_slug):
    await manager.connect(tenant_slug, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(tenant_slug, websocket)
