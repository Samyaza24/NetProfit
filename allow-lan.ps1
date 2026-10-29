# Lets phones on your Wi-Fi reach NetProfit (inbound TCP, private networks only). Run as Administrator.
param([int]$Port = 8001, [switch]$Remove)

$name = "NetProfit LAN"
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole("Administrator")
if (-not $admin) { Write-Error "Open PowerShell as Administrator and run this again."; exit 1 }

Remove-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
if ($Remove) { Write-Host "Removed the '$name' firewall rule."; exit 0 }

New-NetFirewallRule -DisplayName $name -Direction Inbound -Protocol TCP -LocalPort $Port `
    -Action Allow -Profile Private | Out-Null
Write-Host "Phones on a Private network can now reach port $Port."

$public = Get-NetConnectionProfile | Where-Object NetworkCategory -eq "Public"
if ($public) {
    Write-Warning "These networks are set to Public, so the rule does not apply to them: $($public.Name -join ', ')."
    Write-Warning "If this is your shop Wi-Fi, set it to Private in Windows Settings > Network & internet."
}
