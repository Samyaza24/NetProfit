# Starts NetProfit: the phone API and the dashboard on one port. Double-click or run from anywhere.
param([int]$Port = 8001, [switch]$NoBrowser)

$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$python = Join-Path $backend ".venv\Scripts\python.exe"
$logDir = Join-Path $backend "data\logs"
$log = Join-Path $logDir "netprofit.log"

if (-not (Test-Path $python)) { Write-Error "backend\.venv is missing. See docs\daily-use-guide.md, section Install."; exit 1 }
if (-not (Test-Path (Join-Path $root "web\out\index.html"))) {
    Write-Warning "The dashboard is not built. Run: cd web; `$env:NEXT_PUBLIC_API_BASE='/api/v1'; npm run build"
}

# Already running? Just open the dashboard.
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    Write-Host "NetProfit is already running on port $Port."
    if (-not $NoBrowser) { Start-Process "http://localhost:$Port" }
    exit 0
}

New-Item -ItemType Directory -Force $logDir | Out-Null
if ((Test-Path $log) -and (Get-Item $log).Length -gt 5MB) { Move-Item -Force $log "$log.old" }

if (-not $NoBrowser) {
    Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile", "-Command", "Start-Sleep 4; Start-Process http://localhost:$Port"
}

Set-Location $backend
Write-Host "NetProfit is running on port $Port. Close this window to stop it. Log: $log"
# Restart after a crash; cmd handles the log redirect so uvicorn's messages stay readable.
while ($true) {
    cmd /c "`"$python`" -m uvicorn app.main:app --host 0.0.0.0 --port $Port >> `"$log`" 2>&1"
    Start-Sleep -Seconds 5
}
