from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any


class InMemoryStreamBroker:
    def __init__(self) -> None:
        self._queues: dict[str, asyncio.Queue] = defaultdict(asyncio.Queue)

    async def publish(self, topic: str, payload: dict[str, Any]) -> None:
        await self._queues[topic].put(payload)

    async def consume(self, topic: str) -> dict[str, Any]:
        payload = await self._queues[topic].get()
        self._queues[topic].task_done()
        return payload


broker = InMemoryStreamBroker()
