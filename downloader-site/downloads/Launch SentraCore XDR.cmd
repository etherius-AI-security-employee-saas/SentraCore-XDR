@echo off
setlocal

set "INSTALL_DIR=%USERPROFILE%\SentraCore XDR"
set "TARGET=%INSTALL_DIR%\Launch SentraCore XDR.cmd"

if not exist "%TARGET%" (
  echo SentraCore XDR is not installed yet.
  echo Run "Setup SentraCore XDR.cmd" first.
  exit /b 1
)

start "" "%TARGET%"
endlocal
