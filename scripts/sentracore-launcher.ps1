$ErrorActionPreference = "Stop"

$root = (Resolve-Path "$PSScriptRoot\..").Path
$venvPython = Join-Path $root ".venv\Scripts\python.exe"
$logsDir = Join-Path $root "logs"
$frontendUrl = "http://127.0.0.1:5173"
$gatewayHealthUrl = "http://127.0.0.1:8000/health"

function Test-SentraCorePort {
  param([int]$Port)
  return [bool](Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Wait-SentraCorePort {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-SentraCorePort -Port $Port) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Wait-SentraCoreHttp {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return $true
      }
    } catch {
      Start-Sleep -Milliseconds 750
      continue
    }
    Start-Sleep -Milliseconds 750
  }

  return $false
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
  & (Join-Path $root "scripts\sentracore-setup.ps1") -NoLaunch
}

if (-not (Test-Path $logsDir)) {
  New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
}

Write-Host ""
Write-Host "Launching SentraCore XDR..." -ForegroundColor Cyan

if (-not (Test-SentraCorePort -Port 8001)) {
  Start-SentraCoreProcess -Name "AI Engine" -WorkingDirectory "$root\ai_engine" -Arguments @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001") -LogPrefix "ai-engine"
  if (-not (Wait-SentraCorePort -Port 8001 -TimeoutSeconds 45)) {
    throw "AI Engine did not start. Check $logsDir\ai-engine.err.log"
  }
} else {
  Write-Host "AI Engine already running on port 8001." -ForegroundColor Yellow
}

if (-not (Test-SentraCorePort -Port 8000)) {
  Start-SentraCoreProcess -Name "Gateway" -WorkingDirectory "$root\backend" -Arguments @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000") -LogPrefix "gateway"
  if (-not (Wait-SentraCorePort -Port 8000 -TimeoutSeconds 45)) {
    throw "Gateway did not start. Check $logsDir\gateway.err.log"
  }
} else {
  Write-Host "Gateway already running on port 8000." -ForegroundColor Yellow
}

if (-not (Wait-SentraCoreHttp -Url $gatewayHealthUrl -TimeoutSeconds 30)) {
  throw "Gateway health check failed. Check $logsDir\gateway.err.log"
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
} else {
  Write-Host "Frontend already running on port 5173." -ForegroundColor Yellow
}

if (-not (Wait-SentraCoreHttp -Url $frontendUrl -TimeoutSeconds 45)) {
  throw "Frontend did not become ready. Check $logsDir\frontend.err.log"
}

Start-Process $frontendUrl

Write-Host ""
Write-Host "SentraCore XDR is ready." -ForegroundColor Green
Write-Host "GUI: $frontendUrl"
Write-Host "Logs: $logsDir"
