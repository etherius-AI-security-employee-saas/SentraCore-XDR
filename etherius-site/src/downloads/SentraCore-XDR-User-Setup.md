# SentraCore XDR Public Install Guide

## Fastest path

1. Download `Setup SentraCore XDR.cmd`
2. Run it to bootstrap the repo into `%USERPROFILE%\SentraCore XDR`
3. Let the local setup finish dependency installation
4. Use `Launch SentraCore XDR.cmd` to open the platform

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
