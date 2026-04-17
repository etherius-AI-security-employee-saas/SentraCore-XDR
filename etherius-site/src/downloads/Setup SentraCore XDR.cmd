@echo off
setlocal

set "INSTALL_DIR=%USERPROFILE%\SentraCore XDR"
set "REPO_ZIP_URL=https://github.com/etherius-AI-security-employee-saas/SentraCore-XDR/archive/refs/heads/main.zip"
set "TEMP_ZIP=%TEMP%\SentraCore-XDR-main.zip"
set "TEMP_DIR=%TEMP%\SentraCore-XDR-bootstrap"

echo.
echo Bootstrapping SentraCore XDR into "%INSTALL_DIR%"...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "& { $ErrorActionPreference='Stop'; $installDir=[Environment]::ExpandEnvironmentVariables('%INSTALL_DIR%'); $repoZip=[Environment]::ExpandEnvironmentVariables('%REPO_ZIP_URL%'); $tempZip=[Environment]::ExpandEnvironmentVariables('%TEMP_ZIP%'); $tempDir=[Environment]::ExpandEnvironmentVariables('%TEMP_DIR%'); New-Item -ItemType Directory -Force -Path $installDir | Out-Null; if (Test-Path $tempDir) { Remove-Item -LiteralPath $tempDir -Recurse -Force }; New-Item -ItemType Directory -Force -Path $tempDir | Out-Null; Invoke-WebRequest -Uri $repoZip -OutFile $tempZip; Expand-Archive -LiteralPath $tempZip -DestinationPath $tempDir -Force; $bundle = Get-ChildItem -LiteralPath $tempDir -Directory | Select-Object -First 1; Copy-Item -Path (Join-Path $bundle.FullName '*') -Destination $installDir -Recurse -Force; Remove-Item -LiteralPath $tempZip -Force; Remove-Item -LiteralPath $tempDir -Recurse -Force; Start-Process -FilePath (Join-Path $installDir 'Setup SentraCore XDR.cmd') -WorkingDirectory $installDir -Wait }"

if errorlevel 1 (
  echo.
  echo SentraCore XDR setup bootstrap failed.
  echo Download the full starter pack zip from the downloader website or clone the repository manually.
  exit /b 1
)

echo.
echo SentraCore XDR bootstrap completed successfully.
endlocal
