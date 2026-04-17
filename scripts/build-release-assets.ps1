$ErrorActionPreference = "Stop"

$root = Resolve-Path "$PSScriptRoot\.."
$downloadsDir = Join-Path $root "downloader-site\downloads"
$stagingDir = Join-Path $env:TEMP "sentracore-xdr-downloads-stage"
$zipPath = Join-Path $downloadsDir "SentraCore-XDR-Windows-Starter.zip"

if (-not (Test-Path $downloadsDir)) {
  throw "Downloads directory not found: $downloadsDir"
}

if (Test-Path $stagingDir) {
  Remove-Item -LiteralPath $stagingDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

Get-ChildItem -LiteralPath $downloadsDir -File |
  Where-Object { $_.Name -ne "SentraCore-XDR-Windows-Starter.zip" } |
  ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $stagingDir $_.Name) -Force
  }

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item -LiteralPath $stagingDir -Recurse -Force

Write-Host "SentraCore XDR starter pack rebuilt at $zipPath" -ForegroundColor Green
