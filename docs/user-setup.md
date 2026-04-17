# SentraCore XDR User Setup

## Fastest way

1. Double-click `Setup SentraCore XDR.cmd`
2. Wait for setup to complete
3. Double-click `Launch SentraCore XDR.cmd`
4. The dashboard opens at `http://127.0.0.1:5173`

## Main files

- `Setup SentraCore XDR.cmd`
- `Launch SentraCore XDR.cmd`
- `Stop SentraCore XDR.cmd`

## What setup does

- creates the Python virtual environment
- installs backend and AI engine dependencies
- installs frontend dependencies
- creates a desktop shortcut named `SentraCore XDR Launcher`

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
