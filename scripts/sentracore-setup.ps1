$ErrorActionPreference = "Stop"

$root = Resolve-Path "$PSScriptRoot\.."
$venvPython = Join-Path $root ".venv\Scripts\python.exe"
$venvPip = Join-Path $root ".venv\Scripts\pip.exe"
$launcherPath = Join-Path $root "Launch SentraCore XDR.cmd"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$startMenuPath = Join-Path ([Environment]::GetFolderPath("Programs")) "SentraCore XDR Launcher.lnk"
$desktopShortcut = Join-Path $desktopPath "SentraCore XDR Launcher.lnk"

Write-Host ""
Write-Host "SentraCore XDR setup is preparing the platform for this machine..." -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "$root\.venv")) {
  Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
  python -m venv "$root\.venv"
}

Write-Host "Installing Python services..." -ForegroundColor Yellow
& $venvPython -m pip install --upgrade pip
& $venvPip install -r "$root\requirements.txt"

Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location "$root\frontend"
npm install
Pop-Location

$shell = New-Object -ComObject WScript.Shell
foreach ($shortcutPath in @($desktopShortcut, $startMenuPath)) {
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $launcherPath
  $shortcut.WorkingDirectory = $root
  $shortcut.Description = "Launch SentraCore XDR"
  $shortcut.Save()
}

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Launcher created at:" -ForegroundColor Green
Write-Host " - $launcherPath"
Write-Host " - $desktopShortcut"
Write-Host ""
Write-Host "Double-click 'Launch SentraCore XDR.cmd' or the desktop shortcut to start the platform."
