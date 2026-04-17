from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.models import Alert, AttackTimeline, Event, FeedbackSignal, RiskSnapshot, Tenant, ThreatIntelItem, User
from app.schemas.contracts import EventIngestRequest
from app.services.ai_client import ai_engine_client
from app.services.cache import dashboard_cache
from app.stream.broker import broker
from app.stream.websocket_manager import manager


class EventPipelineService:
    def ingest_event(self, db: Session, payload: EventIngestRequest) -> Event:
        tenant = db.scalar(select(Tenant).where(Tenant.slug == payload.tenant_slug))
        if not tenant:
            raise ValueError(f"Unknown tenant slug '{payload.tenant_slug}'")
        user = db.scalar(select(User).where(User.tenant_id == tenant.id, User.email == payload.user_email))
        if not user:
            raise ValueError(f"Unknown user '{payload.user_email}' for tenant '{payload.tenant_slug}'")

        event = Event(
            tenant_id=tenant.id,
            user_id=user.id,
            event_type=payload.event_type,
            source=payload.source,
            severity=payload.severity,
            attack_stage=payload.attack_stage,
            source_ip=payload.source_ip,
            device=payload.device,
            geo=payload.geo,
            verification_state=payload.verification_state,
            summary=payload.summary or f"{payload.event_type.replace('_', ' ').title()} recorded",
            metadata_json=payload.metadata,
            created_at=payload.created_at or utc_now(),
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    async def enqueue(self, event: Event, tenant_slug: str) -> None:
        await broker.publish("events", {"event_id": event.id, "tenant_slug": tenant_slug})

    async def process_pending_event(self, db: Session, event_id: str, tenant_slug: str) -> dict:
        event = db.scalar(select(Event).where(Event.id == event_id))
        if not event:
            return {"status": "missing", "event_id": event_id}

        user = db.scalar(select(User).where(User.id == event.user_id))
        tenant = db.scalar(select(Tenant).where(Tenant.id == event.tenant_id))
        if not user or not tenant:
            return {"status": "missing-context", "event_id": event_id}

        recent_events = db.scalars(
            select(Event).where(Event.user_id == user.id).order_by(desc(Event.created_at)).limit(6)
        ).all()
        threat_indicators = db.scalars(select(ThreatIntelItem).order_by(desc(ThreatIntelItem.created_at)).limit(12)).all()
        analysis = await ai_engine_client.analyze(
            event={
                "event_type": event.event_type,
                "source": event.source,
                "summary": event.summary,
                "severity": event.severity,
                "attack_stage": event.attack_stage,
                "source_ip": event.source_ip,
                "device": event.device,
                "geo": event.geo,
                "verification_state": event.verification_state,
                "metadata": event.metadata_json,
                "created_at": event.created_at.isoformat(),
            },
            user_context={
                "email": user.email,
                "role": user.role,
                "department": user.department,
                "baseline_risk": user.baseline_risk,
                "fingerprint": user.fingerprint,
                "zero_trust_mode": tenant.zero_trust_mode,
            },
            recent_events=[
                {
                    "event_type": item.event_type,
                    "created_at": item.created_at.isoformat(),
                    "metadata": item.metadata_json,
                    "severity": item.severity,
                }
                for item in recent_events
            ],
            threat_indicators=[
                {"indicator": item.indicator, "category": item.category, "confidence": item.confidence}
                for item in threat_indicators
            ],
        )

        prior_risk = db.scalar(
            select(RiskSnapshot).where(RiskSnapshot.user_id == user.id).order_by(desc(RiskSnapshot.created_at)).limit(1)
        )
        score = float(analysis["risk"]["score"])
        severity = analysis["risk"]["severity"]
        event.risk_score = score
        event.severity = severity
        event.summary = analysis["risk"]["factors"][0] if analysis["risk"]["factors"] else event.summary
        db.add(
            RiskSnapshot(
                tenant_id=tenant.id,
                user_id=user.id,
                score=score,
                delta=score - (prior_risk.score if prior_risk else user.baseline_risk),
                severity=severity,
                rationale={
                    "top_signal": analysis["risk"]["factors"][0] if analysis["risk"]["factors"] else "Risk fusion executed",
                    "behavior": analysis["behavior"]["score"],
                    "sequence": analysis["sequence"]["score"],
                    "phishing": analysis["phishing"]["score"],
                },
                created_at=utc_now(),
            )
        )

        alert = None
        if score >= 58 or event.event_type in {"decoy_access", "data_exfiltration", "credential_submit"}:
            alert = Alert(
                tenant_id=tenant.id,
                user_id=user.id,
                title=f"{event.event_type.replace('_', ' ').title()} risk escalation",
                description=" | ".join(analysis["risk"]["factors"]),
                severity=severity,
                category="phishing" if analysis["phishing"]["score"] > 0.65 else "insider-threat" if event.event_type in {"data_exfiltration", "decoy_access"} else "behavioral-intelligence",
                status="open",
                confidence=round(min(0.99, score / 100), 2),
                detection_source="risk-fusion-engine",
                explanation=analysis,
                created_at=utc_now(),
            )
            db.add(alert)

        timeline = db.scalar(
            select(AttackTimeline).where(AttackTimeline.user_id == user.id).order_by(desc(AttackTimeline.last_updated_at)).limit(1)
        )
        step = {
            "id": event.id,
            "label": event.event_type.replace("_", " ").title(),
            "stage": event.attack_stage,
            "timestamp": event.created_at.isoformat(),
            "severity": severity,
            "detail": analysis["risk"]["factors"][0] if analysis["risk"]["factors"] else event.summary,
            "actor": user.full_name,
        }
        if timeline:
            timeline.replay_steps = [*timeline.replay_steps[-9:], step]
            timeline.current_stage = event.attack_stage
            timeline.last_updated_at = utc_now()
        else:
            timeline = AttackTimeline(
                tenant_id=tenant.id,
                user_id=user.id,
                title=f"{user.full_name} incident replay",
                description="Attack replay mode generated from live telemetry and risk fusion.",
                current_stage=event.attack_stage,
                replay_steps=[step],
                started_at=utc_now(),
                last_updated_at=utc_now(),
            )
            db.add(timeline)

        db.commit()
        dashboard_cache.invalidate(f"overview:{tenant_slug}")

        live_payload = {
            "event": {
                "id": event.id,
                "event_type": event.event_type,
                "risk_score": event.risk_score,
                "severity": event.severity,
                "summary": event.summary,
                "user": user.full_name,
                "timestamp": event.created_at.isoformat(),
            },
            "alert": {
                "id": alert.id,
                "title": alert.title,
                "severity": alert.severity,
                "category": alert.category,
                "confidence": alert.confidence,
                "created_at": alert.created_at.isoformat(),
            }
            if alert
            else None,
            "risk": {"score": score, "severity": severity, "factors": analysis["risk"]["factors"]},
        }
        await manager.broadcast(tenant_slug, {"type": "threat_update", "payload": live_payload})
        return live_payload

    def submit_feedback(self, db: Session, *, tenant_slug: str, user_email: str | None, model_area: str, signal: str, note: str) -> None:
        tenant = db.scalar(select(Tenant).where(Tenant.slug == tenant_slug))
        if not tenant:
            raise ValueError(f"Unknown tenant slug '{tenant_slug}'")
        user_id = None
        if user_email:
            user = db.scalar(select(User).where(User.tenant_id == tenant.id, User.email == user_email))
            user_id = user.id if user else None
        db.add(
            FeedbackSignal(
                tenant_id=tenant.id,
                user_id=user_id,
                model_area=model_area,
                signal=signal,
                note=note,
            )
        )
        db.commit()
        dashboard_cache.invalidate(f"overview:{tenant_slug}")


event_pipeline_service = EventPipelineService()
