# SentraCore XDR Vercel Release

## Deployable surfaces

SentraCore XDR is prepared as separate deployable units:

1. `ai_engine/`
2. `backend/`
3. `frontend/`
4. `downloader-site/`

## Release steps

1. Run `Login to Vercel.cmd`
2. Run `Release SentraCore XDR to Vercel.cmd`
3. Paste the AI Engine deployment URL when prompted
4. Paste the Gateway deployment URL when prompted
5. Paste the Frontend deployment URL when prompted so backend CORS can be refreshed
6. Let the script redeploy the backend with frontend CORS and then deploy the downloader website

## Important runtime note

The Vercel release path uses adaptive polling on the frontend instead of live WebSocket transport.
This keeps the cloud deployment reliable while preserving the core analyst experience.

## Files involved

- `frontend/vercel.json`
- `backend/vercel.json`
- `ai_engine/vercel.json`
- `downloader-site/vercel.json`
- `scripts/release-vercel.ps1`
