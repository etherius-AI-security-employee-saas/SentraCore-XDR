# SentraCore XDR

SentraCore XDR is a premium cybersecurity SaaS platform built around the human attack surface: phishing, credential theft, insider misuse, adaptive risk, deception triggers, and explainable AI-driven response.

## What is in this repo

- `backend/`
  FastAPI gateway, persistence layer, simulations, alerting, and incident orchestration.
- `ai_engine/`
  Phishing detection, anomaly detection, sequence analysis, and risk fusion.
- `frontend/`
  Premium SOC dashboard for analysts and security operators.
- `downloader-site/`
  Creative public-facing download website with attached setup artifacts.
- `branding/`
  SentraCore logo and visual assets.
- `scripts/`
  One-click setup, launcher, stop, and release flows.

## Fastest local start

```powershell
.\Setup SentraCore XDR.cmd
.\Launch SentraCore XDR.cmd
```

Then open `http://127.0.0.1:5173`.

## Main launchers

- `Setup SentraCore XDR.cmd`
- `Launch SentraCore XDR.cmd`
- `Stop SentraCore XDR.cmd`
- `Login to Vercel.cmd`
- `Release SentraCore XDR to Vercel.cmd`
- `scripts/build-release-assets.ps1`

## Docs

- [User setup](docs/user-setup.md)
- [Handover manual](docs/handover.md)
- [Architecture](docs/architecture.md)
- [API](docs/api.md)
- [Vercel release](docs/vercel-release.md)

## Downloader website

The download surface lives in `downloader-site/` and includes:

- a 4K cyber-themed background
- premium branded presentation
- direct download links for setup and launcher files
- a Windows starter pack zip

## Cloud release

The repo includes Vercel-ready configs for:

- `frontend/`
- `backend/`
- `ai_engine/`
- `downloader-site/`

Use:

```powershell
.\Login to Vercel.cmd
.\Release SentraCore XDR to Vercel.cmd
```
