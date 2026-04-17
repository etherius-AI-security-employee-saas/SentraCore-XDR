$root = Resolve-Path "$PSScriptRoot\.."
Set-Location "$root\frontend"
npm run dev -- --host 0.0.0.0 --port 5173
