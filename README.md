# SentraCore XDR

SentraCore XDR is a premium cybersecurity platform focused on the human attack surface: phishing, credential theft, suspicious behavior, insider misuse, attack replay, and explainable AI-driven response.

## Confidence Release

SentraCore XDR is presented as a polished, premium security console with:

- immersive Etherius-branded download experience
- one-command local setup and auto-launch
- premium SOC-style GUI
- risk scoring, alerts, threat intelligence, and replay views
- guided demo simulations for fast product testing

Official release surfaces:

- [Etherius product page](https://etherius-security-site.vercel.app/sentracore)
- [Etherius download hub](https://etherius-security-site.vercel.app/download#sentracore)
- [Standalone downloader website](https://downloader-site-three.vercel.app)

## Live launch links

- [Etherius product page](https://etherius-security-site.vercel.app/sentracore)
- [Etherius download hub](https://etherius-security-site.vercel.app/download#sentracore)
- [Standalone download site](https://downloader-site-three.vercel.app)

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
- [Dashboard tutorial](docs/dashboard-tutorial.md)
- [Manager and employee guide](docs/manager-employee-guide.md)
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
