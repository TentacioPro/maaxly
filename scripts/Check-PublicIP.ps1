# PowerShell script to check and log current public IP address
# This helps with mapping to DuckDNS subdomain

param(
    [string]$LogFile = "logs\public-ip.log"
)

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$logEntry = "=== IP Address Check - $timestamp ==="

Write-Host $logEntry
Add-Content -Path $LogFile -Value $logEntry

Write-Host "Checking public IP address..."
Add-Content -Path $LogFile -Value "Checking public IP address..."

$publicIP = $null

# Primary method: ipify.org
try {
    $publicIP = (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 10 -ErrorAction Stop).Trim()
    $message = "✅ Public IP (ipify.org): $publicIP"
    Write-Host $message -ForegroundColor Green
    Add-Content -Path $LogFile -Value $message
} catch {
    $errorMsg = "❌ Failed to get IP from ipify.org: $($_.Exception.Message)"
    Write-Host $errorMsg -ForegroundColor Red
    Add-Content -Path $LogFile -Value $errorMsg
    
    # Fallback: httpbin.org
    try {
        $response = Invoke-RestMethod -Uri "https://httpbin.org/ip" -TimeoutSec 10 -ErrorAction Stop
        $publicIP = $response.origin
        $message = "✅ Public IP (httpbin.org): $publicIP"
        Write-Host $message -ForegroundColor Green
        Add-Content -Path $LogFile -Value $message
    } catch {
        $errorMsg = "❌ Failed to get IP from httpbin.org: $($_.Exception.Message)"
        Write-Host $errorMsg -ForegroundColor Red
        Add-Content -Path $LogFile -Value $errorMsg
        
        # Final fallback: ifconfig.me
        try {
            $publicIP = (Invoke-RestMethod -Uri "https://ifconfig.me" -TimeoutSec 10 -ErrorAction Stop).Trim()
            $message = "✅ Public IP (ifconfig.me): $publicIP"
            Write-Host $message -ForegroundColor Green
            Add-Content -Path $LogFile -Value $message
        } catch {
            $errorMsg = "❌ All IP check services failed: $($_.Exception.Message)"
            Write-Host $errorMsg -ForegroundColor Red
            Add-Content -Path $LogFile -Value $errorMsg
            exit 1
        }
    }
}

# Display network info
Write-Host ""
Write-Host "Network Information:" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Add-Content -Path $LogFile -Value ""
Add-Content -Path $LogFile -Value "Network Information:"
Add-Content -Path $LogFile -Value "==================="

# Get local IP addresses
try {
    $localIPs = @()
    Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch "^127\." -and $_.IPAddress -notmatch "^169\.254\." } | ForEach-Object {
        $localIPs += $_.IPAddress
    }
    
    if ($localIPs.Count -gt 0) {
        $localIPString = $localIPs -join ", "
        Write-Host "Local IP addresses: $localIPString"
        Add-Content -Path $LogFile -Value "Local IP addresses: $localIPString"
    }
} catch {
    $fallbackMsg = "Could not determine local IP addresses using NetAdapter cmdlets"
    Write-Host $fallbackMsg -ForegroundColor Yellow
    Add-Content -Path $LogFile -Value $fallbackMsg
}

# Get default gateway
try {
    $gateway = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Select-Object -First 1).NextHop
    if ($gateway) {
        Write-Host "Default Gateway: $gateway"
        Add-Content -Path $LogFile -Value "Default Gateway: $gateway"
    }
} catch {
    Write-Host "Could not determine default gateway" -ForegroundColor Yellow
    Add-Content -Path $LogFile -Value "Could not determine default gateway"
}

Write-Host ""
Write-Host "DuckDNS Mapping Instructions:" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow
Add-Content -Path $LogFile -Value ""
Add-Content -Path $LogFile -Value "DuckDNS Mapping Instructions:"
Add-Content -Path $LogFile -Value "============================"

$instructions = @(
    "1. Go to https://www.duckdns.org/",
    "2. Login with your account",
    "3. Update your subdomain to point to: $publicIP",
    "4. Or use the DuckDNS container with TOKEN and SUBDOMAINS env vars",
    ""
)

$instructions | ForEach-Object {
    Write-Host $_
    Add-Content -Path $LogFile -Value $_
}

# Save IP to a simple file for other scripts to use
$publicIP | Out-File -FilePath "logs\current-public-ip.txt" -Encoding UTF8

Write-Host "Public IP saved to logs\current-public-ip.txt" -ForegroundColor Green
Write-Host "Log saved to $LogFile" -ForegroundColor Green
Add-Content -Path $LogFile -Value "Public IP saved to logs\current-public-ip.txt"
Add-Content -Path $LogFile -Value "Log saved to $LogFile"
Add-Content -Path $LogFile -Value "========================================="
Add-Content -Path $LogFile -Value ""

# Output the IP for use in other scripts
return $publicIP