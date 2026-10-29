# Makes NetProfit start when you log in and back up its data every day. Undo with -Uninstall.
param([switch]$Uninstall, [string]$BackupTime = "21:00")

$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$python = Join-Path $backend ".venv\Scripts\python.exe"

if ($Uninstall) {
    Unregister-ScheduledTask -TaskName "NetProfit", "NetProfit Backup" -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Removed the NetProfit start-up and backup tasks."
    exit 0
}
if (-not (Test-Path $python)) { Write-Error "backend\.venv is missing. See docs\daily-use-guide.md, section Install."; exit 1 }

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

try {
    $start = New-ScheduledTaskAction -Execute "powershell.exe" -WorkingDirectory $root `
        -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$root\start-netprofit.ps1`" -NoBrowser"
    Register-ScheduledTask -TaskName "NetProfit" -Force -Settings $settings `
        -Trigger (New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME) -Action $start `
        -Description "Runs the NetProfit server when you log in." | Out-Null

    $backup = New-ScheduledTaskAction -Execute $python -Argument "-m app.backup" -WorkingDirectory $backend
    Register-ScheduledTask -TaskName "NetProfit Backup" -Force -Settings $settings `
        -Trigger (New-ScheduledTaskTrigger -Daily -At $BackupTime) -Action $backup `
        -Description "Daily copy of the NetProfit database." | Out-Null
} catch {
    Write-Error "Could not create the tasks: $($_.Exception.Message). Try again from a PowerShell opened as Administrator."
    exit 1
}
Write-Host "Done. NetProfit starts at logon; backups run daily at $BackupTime (or at next logon if the PC was off)."
Write-Host "Start it now without logging out:  Start-ScheduledTask -TaskName NetProfit"
