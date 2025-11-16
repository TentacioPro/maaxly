# Simple Maaxly Port Forwarding Helper
# This script helps configure port forwarding for Maaxly deployment

param(
    [switch]$Test,
    [switch]$Help
)

# Configuration
$RequiredPorts = @(
    @{Service="Maaxly HTTP"; Port=8088; Description="Main application access"},
    @{Service="Maaxly HTTPS"; Port=8443; Description="Secure application access"},
    @{Service="NPM Admin"; Port=81; Description="Nginx Proxy Manager admin panel"}
)

function Write-Status {
    param([string]$Message, [string]$Status = "INFO")
    $colors = @{
        "SUCCESS" = "Green"
        "ERROR" = "Red"
        "WARNING" = "Yellow"
        "INFO" = "Cyan"
        "HEADER" = "Magenta"
    }
    Write-Host "[$Status] $Message" -ForegroundColor $colors[$Status]
}

function Get-NetworkConfiguration {
    Write-Status "Detecting network configuration..." "INFO"
    
    try {
        # Get local IP
        $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
            $_.IPAddress -notlike "127.*" -and 
            $_.IPAddress -notlike "169.254.*" -and
            $_.PrefixOrigin -eq "Dhcp"
        } | Select-Object -First 1).IPAddress
        
        # Get gateway
        $gateway = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Select-Object -First 1).NextHop
        
        # Get public IP
        try {
            $publicIP = (Invoke-RestMethod -Uri "https://api.ipify.org?format=json" -TimeoutSec 10).ip
        } catch {
            $publicIP = "Unable to detect"
        }
        
        return @{
            LocalIP = $localIP
            Gateway = $gateway
            PublicIP = $publicIP
        }
    } catch {
        Write-Status "Failed to detect network configuration: $($_.Exception.Message)" "ERROR"
        return $null
    }
}

function Test-PortAvailability {
    param($Ports)
    
    Write-Status "Testing local port availability..." "INFO"
    
    foreach ($portInfo in $Ports) {
        $port = $portInfo.Port
        try {
            $connection = Test-NetConnection -ComputerName "127.0.0.1" -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
            if ($connection) {
                Write-Status "Port $port ($($portInfo.Service)): LISTENING ✅" "SUCCESS"
            } else {
                Write-Status "Port $port ($($portInfo.Service)): NOT LISTENING ❌" "ERROR"
            }
        } catch {
            Write-Status "Port $port ($($portInfo.Service)): TEST FAILED ❌" "ERROR"
        }
    }
}

function Show-RouterConfiguration {
    param($NetworkConfig)
    
    Write-Status "Router Configuration Instructions" "HEADER"
    Write-Host "=" * 50 -ForegroundColor Magenta
    
    Write-Host "`n🌐 Network Information:" -ForegroundColor Cyan
    Write-Host "   Local IP Address: $($NetworkConfig.LocalIP)" -ForegroundColor White
    Write-Host "   Router IP Address: $($NetworkConfig.Gateway)" -ForegroundColor White
    Write-Host "   Public IP Address: $($NetworkConfig.PublicIP)" -ForegroundColor White
    
    Write-Host "`n🔧 Router Access:" -ForegroundColor Cyan
    Write-Host "   1. Open web browser" -ForegroundColor White
    Write-Host "   2. Go to: http://$($NetworkConfig.Gateway)" -ForegroundColor Yellow
    Write-Host "   3. Login with admin credentials" -ForegroundColor White
    Write-Host "   4. Look for 'Port Forwarding' or 'Virtual Servers' section" -ForegroundColor White
    
    Write-Host "`n📋 Port Forwarding Rules to Add:" -ForegroundColor Cyan
    Write-Host "╔════════════════════╦══════════════╦═════════════════╦══════════════╦══════════╗" -ForegroundColor Gray
    Write-Host "║ Service Name       ║ External Port║ Internal IP     ║ Internal Port║ Protocol ║" -ForegroundColor Gray
    Write-Host "╠════════════════════╬══════════════╬═════════════════╬══════════════╬══════════╣" -ForegroundColor Gray
    
    foreach ($portInfo in $RequiredPorts) {
        $serviceName = $portInfo.Service.PadRight(18)
        $extPort = $portInfo.Port.ToString().PadRight(12)
        $intIP = $NetworkConfig.LocalIP.PadRight(15)
        $intPort = $portInfo.Port.ToString().PadRight(12)
        Write-Host "║ $serviceName ║ $extPort ║ $intIP ║ $intPort ║ TCP      ║" -ForegroundColor White
    }
    Write-Host "╚════════════════════╩══════════════╩═════════════════╩══════════════╩══════════╝" -ForegroundColor Gray
    
    Write-Host "`n🎯 After Configuration, Test These URLs:" -ForegroundColor Cyan
    if ($NetworkConfig.PublicIP -ne "Unable to detect") {
        Write-Host "   External: http://$($NetworkConfig.PublicIP):8088" -ForegroundColor Yellow
        Write-Host "   Admin:    http://$($NetworkConfig.PublicIP):81" -ForegroundColor Yellow
    }
    Write-Host "   Local:    http://$($NetworkConfig.LocalIP):8088" -ForegroundColor Green
    Write-Host "   Local:    http://localhost:8080 (direct frontend)" -ForegroundColor Green
}

function Show-CommonRouterSteps {
    Write-Host "`n🔧 Common Router Interface Steps:" -ForegroundColor Cyan
    
    $routerSteps = @{
        "TP-Link" = @(
            "Advanced → NAT Forwarding → Port Forwarding",
            "Click 'Add' for each port",
            "Fill External Port, Internal IP, Internal Port, Protocol",
            "Enable rule and Save"
        )
        "Netgear" = @(
            "Advanced → Dynamic DNS/Port Forwarding → Port Forwarding",
            "Add Custom Service",
            "Enter service name, protocol, external/internal ports, server IP",
            "Apply settings"
        )
        "Linksys" = @(
            "Smart Wi-Fi Tools → Port Forwarding",
            "Add New Port Forwarding Rule", 
            "Enter device, external/internal ports, protocol",
            "Save configuration"
        )
        "ASUS" = @(
            "Advanced Settings → WAN → Port Forwarding",
            "Enable Port Forwarding",
            "Add entries to port forwarding list",
            "Apply settings"
        )
    }
    
    foreach ($router in $routerSteps.Keys) {
        Write-Host "`n   $router Routers:" -ForegroundColor Yellow
        foreach ($step in $routerSteps[$router]) {
            Write-Host "     • $step" -ForegroundColor White
        }
    }
}

function Test-ExternalAccess {
    param($NetworkConfig)
    
    Write-Status "Testing external accessibility..." "INFO"
    
    if ($NetworkConfig.PublicIP -eq "Unable to detect") {
        Write-Status "Cannot test external access - public IP unknown" "WARNING"
        return
    }
    
    foreach ($portInfo in $RequiredPorts) {
        $port = $portInfo.Port
        Write-Host "Testing $($portInfo.Service) (port $port)..." -ForegroundColor Gray
        
        try {
            # Test with timeout
            $job = Start-Job -ScriptBlock {
                param($ip, $port)
                Test-NetConnection -ComputerName $ip -Port $port -InformationLevel Quiet
            } -ArgumentList $NetworkConfig.PublicIP, $port
            
            if (Wait-Job $job -Timeout 10) {
                $result = Receive-Job $job
                if ($result) {
                    Write-Status "External access on port ${port}: SUCCESS ✅" "SUCCESS"
                } else {
                    Write-Status "External access on port ${port}: BLOCKED ❌" "ERROR"
                }
            } else {
                Write-Status "External access on port ${port}: TIMEOUT ⏰" "WARNING"
            }
            Remove-Job $job -Force
        } catch {
            Write-Status "External access test failed for port ${port}" "ERROR"
        }
    }
}

function Show-NextSteps {
    Write-Host "`n🎯 Next Steps After Port Forwarding:" -ForegroundColor Cyan
    Write-Host "1. 🔧 Configure Nginx Proxy Manager:" -ForegroundColor White
    Write-Host "   • Go to http://localhost:81" -ForegroundColor Gray
    Write-Host "   • Login: admin@example.com / changeme" -ForegroundColor Gray
    Write-Host "   • Add Proxy Host for maaxly-prod-mvp.duckdns.org" -ForegroundColor Gray
    Write-Host "   • Point to: maaxly-frontend-prod:80" -ForegroundColor Gray
    
    Write-Host "`n2. 🔒 Setup SSL Certificate:" -ForegroundColor White
    Write-Host "   • In NPM, edit your proxy host" -ForegroundColor Gray
    Write-Host "   • SSL tab → Request new certificate" -ForegroundColor Gray
    Write-Host "   • Enable Force SSL and HTTP/2" -ForegroundColor Gray
    
    Write-Host "`n3. 🧪 Test Domain Access:" -ForegroundColor White
    Write-Host "   • http://maaxly-prod-mvp.duckdns.org:8088" -ForegroundColor Gray
    Write-Host "   • https://maaxly-prod-mvp.duckdns.org:8443 (after SSL)" -ForegroundColor Gray
}

# Main execution
if ($Help) {
    Write-Status "Maaxly Port Forwarding Helper" "HEADER"
    Write-Host "Usage:" -ForegroundColor White
    Write-Host "  .\setup-port-forwarding-simple.ps1          # Show configuration instructions" -ForegroundColor Gray
    Write-Host "  .\setup-port-forwarding-simple.ps1 -Test    # Test current port status" -ForegroundColor Gray
    Write-Host "  .\setup-port-forwarding-simple.ps1 -Help    # Show this help" -ForegroundColor Gray
    return
}

# Get network configuration
$networkConfig = Get-NetworkConfiguration
if (-not $networkConfig) {
    Write-Status "Cannot proceed without network configuration" "ERROR"
    return
}

if ($Test) {
    Write-Status "Running port forwarding tests..." "INFO"
    Test-PortAvailability $RequiredPorts
    Test-ExternalAccess $networkConfig
} else {
    Write-Status "Maaxly Port Forwarding Configuration Helper" "HEADER"
    Show-RouterConfiguration $networkConfig
    Show-CommonRouterSteps
    Write-Host "`n" + "="*50 -ForegroundColor Magenta
    Test-PortAvailability $RequiredPorts
    Show-NextSteps
}

Write-Host "`n💡 Tip: Run with -Test flag to check if port forwarding is working" -ForegroundColor Yellow