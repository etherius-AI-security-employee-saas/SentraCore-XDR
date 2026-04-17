$root = Resolve-Path "$PSScriptRoot\.."
$python = Join-Path $root ".venv\Scripts\python.exe"
Set-Location "$root\ai_engine"
& $python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
