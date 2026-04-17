from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings


settings = get_settings()


class AIEngineClient:
    async def analyze(
        self,
        *,
        event: dict[str, Any],
        user_context: dict[str, Any],
        recent_events: list[dict[str, Any]],
        threat_indicators: list[dict[str, Any]],
    ) -> dict[str, Any]:
        payload = {
            "event": event,
            "user_context": user_context,
            "recent_events": recent_events,
            "threat_indicators": threat_indicators,
        }
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.post(f"{settings.ai_engine_url}/v1/analyze/event", json=payload)
                response.raise_for_status()
                return response.json()
        except Exception:
            return self._fallback(payload)

    def _fallback(self, payload: dict[str, Any]) -> dict[str, Any]:
        metadata = payload["event"].get("metadata", {})
        suspicious_keywords = sum(
            1
            for token in ["password", "wire", "urgent", "invoice", "backup", "secret", "exfil"]
            if token in str(metadata).lower()
        )
        behavior_score = min(0.95, 0.25 + suspicious_keywords * 0.12)
        sequence_score = 0.15 + 0.1 * max(0, len(payload.get("recent_events", [])) - 2)
        phishing_score = 0.9 if payload["event"]["event_type"] in {"phishing_email", "credential_submit"} else 0.2
        fused = min(0.98, (phishing_score * 0.4) + (behavior_score * 0.35) + (sequence_score * 0.25))
        severity = "critical" if fused > 0.85 else "high" if fused > 0.68 else "medium" if fused > 0.42 else "low"
        return {
            "phishing": {"score": phishing_score, "explanation": ["Fallback phishing heuristic engaged."]},
            "behavior": {"score": behavior_score, "explanation": ["Fallback behavior model engaged."]},
            "sequence": {
                "score": sequence_score,
                "backend": "heuristic_fallback",
                "explanation": ["Sequence context derived from recent event cadence."],
            },
            "risk": {
                "score": round(fused * 100, 2),
                "severity": severity,
                "factors": [
                    "AI engine fallback active",
                    f"Detected {suspicious_keywords} suspicious metadata cues",
                ],
            },
        }


ai_engine_client = AIEngineClient()
