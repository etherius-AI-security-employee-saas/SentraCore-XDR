from __future__ import annotations

import random


def build_phishing_dataset(seed: int = 42) -> tuple[list[str], list[dict], list[int]]:
    random.seed(seed)
    benign_templates = [
        ("Quarterly board update", "Please review the attached board pack in the approved workspace.", "portal.company.local", "company.com"),
        ("Benefits enrollment reminder", "Use the employee portal before Friday to confirm benefits.", "okta.com", "company.com"),
        ("Research lab booking", "Confirm next week's lab booking in the internal planner.", "company.local", "novabiotech.com"),
        ("SOC shift handoff", "Ticket notes are available in the internal console.", "sentinelbank.com", "sentinelbank.com"),
    ]
    malicious_templates = [
        ("Urgent payroll verification", "Your salary is on hold. Verify immediately to avoid delay.", "payrnents-portal.com", "company-payroll.com"),
        ("Secure document shared", "An encrypted invoice needs your password reset confirmation.", "m1crosoft-login.net", "sharepoint-secure.com"),
        ("Wire confirmation required", "Finance action is blocked until you approve the transfer.", "bank-secure-alert.com", "wire-safe.co"),
        ("VPN re-authentication", "Your remote access expires in 15 minutes unless you sign in.", "okta-login-check.io", "okta-security.net"),
    ]

    texts: list[str] = []
    features: list[dict] = []
    labels: list[int] = []

    for _ in range(32):
        subject, body, sender_domain, url_domain = random.choice(benign_templates)
        texts.append(f"{subject} {body} {url_domain}")
        features.append(
            {
                "sender_domain": sender_domain,
                "url": f"https://{url_domain}/dashboard",
                "subject": subject,
                "body": body,
            }
        )
        labels.append(0)

    for _ in range(32):
        subject, body, sender_domain, url_domain = random.choice(malicious_templates)
        texts.append(f"{subject} {body} {url_domain}")
        features.append(
            {
                "sender_domain": sender_domain,
                "url": f"https://{url_domain}/secure-login",
                "subject": subject,
                "body": body,
            }
        )
        labels.append(1)

    return texts, features, labels


def build_behavior_dataset(seed: int = 42) -> tuple[list[dict], list[dict]]:
    random.seed(seed + 3)
    roles = {
        "SOC Analyst": {"hour": 10, "session": 85, "access": 22, "files": 11, "cmds": 3, "transfer": 32},
        "Finance Director": {"hour": 9, "session": 55, "access": 12, "files": 7, "cmds": 1, "transfer": 22},
        "Research Lead": {"hour": 11, "session": 70, "access": 18, "files": 14, "cmds": 2, "transfer": 28},
        "Cloud Engineer": {"hour": 13, "session": 92, "access": 25, "files": 9, "cmds": 6, "transfer": 35},
        "Customer Ops": {"hour": 8, "session": 48, "access": 15, "files": 4, "cmds": 1, "transfer": 12},
        "Legal Counsel": {"hour": 10, "session": 60, "access": 10, "files": 8, "cmds": 1, "transfer": 18},
    }
    normal: list[dict] = []
    anomalies: list[dict] = []
    for role, baseline in roles.items():
        for _ in range(48):
            normal.append(
                {
                    "role": role,
                    "login_hour": max(0, min(23, int(random.gauss(baseline["hour"], 1.8)))),
                    "session_duration": max(5, int(random.gauss(baseline["session"], 12))),
                    "access_frequency": max(1, int(random.gauss(baseline["access"], 4))),
                    "file_interactions": max(0, int(random.gauss(baseline["files"], 3))),
                    "command_count": max(0, int(random.gauss(baseline["cmds"], 1.5))),
                    "transfer_mb": max(1, int(random.gauss(baseline["transfer"], 10))),
                    "failed_auths": max(0, int(random.gauss(0.4, 0.7))),
                    "sensitive_access_ratio": round(max(0.02, min(0.95, random.gauss(0.22, 0.08))), 3),
                    "geo_velocity": round(max(0.0, random.gauss(0.08, 0.04)), 3),
                }
            )
        for _ in range(12):
            anomalies.append(
                {
                    "role": role,
                    "login_hour": random.choice([1, 2, 3, 22, 23]),
                    "session_duration": random.randint(5, 190),
                    "access_frequency": random.randint(28, 60),
                    "file_interactions": random.randint(18, 45),
                    "command_count": random.randint(4, 12),
                    "transfer_mb": random.randint(180, 1200),
                    "failed_auths": random.randint(2, 9),
                    "sensitive_access_ratio": round(random.uniform(0.62, 0.98), 3),
                    "geo_velocity": round(random.uniform(0.45, 0.98), 3),
                }
            )
    return normal, anomalies


def build_sequence_dataset() -> tuple[list[list[str]], list[int]]:
    benign = [
        ["login_success", "file_access", "logout"],
        ["login_success", "file_access", "command_exec"],
        ["login_success", "ticket_review", "logout"],
        ["login_success", "file_access", "file_access", "logout"],
        ["login_success", "command_exec", "logout"],
    ]
    malicious = [
        ["phishing_email", "credential_submit", "login_success", "privilege_escalation", "data_exfiltration"],
        ["login_success", "privilege_escalation", "file_access", "data_exfiltration"],
        ["decoy_access", "command_exec", "data_exfiltration"],
        ["phishing_email", "credential_submit", "command_exec"],
        ["login_success", "file_access", "archive_export", "data_exfiltration"],
    ]
    sequences = benign * 12 + malicious * 12
    labels = [0] * (len(benign) * 12) + [1] * (len(malicious) * 12)
    return sequences, labels
