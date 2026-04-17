from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models import Alert, AttackTimeline, Event, RiskSnapshot, Tenant, ThreatIntelItem, User
from app.schemas.contracts import AlertResponse, AttackTimelineResponse, DashboardOverview, LiveFeedItem, TimelineStep, UserRiskRow
from app.services.cache import dashboard_cache


class DashboardService:
    def get_overview(self, db: Session, tenant_slug: str) -> DashboardOverview:
        cache_key = f"overview:{tenant_slug}"
        cached = dashboard_cache.get(cache_key)
        if cached:
            return DashboardOverview.model_validate(cached)

        tenant = db.scalar(select(Tenant).where(Tenant.slug == tenant_slug))
        if not tenant:
            raise ValueError(f"Unknown tenant: {tenant_slug}")

        users = db.scalars(select(User).where(User.tenant_id == tenant.id)).all()
        alerts = db.scalars(
            select(Alert).where(Alert.tenant_id == tenant.id).order_by(desc(Alert.created_at)).limit(8)
        ).all()
        events = db.scalars(
            select(Event).where(Event.tenant_id == tenant.id).order_by(desc(Event.created_at)).limit(120)
        ).all()
        risks = db.scalars(
            select(RiskSnapshot).where(RiskSnapshot.tenant_id == tenant.id).order_by(desc(RiskSnapshot.created_at)).limit(120)
        ).all()

        latest_by_user: dict[str, RiskSnapshot] = {}
        for risk in risks:
            latest_by_user.setdefault(risk.user_id, risk)

        global_risk = round(sum(risk.score for risk in latest_by_user.values()) / max(1, len(latest_by_user)), 2)
        risk_delta = round(sum(risk.delta for risk in list(latest_by_user.values())[:6]) / max(1, min(6, len(latest_by_user))), 2)

        trend_buckets: dict[str, list[float]] = defaultdict(list)
        for risk in risks[:36]:
            label = risk.created_at.strftime("%H:%M")
            trend_buckets[label].append(risk.score)
        risk_trend = [{"time": key, "score": round(sum(values) / len(values), 2)} for key, values in list(trend_buckets.items())[::-1]]

        activity_counts = Counter(event.event_type.replace("_", " ").title() for event in events[:48])
        activity_distribution = [{"category": key, "count": value} for key, value in activity_counts.items()]

        alert_counts = Counter(alert.category.replace("-", " ").title() for alert in alerts)
        threat_categories = [{"category": key, "count": value} for key, value in alert_counts.items()]

        heatmap_counts: dict[tuple[int, str], int] = defaultdict(int)
        for event in events:
            heatmap_counts[(event.created_at.weekday(), f"{event.created_at.hour:02d}:00")] += 1
        activity_heatmap = [
            {"day": day, "hour": hour, "value": count}
            for (day, hour), count in sorted(heatmap_counts.items(), key=lambda item: (item[0][0], item[0][1]))
        ]

        live_feed = [
            LiveFeedItem(
                kind="alert",
                title=alert.title,
                severity=alert.severity,
                timestamp=alert.created_at,
                payload={"description": alert.description, "confidence": alert.confidence},
            )
            for alert in alerts
        ]

        insights = []
        for risk in list(latest_by_user.values())[:4]:
            user = next((candidate for candidate in users if candidate.id == risk.user_id), None)
            if not user:
                continue
            insights.append(
                {
                    "title": f"{user.full_name} requires adaptive verification",
                    "severity": risk.severity,
                    "summary": risk.rationale.get("top_signal", "Risk drift detected."),
                    "score": risk.score,
                }
            )

        payload = DashboardOverview(
            tenant={"name": tenant.name, "slug": tenant.slug, "sector": tenant.sector},
            global_risk_score=global_risk,
            risk_delta=risk_delta,
            risk_trend=risk_trend[:10],
            activity_distribution=activity_distribution,
            threat_categories=threat_categories,
            activity_heatmap=activity_heatmap[:80],
            live_feed=live_feed,
            alerts_summary={
                "critical": sum(1 for alert in alerts if alert.severity == "critical"),
                "high": sum(1 for alert in alerts if alert.severity == "high"),
                "medium": sum(1 for alert in alerts if alert.severity == "medium"),
                "low": sum(1 for alert in alerts if alert.severity == "low"),
            },
            zero_trust={
                "mode": "Strict" if tenant.zero_trust_mode else "Adaptive",
                "verification_success_rate": 97 if tenant.slug == "sentinel-bank" else 94,
                "policy_challenges": sum(1 for event in events[:24] if event.verification_state != "verified"),
            },
            ai_insights=insights,
        )
        dashboard_cache.set(cache_key, payload.model_dump(mode="json"))
        return payload

    def get_alerts(self, db: Session, tenant_slug: str) -> list[AlertResponse]:
        tenant = db.scalar(select(Tenant).where(Tenant.slug == tenant_slug))
        if not tenant:
            raise ValueError(f"Unknown tenant: {tenant_slug}")
        alerts = db.scalars(select(Alert).where(Alert.tenant_id == tenant.id).order_by(desc(Alert.created_at)).limit(20)).all()
        users = {user.id: user for user in db.scalars(select(User).where(User.tenant_id == tenant.id)).all()}
        return [
            AlertResponse(
                id=alert.id,
                title=alert.title,
                description=alert.description,
                severity=alert.severity,
                category=alert.category,
                status=alert.status,
                confidence=alert.confidence,
                detection_source=alert.detection_source,
                explanation=alert.explanation,
                created_at=alert.created_at,
                user_name=users[alert.user_id].full_name,
                user_email=users[alert.user_id].email,
            )
            for alert in alerts
            if alert.user_id in users
        ]

    def get_user_risk_rankings(self, db: Session, tenant_slug: str) -> list[UserRiskRow]:
        tenant = db.scalar(select(Tenant).where(Tenant.slug == tenant_slug))
        if not tenant:
            raise ValueError(f"Unknown tenant: {tenant_slug}")
        users = db.scalars(select(User).where(User.tenant_id == tenant.id)).all()
        rows: list[UserRiskRow] = []
        for user in users:
            latest_risk = db.scalar(
                select(RiskSnapshot).where(RiskSnapshot.user_id == user.id).order_by(desc(RiskSnapshot.created_at)).limit(1)
            )
            latest_event = db.scalar(select(Event).where(Event.user_id == user.id).order_by(desc(Event.created_at)).limit(1))
            if not latest_risk or not latest_event:
                continue
            rows.append(
                UserRiskRow(
                    user_id=user.id,
                    full_name=user.full_name,
                    email=user.email,
                    role=user.role,
                    department=user.department,
                    risk_score=latest_risk.score,
                    delta=latest_risk.delta,
                    severity=latest_risk.severity,
                    fingerprint=user.fingerprint,
                    last_event_type=latest_event.event_type.replace("_", " ").title(),
                    last_seen_at=latest_event.created_at,
                    top_signal=latest_risk.rationale.get("top_signal", "Risk baseline updated"),
                )
            )
        return sorted(rows, key=lambda row: row.risk_score, reverse=True)

    def get_timelines(self, db: Session, tenant_slug: str) -> list[AttackTimelineResponse]:
        tenant = db.scalar(select(Tenant).where(Tenant.slug == tenant_slug))
        if not tenant:
            raise ValueError(f"Unknown tenant: {tenant_slug}")
        timelines = db.scalars(
            select(AttackTimeline).where(AttackTimeline.tenant_id == tenant.id).order_by(desc(AttackTimeline.last_updated_at)).limit(8)
        ).all()
        return [
            AttackTimelineResponse(
                id=timeline.id,
                title=timeline.title,
                description=timeline.description,
                current_stage=timeline.current_stage,
                steps=[
                    TimelineStep(
                        id=step["id"],
                        label=step["label"],
                        stage=step["stage"],
                        timestamp=datetime.fromisoformat(step["timestamp"]),
                        severity=step["severity"],
                        detail=step["detail"],
                        actor=step["actor"],
                    )
                    for step in timeline.replay_steps
                ],
                started_at=timeline.started_at,
                last_updated_at=timeline.last_updated_at,
            )
            for timeline in timelines
        ]

    def get_threat_intel(self, db: Session, tenant_slug: str) -> list[dict]:
        tenant = db.scalar(select(Tenant).where(Tenant.slug == tenant_slug))
        if not tenant:
            raise ValueError(f"Unknown tenant: {tenant_slug}")
        items = db.scalars(
            select(ThreatIntelItem)
            .where((ThreatIntelItem.tenant_id.is_(None)) | (ThreatIntelItem.tenant_id == tenant.id))
            .order_by(desc(ThreatIntelItem.created_at))
            .limit(10)
        ).all()
        return [
            {
                "indicator": item.indicator,
                "category": item.category,
                "confidence": item.confidence,
                "summary": item.summary,
                "created_at": item.created_at,
            }
            for item in items
        ]


dashboard_service = DashboardService()
