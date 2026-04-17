from __future__ import annotations


class RiskFusionEngine:
    def fuse(
        self,
        *,
        event: dict,
        user_context: dict,
        phishing: dict,
        behavior: dict,
        sequence: dict,
        threat_hits: list[dict],
    ) -> dict:
        role_weight = 1.15 if user_context.get("role") in {"Finance Director", "Research Lead", "Legal Counsel"} else 1.0
        event_type = event.get("event_type", "")
        dynamic_weights = {"phishing": 0.33, "behavior": 0.31, "sequence": 0.24, "context": 0.12}
        if event_type in {"phishing_email", "credential_submit"}:
            dynamic_weights["phishing"] = 0.42
            dynamic_weights["behavior"] = 0.26
        if event_type in {"data_exfiltration", "decoy_access"}:
            dynamic_weights["behavior"] = 0.36
            dynamic_weights["sequence"] = 0.3

        context_score = 0.18
        factors = []
        metadata = event.get("metadata", {})

        if event.get("verification_state") == "challenged":
            context_score += 0.18
            factors.append("Zero Trust challenge triggered because trust posture changed mid-session.")
        if metadata.get("transfer_mb", 0) > 300:
            context_score += 0.21
            factors.append("Large outbound transfer suggests potential data exfiltration.")
        if event_type == "data_exfiltration":
            context_score += 0.24
            factors.append("Late-stage exfiltration event materially increases incident confidence.")
        if event_type == "credential_submit":
            context_score += 0.2
            factors.append("Credential submission on a suspicious path indicates active compromise.")
        if event_type == "privilege_escalation":
            context_score += 0.17
            factors.append("Privilege elevation after trust drift suggests attack progression.")
        if metadata.get("file_name") == "sentracore-decoy-finance.xlsx" or event_type == "decoy_access":
            context_score += 0.32
            factors.append("Decoy asset access indicates high-confidence adversarial intent.")
        if any(hit.get("indicator") in str(metadata) or hit.get("indicator") == event.get("source_ip") for hit in threat_hits):
            context_score += 0.18
            factors.append("Threat intelligence enrichment matched the event against known malicious infrastructure.")
        if metadata.get("login_hour", 9) in {1, 2, 3, 22, 23}:
            context_score += 0.12
            factors.append("Activity occurred outside the user's historical login window.")

        fused = (
            phishing["score"] * dynamic_weights["phishing"]
            + behavior["score"] * dynamic_weights["behavior"]
            + sequence["score"] * dynamic_weights["sequence"]
            + min(context_score, 1.0) * dynamic_weights["context"]
        ) * role_weight
        risk_score = round(min(99.0, max(3.0, fused * 100)), 2)

        floors = {
            "decoy_access": 84.0,
            "data_exfiltration": 78.0,
            "credential_submit": 68.0,
            "privilege_escalation": 62.0,
            "phishing_email": 48.0,
        }
        floor = floors.get(event_type, 0.0)
        if event.get("verification_state") == "challenged":
            floor += 4.0
        if any(hit.get("indicator") in str(metadata) or hit.get("indicator") == event.get("source_ip") for hit in threat_hits):
            floor += 4.0
        risk_score = round(min(99.0, max(risk_score, floor)), 2)
        severity = "critical" if risk_score >= 86 else "high" if risk_score >= 68 else "medium" if risk_score >= 42 else "low"

        if not factors:
            factors.append("Risk remains moderated by stable identity verification and normal activity cadence.")
        return {"score": risk_score, "severity": severity, "factors": factors[:4]}


risk_fusion_engine = RiskFusionEngine()
