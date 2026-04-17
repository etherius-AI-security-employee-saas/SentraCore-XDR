from __future__ import annotations

from datetime import timedelta
from typing import Any

from app.core.time import utc_now


class DashboardCache:
    def __init__(self) -> None:
        self._store: dict[str, tuple[datetime, dict[str, Any]]] = {}

    def get(self, key: str) -> dict[str, Any] | None:
        entry = self._store.get(key)
        if not entry:
            return None
        expires_at, payload = entry
        if expires_at < utc_now():
            self._store.pop(key, None)
            return None
        return payload

    def set(self, key: str, payload: dict[str, Any], ttl_seconds: int = 12) -> None:
        self._store[key] = (utc_now() + timedelta(seconds=ttl_seconds), payload)

    def invalidate(self, prefix: str) -> None:
        for key in [item for item in self._store if item.startswith(prefix)]:
            self._store.pop(key, None)


dashboard_cache = DashboardCache()
