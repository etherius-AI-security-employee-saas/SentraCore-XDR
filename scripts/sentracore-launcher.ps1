$ErrorActionPreference = "Stop"

$root = Resolve-Path "$PSScriptRoot\.."
$venvPython = Join-Path $root ".venv\Scripts\python.exe"
$logsDir = Join-Path $root "logs"

function Test-SentraCorePort {
  param([int]$Port)
  return [bool](Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Start-SentraCoreProcess {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string[]]$Arguments,
    [string]$LogPrefix
  )

  $stdout = Join-Path $logsDir "$LogPrefix.out.log"
  $stderr = Join-Path $logsDir "$LogPrefix.err.log"
  Start-Process `
    -FilePath $venvPython `
    -ArgumentList $Arguments `
    -WorkingDirectory $WorkingDirectory `
    -WindowStyle Minimized `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr | Out-Null
  Write-Host "$Name started." -ForegroundColor Green
}

if (-not (Test-Path $venvPython) -or -not (Test-Path "$root\frontend\node_modules")) {
  Write-Host "Dependencies are missing, running setup first..." -ForegroundColor Yellow
  & (Join-Path $root "scripts\sentracore-setup.ps1")
}

if (-not (Test-Path $logsDir)) {
  New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
}

Write-Host ""
Write-Host "Launching SentraCore XDR..." -ForegroundColor Cyan

if (-not (Test-SentraCorePort -Port 8001)) {
  Start-SentraCoreProcess -Name "AI Engine" -WorkingDirectory "$root\ai_engine" -Arguments @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001") -LogPrefix "ai-engine"
  Start-Sleep -Seconds 3
} else {
  Write-Host "AI Engine already running on port 8001." -ForegroundColor Yellow
}

if (-not (Test-SentraCorePort -Port 8000)) {
  Start-SentraCoreProcess -Name "Gateway" -WorkingDirectory "$root\backend" -Arguments @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000") -LogPrefix "gateway"
  Start-Sleep -Seconds 3
} else {
  Write-Host "Gateway already running on port 8000." -ForegroundColor Yellow
}

if (-not (Test-SentraCorePort -Port 5173)) {
  Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", "5173") `
    -WorkingDirectory "$root\frontend" `
    -WindowStyle Minimized `
    -RedirectStandardOutput (Join-Path $logsDir "frontend.out.log") `
    -RedirectStandardError (Join-Path $logsDir "frontend.err.log") | Out-Null
  Write-Host "Frontend started." -ForegroundColor Green
  Start-Sleep -Seconds 6
} else {
  Write-Host "Frontend already running on port 5173." -ForegroundColor Yellow
}

Start-Process "http://127.0.0.1:5173"

Write-Host ""
Write-Host "SentraCore XDR is ready." -ForegroundColor Green
Write-Host "Open: http://127.0.0.1:5173"
Write-Host "Logs: $logsDir"
