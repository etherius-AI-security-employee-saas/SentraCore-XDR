from __future__ import annotations

import random
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.models import Alert, AttackTimeline, DecoyAsset, Event, RiskSnapshot, Tenant, ThreatIntelItem, User


def _event_summary(event_type: str) -> str:
    summaries = {
        "login_success": "User authenticated from a managed endpoint.",
        "phishing_email": "Potential phishing lure delivered to user inbox.",
        "credential_submit": "Credential submission observed on deceptive interface.",
        "privilege_escalation": "Privilege scope increased outside baseline.",
        "file_access": "Sensitive asset accessed from endpoint telemetry.",
        "command_exec": "Command shell execution recorded by agent.",
        "data_exfiltration": "Large outbound transfer or abnormal export pattern detected.",
        "decoy_access": "Decoy asset was opened, indicating probable reconnaissance or malicious intent.",
    }
    return summaries.get(event_type, "Behavior monitoring agent recorded a relevant event.")


def seed_demo_data(db: Session) -> None:
    if db.scalar(select(Tenant.id).limit(1)):
        return

    random.seed(42)
    tenants = [
        Tenant(name="Sentinel Bank", slug="sentinel-bank", sector="Financial Services", zero_trust_mode=True, risk_posture="adaptive"),
        Tenant(name="Nova Biotech", slug="nova-biotech", sector="Life Sciences", zero_trust_mode=True, risk_posture="strict"),
    ]
    db.add_all(tenants)
    db.flush()

    user_templates = [
        ("Maya Chen", "maya.chen", "SOC Analyst", "Security", 28.0),
        ("Alex Moreno", "alex.moreno", "Finance Director", "Finance", 34.0),
        ("Priya Natarajan", "priya.n", "Research Lead", "R&D", 31.0),
        ("Ibrahim Yusuf", "ibrahim.y", "Cloud Engineer", "Platform", 25.0),
        ("Sophia Park", "sophia.park", "Customer Ops", "Operations", 22.0),
        ("Daniel Kim", "daniel.kim", "Legal Counsel", "Legal", 24.0),
    ]

    all_users: list[User] = []
    for tenant in tenants:
        for name, alias, role, department, baseline in user_templates:
            user = User(
                tenant_id=tenant.id,
                full_name=name,
                email=f"{alias}@{tenant.slug.replace('-', '')}.com",
                role=role,
                department=department,
                baseline_risk=baseline + random.uniform(-6, 8),
                fingerprint=f"DFP-{tenant.slug[:3].upper()}-{random.randint(1000, 9999)}",
                timezone="Asia/Kolkata" if tenant.slug == "sentinel-bank" else "America/New_York",
            )
            db.add(user)
            all_users.append(user)
    db.flush()

    db.add_all(
        [
            ThreatIntelItem(indicator="185.44.22.91", category="malicious-ip", confidence=0.92, summary="Command-and-control node used in recent credential theft campaigns."),
            ThreatIntelItem(indicator="payrnents-portal.com", category="lookalike-domain", confidence=0.96, summary="Lookalike payroll domain targeting finance users."),
            ThreatIntelItem(indicator="sentracore-decoy-finance.xlsx", category="tripwire", confidence=0.99, summary="Decoy spreadsheet intended to trigger insider threat workflows."),
            ThreatIntelItem(indicator="archive-export", category="tactic", confidence=0.78, summary="Bulk archive export frequently precedes insider data theft."),
        ]
    )

    now = utc_now()
    event_types = [
        ("login_success", "low", "pre-attack"),
        ("file_access", "medium", "during-attack"),
        ("command_exec", "medium", "during-attack"),
        ("phishing_email", "high", "pre-attack"),
        ("credential_submit", "critical", "during-attack"),
        ("data_exfiltration", "critical", "post-attack"),
    ]

    for index, user in enumerate(all_users):
        last_risk = user.baseline_risk
        replay_steps = []
        for offset in range(6):
            event_type, severity, stage = event_types[(index + offset) % len(event_types)]
            created_at = now - timedelta(minutes=(index * 17) + (offset * 13))
            risk_score = min(98.0, last_risk + random.uniform(-4, 18))
            event = Event(
                tenant_id=user.tenant_id,
                user_id=user.id,
                event_type=event_type,
                severity=severity,
                attack_stage=stage,
                source_ip="185.44.22.91" if event_type in {"credential_submit", "data_exfiltration"} else f"10.0.{index}.{offset + 4}",
                device="managed-endpoint" if offset % 2 == 0 else "browser-session",
                geo="Bengaluru, IN" if index % 2 == 0 else "Frankfurt, DE",
                verification_state="challenged" if event_type in {"credential_submit", "data_exfiltration"} else "verified",
                risk_score=risk_score,
                summary=_event_summary(event_type),
                metadata_json={
                    "url": "https://payrnents-portal.com/secure-login" if event_type == "phishing_email" else "https://portal.company.local",
                    "file_name": "sentracore-decoy-finance.xlsx" if event_type == "file_access" and offset == 4 else "quarterly-forecast.xlsx",
                    "commands": ["whoami", "net user", "rclone sync"] if event_type == "command_exec" else [],
                    "session_duration_minutes": 42 + (offset * 8),
                    "login_hour": 2 if event_type == "credential_submit" else 9 + offset,
                    "transfer_mb": 620 if event_type == "data_exfiltration" else 14 + offset,
                },
                created_at=created_at,
            )
            db.add(event)
            replay_steps.append(
                {
                    "id": event.id,
                    "label": event_type.replace("_", " ").title(),
                    "stage": stage,
                    "timestamp": created_at.isoformat(),
                    "severity": severity,
                    "detail": event.summary,
                    "actor": user.full_name,
                }
            )
            delta = risk_score - last_risk
            db.add(
                RiskSnapshot(
                    tenant_id=user.tenant_id,
                    user_id=user.id,
                    score=risk_score,
                    delta=delta,
                    severity="critical" if risk_score > 82 else "high" if risk_score > 67 else "medium" if risk_score > 40 else "low",
                    rationale={
                        "top_signal": "Credential misuse sequence" if risk_score > 70 else "Routine monitored activity",
                        "zero_trust_state": "challenged" if event_type in {"credential_submit", "data_exfiltration"} else "verified",
                    },
                    created_at=created_at,
                )
            )
            if risk_score > 63:
                db.add(
                    Alert(
                        tenant_id=user.tenant_id,
                        user_id=user.id,
                        title=f"{event_type.replace('_', ' ').title()} detected",
                        description=_event_summary(event_type),
                        severity="critical" if risk_score > 82 else "high" if risk_score > 67 else "medium",
                        category="behavioral-intelligence" if event_type != "phishing_email" else "phishing",
                        status="open",
                        confidence=min(0.99, risk_score / 100),
                        detection_source="seeded-intelligence",
                        explanation={
                            "signals": [
                                "Unusual login distribution" if event_type in {"credential_submit", "data_exfiltration"} else "Known benign baseline drift",
                                "Lookalike domain activity" if event_type == "phishing_email" else "Role-aware policy enforcement",
                            ]
                        },
                        created_at=created_at,
                    )
                )
            last_risk = risk_score

        db.add(
            AttackTimeline(
                tenant_id=user.tenant_id,
                user_id=user.id,
                title=f"{user.full_name} attack path",
                description="Sequenced reconstruction of human-centered threat activity across the user journey.",
                current_stage=replay_steps[-1]["stage"],
                replay_steps=replay_steps,
                started_at=datetime.fromisoformat(replay_steps[0]["timestamp"]),
                last_updated_at=datetime.fromisoformat(replay_steps[-1]["timestamp"]),
            )
        )

    for tenant in tenants:
        db.add_all(
            [
                DecoyAsset(
                    tenant_id=tenant.id,
                    name="sentracore-decoy-finance.xlsx",
                    sensitivity="restricted",
                    location=r"\\corp-share\finance\Q4\sentracore-decoy-finance.xlsx",
                    triggered_count=1 if tenant.slug == "sentinel-bank" else 0,
                    last_triggered_at=now - timedelta(minutes=40) if tenant.slug == "sentinel-bank" else None,
                ),
                DecoyAsset(
                    tenant_id=tenant.id,
                    name="M&A-playbook-draft.docx",
                    sensitivity="secret",
                    location=r"\\corp-share\legal\M&A\M&A-playbook-draft.docx",
                    triggered_count=0,
                ),
            ]
        )
    db.commit()
