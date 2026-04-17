# SentraCore XDR Architecture

## Platform model

SentraCore XDR is structured as a modular SaaS platform:

- `frontend/` for the SOC experience
- `backend/` for orchestration, persistence, and simulations
- `ai_engine/` for model training and inference
- `downloader-site/` for public distribution and setup delivery

## Detection layers

- phishing model stack
- behavioral anomaly analysis
- sequence attack analysis
- weighted risk fusion
- explainability layer

## Operational features

- multi-tenant seeded environments
- simulated attacks
- deception assets
- attack replay timelines
- alert prioritization
- role-aware risk scoring
