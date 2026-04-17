# SentraCore XDR User Setup

## Fastest way

1. Run `Setup SentraCore XDR.cmd`
2. Wait for setup to finish installing Python and frontend dependencies
3. Setup now starts the platform automatically
4. The GUI opens at `http://127.0.0.1:5173`

If you close it later, use `Launch SentraCore XDR.cmd` to open it again.

## What the setup does

- creates the Python virtual environment
- installs backend and AI engine dependencies
- installs frontend dependencies
- creates desktop and Start Menu launcher shortcuts
- starts the full SentraCore XDR GUI automatically

## Main files

- `Setup SentraCore XDR.cmd`
- `Launch SentraCore XDR.cmd`
- `Stop SentraCore XDR.cmd`

## Easy GUI tutorial

1. Open the dashboard in your browser after setup finishes
2. Watch the top cards:
   global risk score, critical alerts, highest-risk user, and zero trust mode
3. Use the left sidebar to switch views:
   dashboard, alerts, users, threat intelligence, attack timeline, and settings
4. Use the header controls to:
   refresh data, switch tenants, and run simulations
5. Use `Stop SentraCore XDR.cmd` when you want to stop the local services

## Main product features

- premium SOC-style GUI
- phishing and suspicious activity scoring
- user risk ranking
- explainable AI insights
- attack replay timeline
- threat intelligence view
- multi-tenant dashboard flow
- local backend plus AI engine runtime

## If setup or launch fails

1. Make sure Python 3 and Node.js are installed
2. Run `Setup SentraCore XDR.cmd` again
3. If the page still does not load, check the log files inside `logs\`
4. Run `Stop SentraCore XDR.cmd`, then run `Launch SentraCore XDR.cmd` again

## Installer build

If you want a packaged installer executable:

1. Install Inno Setup
2. Open `installer/SentraCore-XDR-Setup.iss`
3. Build the installer to generate the Windows setup package

## Download website

The public download website is in `downloader-site/`.
It includes direct links to:

- standalone bootstrap setup
- launcher
- cloud release script
- Windows starter pack zip
