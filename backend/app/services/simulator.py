from __future__ import annotations

import asyncio
import random
from datetime import datetime

from sqlalchemy import select

from app.core.time import utc_now
from app.models import DecoyAsset, Tenant, User
from app.core.config import get_settings
from app.schemas.contracts import EventIngestRequest, SimulationRequest
from app.services.event_pipeline import event_pipeline_service

settings = get_settings()


class DemoAttackSimulator:
    def __init__(self) -> None:
        self._scenarios = [
            "phishing_campaign",
            "credential_takeover",
            "insider_exfiltration",
            "decoy_tripwire",
        ]

    def build_sequence(self, scenario: str) -> list[dict]:
        if scenario == "phishing_campaign":
            return [
                {
                    "event_type": "phishing_email",
                    "severity": "high",
                    "stage": "pre-attack",
                    "summary": "Spoofed finance email bypassed mailbox trust controls.",
                    "metadata": {"url": "https://payrnents-portal.com/secure-login", "subject": "Urgent payroll verification", "sender_domain": "payrnents-portal.com", "login_hour": 8},
                },
                {
                    "event_type": "credential_submit",
                    "severity": "critical",
                    "stage": "during-attack",
                    "summary": "Credentials submitted to deceptive sign-in form.",
                    "metadata": {"url": "https://payrnents-portal.com/secure-login", "login_hour": 2, "session_duration_minutes": 4},
                },
            ]
        if scenario == "credential_takeover":
            return [
                {
                    "event_type": "login_success",
                    "severity": "medium",
                    "stage": "during-attack",
                    "summary": "Login observed from new geography and fingerprint.",
                    "metadata": {"login_hour": 3, "failed_auths": 2},
                },
                {
                    "event_type": "privilege_escalation",
                    "severity": "high",
                    "stage": "during-attack",
                    "summary": "Zero trust challenge bypassed during privilege request.",
                    "metadata": {"command_count": 3, "mfa_strength": "weakened"},
                },
                {
                    "event_type": "file_access",
                    "severity": "high",
                    "stage": "during-attack",
                    "summary": "Sensitive repository accessed following privilege expansion.",
                    "metadata": {"file_name": "engineering-roadmap-confidential.pdf", "sensitive_access_ratio": 0.88},
                },
            ]
        if scenario == "insider_exfiltration":
            return [
                {
                    "event_type": "file_access",
                    "severity": "medium",
                    "stage": "pre-attack",
                    "summary": "Unusual volume of confidential file previews started.",
                    "metadata": {"file_name": "clinical-trial-vault.zip", "file_interactions": 11},
                },
                {
                    "event_type": "command_exec",
                    "severity": "high",
                    "stage": "during-attack",
                    "summary": "Archival tooling executed outside normal maintenance window.",
                    "metadata": {"commands": ["7z a archive-export", "rclone sync"], "command_count": 4},
                },
                {
                    "event_type": "data_exfiltration",
                    "severity": "critical",
                    "stage": "post-attack",
                    "summary": "Outbound transfer spike triggered insider threat analytics.",
                    "metadata": {"transfer_mb": 920, "destination": "unknown-cloud-bucket"},
                },
            ]
        return [
            {
                "event_type": "decoy_access",
                "severity": "critical",
                "stage": "during-attack",
                "summary": "Decoy asset access confirms malicious reconnaissance.",
                "metadata": {"file_name": "sentracore-decoy-finance.xlsx", "tripwire": True},
            },
            {
                "event_type": "command_exec",
                "severity": "high",
                "stage": "during-attack",
                "summary": "Reconnaissance commands followed the decoy interaction.",
                "metadata": {"commands": ["dir /s", "type finance"], "command_count": 2},
            },
        ]

    async def run_loop(self, session_factory, interval_seconds: int) -> None:
        while True:
            try:
                with session_factory() as db:
                    tenant = db.scalar(select(Tenant).where(Tenant.slug == "sentinel-bank"))
                    if tenant:
                        user = random.choice(db.scalars(select(User).where(User.tenant_id == tenant.id)).all())
                        scenario = random.choice(self._scenarios)
                        await self.execute_simulation(
                            db,
                            SimulationRequest(tenant_slug=tenant.slug, scenario=scenario, target_email=user.email),
                        )
            except Exception:
                pass
            await asyncio.sleep(interval_seconds)

    async def execute_simulation(self, db, request: SimulationRequest) -> dict:
        tenant = db.scalar(select(Tenant).where(Tenant.slug == request.tenant_slug))
        if not tenant:
            raise ValueError(f"Unknown tenant slug '{request.tenant_slug}'")
        if request.target_email:
            user = db.scalar(select(User).where(User.tenant_id == tenant.id, User.email == request.target_email))
        else:
            user = random.choice(db.scalars(select(User).where(User.tenant_id == tenant.id)).all())
        if not user:
            raise ValueError("Simulation target user not found.")

        sequence = self.build_sequence(request.scenario)
        outputs = []
        for step in sequence:
            if step["event_type"] == "decoy_access":
                decoy = db.scalar(select(DecoyAsset).where(DecoyAsset.tenant_id == tenant.id).limit(1))
                if decoy:
                    decoy.triggered_count += 1
                    decoy.last_triggered_at = utc_now()
            event = event_pipeline_service.ingest_event(
                db,
                EventIngestRequest(
                    tenant_slug=tenant.slug,
                    user_email=user.email,
                    event_type=step["event_type"],
                    severity=step["severity"],
                    attack_stage=step["stage"],
                    source="attack-simulation-engine",
                    source_ip="185.44.22.91" if step["event_type"] != "decoy_access" else "10.1.9.44",
                    geo="Frankfurt, DE" if step["event_type"] in {"phishing_email", "credential_submit"} else "Bengaluru, IN",
                    verification_state="challenged" if step["severity"] in {"high", "critical"} else "verified",
                    summary=step["summary"],
                    metadata=step["metadata"],
                ),
            )
            outputs.append(event.id)
            if settings.stream_processing_mode == "synchronous":
                await event_pipeline_service.process_pending_event(db, event.id, tenant.slug)
            else:
                await event_pipeline_service.enqueue(event, tenant.slug)
        return {"scenario": request.scenario, "events_created": outputs, "target": user.email}


demo_attack_simulator = DemoAttackSimulator()
