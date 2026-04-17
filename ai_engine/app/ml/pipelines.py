from __future__ import annotations

import math
from collections import Counter, defaultdict

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

from app.core.config import get_settings
from app.ml.datasets import build_behavior_dataset, build_phishing_dataset, build_sequence_dataset
from app.ml.features import domain_similarity, extract_behavior_features, extract_phishing_features

settings = get_settings()

try:
    import torch
    import torch.nn as nn
except Exception:  # pragma: no cover - optional acceleration
    torch = None
    nn = None


class PhishingDetectionPipeline:
    def __init__(self) -> None:
        self.vectorizer = TfidfVectorizer(max_features=600, ngram_range=(1, 2), min_df=1)
        self.logistic = LogisticRegression(max_iter=600, random_state=settings.random_seed)
        self.gradient = GradientBoostingClassifier(random_state=settings.random_seed)
        self.trusted_domains = [item.strip() for item in settings.trusted_domains.split(",") if item.strip()]

    def train(self) -> dict:
        texts, records, labels = build_phishing_dataset(settings.random_seed)
        text_matrix = self.vectorizer.fit_transform(texts)
        self.logistic.fit(text_matrix, labels)
        numeric = np.array([extract_phishing_features(record, self.trusted_domains) for record in records])
        self.gradient.fit(numeric, labels)
        return {"samples": len(labels), "trusted_domains": len(self.trusted_domains)}

    def score(self, payload: dict) -> dict:
        subject = str(payload.get("subject") or payload.get("summary") or payload.get("event_type", ""))
        body = str(payload.get("body") or payload.get("summary") or payload.get("metadata", {}))
        url = str(payload.get("url") or payload.get("metadata", {}).get("url", ""))
        sender_domain = str(payload.get("sender_domain") or payload.get("metadata", {}).get("sender_domain", payload.get("source_ip", "")))
        record = {"subject": subject, "body": body, "url": url, "sender_domain": sender_domain}
        text = f"{subject} {body} {url}"
        logistic_score = float(self.logistic.predict_proba(self.vectorizer.transform([text]))[0, 1])
        numeric = np.array([extract_phishing_features(record, self.trusted_domains)])
        gradient_score = float(self.gradient.predict_proba(numeric)[0, 1])
        combined = round((logistic_score * 0.55) + (gradient_score * 0.45), 4)

        domain = url.split("/")[2] if "://" in url else sender_domain
        similarity = domain_similarity(domain, self.trusted_domains)
        explanations = []
        if similarity > 0.72 and domain not in self.trusted_domains:
            explanations.append(f"Lookalike domain '{domain}' is unusually close to trusted brands.")
        if any(token in text.lower() for token in ["urgent", "verify", "wire", "password", "salary", "invoice"]):
            explanations.append("Language profile matches high-pressure social engineering cues.")
        if "@" in url or any(char.isdigit() for char in domain):
            explanations.append("URL composition includes obfuscation patterns common in phishing kits.")
        if not explanations:
            explanations.append("Message resembles routine corporate communication with low spoofing pressure.")

        return {
            "score": combined,
            "baseline_score": round(logistic_score, 4),
            "gradient_score": round(gradient_score, 4),
            "domain_similarity": similarity,
            "explanation": explanations[:3],
        }


class BehaviorAnomalyPipeline:
    def __init__(self) -> None:
        self.model = IsolationForest(contamination=0.12, random_state=settings.random_seed)
        self.role_baselines: dict[str, dict[str, float]] = {}
        self._normal_score_bounds = (0.0, 1.0)

    def train(self) -> dict:
        normal, anomalies = build_behavior_dataset(settings.random_seed)
        training_rows = normal + anomalies[:24]
        matrix = np.array([extract_behavior_features(row) for row in training_rows])
        self.model.fit(matrix)
        normal_scores = -self.model.score_samples(np.array([extract_behavior_features(row) for row in normal]))
        self._normal_score_bounds = (float(normal_scores.min()), float(normal_scores.max()))

        grouped: dict[str, list[dict]] = defaultdict(list)
        for row in normal:
            grouped[row["role"]].append(row)
        self.role_baselines = {
            role: {
                "login_hour": round(sum(item["login_hour"] for item in rows) / len(rows), 2),
                "session_duration": round(sum(item["session_duration"] for item in rows) / len(rows), 2),
                "access_frequency": round(sum(item["access_frequency"] for item in rows) / len(rows), 2),
                "file_interactions": round(sum(item["file_interactions"] for item in rows) / len(rows), 2),
                "command_count": round(sum(item["command_count"] for item in rows) / len(rows), 2),
                "transfer_mb": round(sum(item["transfer_mb"] for item in rows) / len(rows), 2),
            }
            for role, rows in grouped.items()
        }
        return {"normal_samples": len(normal), "anomaly_templates": len(anomalies)}

    def score(self, user_context: dict, event: dict) -> dict:
        metadata = dict(event.get("metadata", {}))
        features = {
            "login_hour": metadata.get("login_hour", 9),
            "session_duration": metadata.get("session_duration_minutes", 30),
            "access_frequency": metadata.get("access_frequency", 10),
            "file_interactions": metadata.get("file_interactions", 3),
            "command_count": metadata.get("command_count", len(metadata.get("commands", []))),
            "transfer_mb": metadata.get("transfer_mb", 12),
            "failed_auths": metadata.get("failed_auths", 0),
            "sensitive_access_ratio": metadata.get("sensitive_access_ratio", 0.18),
            "geo_velocity": metadata.get("geo_velocity", 0.05),
            "verification_state": event.get("verification_state", "verified"),
        }
        vector = np.array([extract_behavior_features(features)])
        raw = float(-self.model.score_samples(vector)[0])
        low, high = self._normal_score_bounds
        scaled = 0.0 if math.isclose(high, low) else (raw - low) / max(0.0001, (high - low))
        score = round(min(0.99, max(0.02, scaled)), 4)

        baseline = self.role_baselines.get(user_context.get("role", ""), {})
        explanations = []
        if baseline:
            if abs(features["login_hour"] - baseline["login_hour"]) >= 5:
                explanations.append("Login occurred outside the user's normal time distribution.")
            if features["file_interactions"] > baseline["file_interactions"] * 2:
                explanations.append("Sensitive file interaction volume exceeded the peer baseline.")
            if features["transfer_mb"] > baseline["transfer_mb"] * 4:
                explanations.append("Outbound transfer magnitude is materially above normal behavior.")
            if features["command_count"] > baseline["command_count"] * 2 + 1:
                explanations.append("Endpoint command execution density is inconsistent with the role baseline.")
        if event.get("verification_state") == "challenged":
            explanations.append("Zero Trust policy required additional verification for this behavior.")
        return {"score": score, "explanation": explanations[:4] or ["Behavior remains within expected operating range."]}


if nn is not None:
    class _LSTMSequenceModel(nn.Module):  # pragma: no cover - optional backend
        def __init__(self, vocab_size: int, embedding_dim: int = 16, hidden_size: int = 32):
            super().__init__()
            self.embedding = nn.Embedding(vocab_size, embedding_dim)
            self.lstm = nn.LSTM(embedding_dim, hidden_size, batch_first=True)
            self.classifier = nn.Linear(hidden_size, 1)

        def forward(self, tokens):
            embedded = self.embedding(tokens)
            _, (hidden, _) = self.lstm(embedded)
            return self.classifier(hidden[-1]).squeeze(-1)
else:
    _LSTMSequenceModel = None


class SequenceAttackPipeline:
    def __init__(self) -> None:
        self.event_to_id = {"<pad>": 0}
        self.transition_risk: dict[tuple[str, str], float] = defaultdict(float)
        self.backend = "transition-risk"
        self.model = None

    def train(self) -> dict:
        sequences, labels = build_sequence_dataset()
        for sequence in sequences:
            for event in sequence:
                self.event_to_id.setdefault(event, len(self.event_to_id))

        malicious_pairs = Counter()
        benign_pairs = Counter()
        for sequence, label in zip(sequences, labels):
            for left, right in zip(sequence, sequence[1:]):
                if label == 1:
                    malicious_pairs[(left, right)] += 1
                else:
                    benign_pairs[(left, right)] += 1
        for pair, count in malicious_pairs.items():
            self.transition_risk[pair] = count / max(1, count + benign_pairs[pair])

        if torch and nn:
            try:
                self.model = self._train_torch_model(sequences, labels)
                self.backend = "pytorch-lstm"
            except Exception:
                self.model = None
                self.backend = "transition-risk"
        return {"sequences": len(sequences), "backend": self.backend}

    def _train_torch_model(self, sequences: list[list[str]], labels: list[int]):  # pragma: no cover - optional backend
        max_len = max(len(sequence) for sequence in sequences)
        encoded = []
        for sequence in sequences:
            tokens = [self.event_to_id[item] for item in sequence]
            tokens += [0] * (max_len - len(tokens))
            encoded.append(tokens)
        x = torch.tensor(encoded, dtype=torch.long)
        y = torch.tensor(labels, dtype=torch.float32)
        model = _LSTMSequenceModel(vocab_size=len(self.event_to_id))
        optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
        loss_fn = nn.BCEWithLogitsLoss()
        model.train()
        for _ in range(25):
            optimizer.zero_grad()
            logits = model(x)
            loss = loss_fn(logits, y)
            loss.backward()
            optimizer.step()
        return model

    def score(self, recent_events: list[dict], current_event: dict) -> dict:
        sequence = [item.get("event_type", "") for item in reversed(recent_events[-5:])] + [current_event.get("event_type", "")]
        explanations = []
        if self.backend == "pytorch-lstm" and self.model is not None and torch is not None:
            tokens = [self.event_to_id.get(item, 0) for item in sequence]
            max_len = max(6, len(tokens))
            tokens += [0] * (max_len - len(tokens))
            with torch.no_grad():
                logit = self.model(torch.tensor([tokens], dtype=torch.long))
                probability = float(torch.sigmoid(logit)[0])
            score = round(probability, 4)
            explanations.append("PyTorch LSTM detected a suspicious multi-step attack trajectory.")
        else:
            risk = 0.18
            for left, right in zip(sequence, sequence[1:]):
                risk += self.transition_risk.get((left, right), 0.02)
            score = round(min(0.98, risk / max(1, len(sequence))), 4)
            explanations.append("Sequence risk estimated from malicious transition density across recent activity.")

        if {"credential_submit", "privilege_escalation", "data_exfiltration"}.issubset(set(sequence)):
            explanations.append("Observed path matches a canonical credential takeover to exfiltration chain.")
        if "decoy_access" in sequence:
            explanations.append("Decoy interaction materially raises confidence in hostile intent.")
        return {"score": score, "backend": self.backend, "explanation": explanations[:3]}
