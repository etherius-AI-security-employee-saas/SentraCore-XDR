from __future__ import annotations

from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class WebSocketManager:
    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, tenant_slug: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[tenant_slug].append(websocket)

    def disconnect(self, tenant_slug: str, websocket: WebSocket) -> None:
        if websocket in self._connections[tenant_slug]:
            self._connections[tenant_slug].remove(websocket)

    async def broadcast(self, tenant_slug: str, message: dict[str, Any]) -> None:
        stale: list[WebSocket] = []
        for socket in self._connections[tenant_slug]:
            try:
                await socket.send_json(message)
            except Exception:
                stale.append(socket)
        for socket in stale:
            self.disconnect(tenant_slug, socket)


manager = WebSocketManager()
