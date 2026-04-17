# SentraCore XDR Public Install Guide

## Fastest path

1. Download `Setup SentraCore XDR.cmd`
2. Run it to extract the repo into `%USERPROFILE%\SentraCore XDR`
3. Let setup install the dependencies
4. Setup starts the GUI automatically
5. If you close it later, use `Launch SentraCore XDR.cmd`

The GUI opens at `http://127.0.0.1:5173`.

## What you get

- browser-based GUI dashboard
- backend API
- AI engine
- launch and stop scripts
- local logs folder for troubleshooting

## Main features

- risk score dashboard
- critical alert board
- user risk ranking
- threat intelligence surface
- attack replay timeline
- explainable AI insights

## If you want the artifact bundle

Download `SentraCore-XDR-Windows-Starter.zip` for the public install pack that includes:

- setup bootstrap
- launch relay
- stop relay
- Vercel release relay
- Vercel login relay
- installer blueprint
- this setup guide

## Manual installer route

If you prefer a traditional Windows installer package:

1. Install Inno Setup
2. Open `SentraCore-XDR-Setup.iss`
3. Build the installer executable from the script
