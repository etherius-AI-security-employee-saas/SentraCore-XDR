$root = Resolve-Path "$PSScriptRoot\.."

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$root\scripts\run-ai-engine.ps1`""
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$root\scripts\run-gateway.ps1`""
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$root\scripts\run-frontend.ps1`""

Write-Host "Started SentraCore XDR AI engine, gateway, and frontend in separate PowerShell windows."
