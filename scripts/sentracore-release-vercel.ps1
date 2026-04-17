$ErrorActionPreference = "Stop"

$root = Resolve-Path "$PSScriptRoot\.."

function Invoke-SentraCoreVercelDeploy {
  param(
    [string]$Name,
    [string]$Directory,
    [string[]]$ExtraArgs = @()
  )

  Write-Host ""
  Write-Host "Deploying $Name from $Directory ..." -ForegroundColor Cyan
  Push-Location $Directory
  try {
    & vercel @ExtraArgs --prod
  } finally {
    Pop-Location
  }
}

function Set-SentraCoreEnvFile {
  param(
    [string]$Path,
    [string[]]$Lines
  )

  $content = ($Lines -join [Environment]::NewLine) + [Environment]::NewLine
  Set-Content -Path $Path -Value $content -Encoding UTF8
}

Write-Host "Starting SentraCore XDR Vercel production release..." -ForegroundColor Green
Write-Host "Expected order: AI Engine -> Gateway -> Frontend -> Downloader Web" -ForegroundColor Green

Invoke-SentraCoreVercelDeploy -Name "AI Engine" -Directory "$root\ai_engine"

$aiUrl = Read-Host "Paste the deployed AI Engine URL (example: https://your-ai-engine.vercel.app)"
if ([string]::IsNullOrWhiteSpace($aiUrl)) {
  throw "AI Engine URL is required to continue."
}
Set-SentraCoreEnvFile -Path "$root\backend\.env" -Lines @(
  "AI_ENGINE_URL=$aiUrl",
  "DEMO_STREAMING_ENABLED=false",
  "STREAM_PROCESSING_MODE=synchronous",
  "ENVIRONMENT=production"
)

Invoke-SentraCoreVercelDeploy -Name "Gateway" -Directory "$root\backend"

$gatewayUrl = Read-Host "Paste the deployed Gateway URL (example: https://your-sentracore-backend.vercel.app)"
if ([string]::IsNullOrWhiteSpace($gatewayUrl)) {
  throw "Gateway URL is required to continue."
}
Set-SentraCoreEnvFile -Path "$root\frontend\.env.production" -Lines @(
  "VITE_API_BASE_URL=$gatewayUrl/api/v1",
  "VITE_WS_BASE_URL="
)

Invoke-SentraCoreVercelDeploy -Name "Frontend" -Directory "$root\frontend"

$frontendUrl = Read-Host "Paste the deployed Frontend URL (example: https://your-sentracore-frontend.vercel.app)"
if ([string]::IsNullOrWhiteSpace($frontendUrl)) {
  throw "Frontend URL is required to finalize backend CORS settings."
}
Set-SentraCoreEnvFile -Path "$root\backend\.env" -Lines @(
  "AI_ENGINE_URL=$aiUrl",
  "DEMO_STREAMING_ENABLED=false",
  "STREAM_PROCESSING_MODE=synchronous",
  "ENVIRONMENT=production",
  "CORS_ORIGINS=[`"$frontendUrl`"]"
)

Invoke-SentraCoreVercelDeploy -Name "Gateway (CORS refresh)" -Directory "$root\backend"
Invoke-SentraCoreVercelDeploy -Name "Downloader Web" -Directory "$root\downloader-site"

Write-Host ""
Write-Host "SentraCore XDR production release flow completed." -ForegroundColor Green
