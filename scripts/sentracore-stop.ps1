$ports = @(5173, 8000, 8001)

foreach ($port in $ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  foreach ($connection in $connections) {
    try {
      Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
      Write-Host "Stopped process on port $port." -ForegroundColor Yellow
    } catch {
      Write-Host "Could not stop process on port $port." -ForegroundColor Red
    }
  }
}

Write-Host "SentraCore XDR services stopped." -ForegroundColor Green
