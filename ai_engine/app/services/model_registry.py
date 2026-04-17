from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.ml.pipelines import BehaviorAnomalyPipeline, PhishingDetectionPipeline, SequenceAttackPipeline
from app.services.risk_fusion import risk_fusion_engine

settings = get_settings()


class ModelRegistry:
    def __init__(self) -> None:
        self.phishing = PhishingDetectionPipeline()
        self.behavior = BehaviorAnomalyPipeline()
        self.sequence = SequenceAttackPipeline()
        self.metrics: dict[str, Any] = {}
        self.shap_enabled = False

    def train_all(self) -> dict[str, Any]:
        artifact_dir = Path(settings.artifact_dir)
        artifact_dir.mkdir(parents=True, exist_ok=True)
        self.metrics = {
            "phishing": self.phishing.train(),
            "behavior": self.behavior.train(),
            "sequence": self.sequence.train(),
        }
        self.metrics["explainability"] = {"shap_enabled": self._detect_shap()}
        (artifact_dir / "training_manifest.json").write_text(json.dumps(self.metrics, indent=2), encoding="utf-8")
        return self.metrics

    def _detect_shap(self) -> bool:
        if not settings.enable_optional_shap:
            self.shap_enabled = False
            return False
        try:
            import shap  # noqa: F401

            self.shap_enabled = True
            return True
        except Exception:
            self.shap_enabled = False
            return False

    def analyze_event(self, payload: dict[str, Any]) -> dict[str, Any]:
        event = payload["event"]
        user_context = payload["user_context"]
        recent_events = payload.get("recent_events", [])
        threat_indicators = payload.get("threat_indicators", [])
        phishing = self.phishing.score(event | {"metadata": event.get("metadata", {})})
        behavior = self.behavior.score(user_context, event)
        sequence = self.sequence.score(recent_events, event)
        risk = risk_fusion_engine.fuse(
            event=event,
            user_context=user_context,
            phishing=phishing,
            behavior=behavior,
            sequence=sequence,
            threat_hits=threat_indicators,
        )
        explanation_summary = self._build_executive_summary(phishing, behavior, sequence, risk)
        return {
            "phishing": phishing,
            "behavior": behavior,
            "sequence": sequence,
            "risk": risk,
            "explainability": {
                "summary": explanation_summary,
                "shap_enabled": self.shap_enabled,
                "recommended_action": self._recommend_action(risk["severity"], event.get("event_type", "")),
            },
        }

    def _build_executive_summary(self, phishing: dict, behavior: dict, sequence: dict, risk: dict) -> str:
        signals = [
            phishing["explanation"][0],
            behavior["explanation"][0],
            sequence["explanation"][0],
        ]
        return f"Risk {risk['severity']}: " + " ".join(signal for signal in signals if signal)

    def _recommend_action(self, severity: str, event_type: str) -> str:
        if severity == "critical":
            return f"Isolate the session, revoke active tokens, and trigger incident response for {event_type}."
        if severity == "high":
            return f"Step up identity verification, review affected assets, and open a high-priority investigation for {event_type}."
        if severity == "medium":
            return f"Challenge the user with adaptive verification and monitor follow-on activity related to {event_type}."
        return f"Retain telemetry for {event_type} and continue behavioral observation."


model_registry = ModelRegistry()
