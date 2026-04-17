# SentraCore XDR Handover Manual

## Recommended operator flow

1. Run `Setup SentraCore XDR.cmd`
2. Run `Launch SentraCore XDR.cmd`
3. Open the SOC dashboard at `http://127.0.0.1:5173`

## Included product surfaces

- SOC dashboard
- AI engine
- API gateway
- downloader website
- Windows setup and launcher
- Vercel release flow

## Core security features

- phishing detection with TF-IDF, logistic regression, boosting, and domain similarity checks
- behavioral anomaly detection with Isolation Forest
- sequence-aware attack detection
- weighted risk fusion
- explainable AI outputs
- attack replay timeline
- deception and decoy workflows

## Production recommendation

For a persistent public deployment, attach:

- PostgreSQL
- Redis
- Vercel or another public hosting layer

## Release files

- `Setup SentraCore XDR.cmd`
- `Launch SentraCore XDR.cmd`
- `Release SentraCore XDR to Vercel.cmd`
- `downloader-site/`
