param(
  [switch]$NoLaunch
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path "$PSScriptRoot\..").Path
$venvDir = Join-Path $root ".venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"
$venvPip = Join-Path $venvDir "Scripts\pip.exe"
$launcherPath = Join-Path $root "Launch SentraCore XDR.cmd"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$programsPath = [Environment]::GetFolderPath("Programs")
$startMenuPath = Join-Path $programsPath "SentraCore XDR Launcher.lnk"
$desktopShortcut = Join-Path $desktopPath "SentraCore XDR Launcher.lnk"

function Get-PythonBootstrapCommand {
  if (Get-Command py -ErrorAction SilentlyContinue) {
    return @("py", "-3")
  }
  if (Get-Command python -ErrorAction SilentlyContinue) {
    return @("python")
  }
  throw "Python was not found. Install Python 3 and then run setup again."
}

function Assert-CommandAvailable {
  param(
    [string[]]$Names,
    [string]$DisplayName
  )

  foreach ($name in $Names) {
    if (Get-Command $name -ErrorAction SilentlyContinue) {
      return
    }
  }

  throw "$DisplayName was not found. Install it and then run setup again."
}

function Ensure-Directory {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

Write-Host ""
Write-Host "SentraCore XDR setup is preparing the platform for this machine..." -ForegroundColor Cyan
Write-Host ""

Assert-CommandAvailable -Names @("npm.cmd", "npm") -DisplayName "Node.js / npm"

if (-not (Test-Path $venvPython)) {
  Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
  $pythonBootstrap = Get-PythonBootstrapCommand
  if ($pythonBootstrap.Count -gt 1) {
    & $pythonBootstrap[0] $pythonBootstrap[1] -m venv $venvDir
  } else {
    & $pythonBootstrap[0] -m venv $venvDir
  }
}

Write-Host "Installing Python services..." -ForegroundColor Yellow
& $venvPython -m pip install --upgrade pip
& $venvPip install -r "$root\requirements.txt"

Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location "$root\frontend"
npm install
Pop-Location

Ensure-Directory -Path $desktopPath
Ensure-Directory -Path (Split-Path $startMenuPath -Parent)

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
Write-Host " - $startMenuPath"
Write-Host ""

if ($NoLaunch) {
  Write-Host "Run 'Launch SentraCore XDR.cmd' to start the GUI."
  return
}

Write-Host "Starting SentraCore XDR now..." -ForegroundColor Cyan
& (Join-Path $root "scripts\sentracore-launcher.ps1")
