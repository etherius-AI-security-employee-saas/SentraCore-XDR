from __future__ import annotations

from urllib.parse import urlparse


def levenshtein_distance(left: str, right: str) -> int:
    if left == right:
        return 0
    if not left:
        return len(right)
    if not right:
        return len(left)
    previous = list(range(len(right) + 1))
    for i, left_char in enumerate(left, start=1):
        current = [i]
        for j, right_char in enumerate(right, start=1):
            insertions = previous[j] + 1
            deletions = current[j - 1] + 1
            substitutions = previous[j - 1] + (left_char != right_char)
            current.append(min(insertions, deletions, substitutions))
        previous = current
    return previous[-1]


def domain_similarity(domain: str, trusted_domains: list[str]) -> float:
    candidate = domain.lower().strip()
    if not candidate:
        return 0.0
    distances = [levenshtein_distance(candidate, trusted.lower()) for trusted in trusted_domains]
    closest = min(distances) if distances else len(candidate)
    baseline = max(1, max(len(candidate), max(len(item) for item in trusted_domains)))
    return round(1 - (closest / baseline), 4)


def extract_phishing_features(record: dict, trusted_domains: list[str]) -> list[float]:
    subject = str(record.get("subject", ""))
    body = str(record.get("body", ""))
    url = str(record.get("url", ""))
    sender_domain = str(record.get("sender_domain", ""))
    parsed = urlparse(url if url.startswith("http") else f"https://{url}")
    hostname = parsed.netloc or sender_domain
    suspicious_tokens = sum(token in f"{subject} {body} {url}".lower() for token in ["urgent", "verify", "wire", "password", "secure", "invoice", "mfa", "salary"])
    digit_ratio = sum(ch.isdigit() for ch in hostname) / max(1, len(hostname))
    hyphen_ratio = hostname.count("-") / max(1, len(hostname))
    similarity = domain_similarity(hostname, trusted_domains)
    return [
        len(url),
        len(parsed.path),
        1.0 if parsed.scheme == "https" else 0.0,
        float(suspicious_tokens),
        digit_ratio,
        hyphen_ratio,
        similarity,
        float("@" in url),
        float(hostname.endswith(".ru") or hostname.endswith(".xyz") or hostname.endswith(".io")),
    ]


def extract_behavior_features(record: dict) -> list[float]:
    login_hour = float(record.get("login_hour", 9))
    return [
        login_hour,
        float(record.get("session_duration", record.get("session_duration_minutes", 35))),
        float(record.get("access_frequency", 10)),
        float(record.get("file_interactions", 4)),
        float(record.get("command_count", 0)),
        float(record.get("transfer_mb", 8)),
        float(record.get("failed_auths", 0)),
        float(record.get("sensitive_access_ratio", 0.18)),
        float(record.get("geo_velocity", 0.06)),
        float(1 if record.get("verification_state") == "challenged" else 0),
    ]
