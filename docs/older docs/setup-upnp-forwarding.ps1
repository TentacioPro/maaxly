# Automated UPnP Port Forwarding for Maaxly
# This script attempts to automatically configure port forwarding using UPnP

#Requires -RunAsAdministrator

param(
    [switch]$Remove,
    [switch]$List
)

$ErrorActionPreference = "SilentlyContinue"

# Port configuration
$Ports = @(
    @{Name="Maaxly-HTTP"; External=8088; Internal=8088; Protocol="TCP"},
    @{Name="Maaxly-HTTPS"; External=8443; Internal=8443; Protocol="TCP"}, 
    @{Name="Maaxly-Admin"; External=81; Internal=81; Protocol="TCP"}
)

function Write-ColoredOutput {
    param([string]$Message, [string]$Color = "White")
    $colors = @{
        "Success" = "Green"; "Error" = "Red"; "Warning" = "Yellow"
        "Info" = "Cyan"; "Header" = "Magenta"
    }
    Write-Host $Message -ForegroundColor $colors.GetEnumerator().Where({$_.Key -eq $Color}).Value
}

function Get-LocalIP {
    $adapter = Get-NetAdapter | Where-Object {$_.Status -eq "Up" -and $_.Virtual -eq $false} | Select-Object -First 1
    if ($adapter) {
        $ip = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $adapter.InterfaceIndex | 
              Where-Object {$_.IPAddress -notlike "169.254.*" -and $_.IPAddress -notlike "127.*"} |
              Select-Object -First 1
        return $ip.IPAddress
    }
    return $null
}

function Initialize-UPnP {
    try {
        Write-ColoredOutput "🔍 Initializing UPnP connection..." "Info"
        $upnp = New-Object -ComObject HNetCfg.NATUPnP
        $mappings = $upnp.StaticPortMappingCollection
        Write-ColoredOutput "✅ UPnP service is available" "Success"
        return @{UPnP = $upnp; Mappings = $mappings}
    } catch {
        Write-ColoredOutput "❌ UPnP is not available: $($_.Exception.Message)" "Error"
        Write-ColoredOutput "💡 Enable UPnP in your router settings and try again" "Warning"
        return $null
    }
}

function Add-PortMapping {
    param($UPnPService, $Port, $LocalIP)
    
    try {
        # Remove existing mapping if it exists
        try {
            $UPnPService.Mappings.Remove($Port.External, $Port.Protocol)
        } catch {
            # Mapping doesn't exist, continue
        }
        
        # Add new mapping
        $UPnPService.Mappings.Add($Port.External, $Port.Protocol, $Port.Internal, $LocalIP, $true, $Port.Name)
        Write-ColoredOutput "✅ $($Port.Name): $($Port.External) -> $LocalIP`:$($Port.Internal)" "Success"
        return $true
    } catch {
        Write-ColoredOutput "❌ Failed to add $($Port.Name): $($_.Exception.Message)" "Error"
        return $false
    }
}

function Remove-PortMapping {
    param($UPnPService, $Port)
    
    try {
        $UPnPService.Mappings.Remove($Port.External, $Port.Protocol)
        Write-ColoredOutput "✅ Removed: $($Port.Name)" "Success"
        return $true
    } catch {
        Write-ColoredOutput "❌ Failed to remove $($Port.Name): $($_.Exception.Message)" "Error"
        return $false
    }
}

function Show-PortMappings {
    param($UPnPService)
    
    try {
        Write-ColoredOutput "`n📋 Current UPnP Port Mappings:" "Header"
        $mappings = $UPnPService.Mappings
        $maaxlyMappings = @()
        
        foreach ($mapping in $mappings) {
            if ($mapping.Description -like "*Maaxly*" -or $mapping.ExternalPort -in @(8088, 8443, 81)) {
                $maaxlyMappings += @{
                    Port = $mapping.ExternalPort
                    Protocol = $mapping.Protocol
                    InternalIP = $mapping.InternalClient
                    InternalPort = $mapping.InternalPort
                    Description = $mapping.Description
                    Enabled = $mapping.Enabled
                }
            }
        }
        
        if ($maaxlyMappings.Count -gt 0) {
            Write-ColoredOutput "┌─────────────────┬──────────┬─────────────────┬──────────────┬─────────┐" "Info"
            Write-ColoredOutput "│ Description     │ Ext Port │ Internal IP     │ Int Port     │ Enabled │" "Info"
            Write-ColoredOutput "├─────────────────┼──────────┼─────────────────┼──────────────┼─────────┤" "Info"
            
            foreach ($mapping in $maaxlyMappings) {
                $desc = $mapping.Description.PadRight(15).Substring(0, 15)
                $extPort = $mapping.Port.ToString().PadRight(8)
                $intIP = $mapping.InternalIP.PadRight(15)
                $intPort = $mapping.InternalPort.ToString().PadRight(12)
                $enabled = if ($mapping.Enabled) { "✅ Yes" } else { "❌ No" }
                Write-ColoredOutput "│ $desc │ $extPort │ $intIP │ $intPort │ $enabled │" "Info"
            }
            Write-ColoredOutput "└─────────────────┴──────────┴─────────────────┴──────────────┴─────────┘" "Info"
        } else {
            Write-ColoredOutput "No Maaxly-related port mappings found" "Warning"
        }
    } catch {
        Write-ColoredOutput "❌ Error listing port mappings: $($_.Exception.Message)" "Error"
    }
}

function Add-FirewallRules {
    Write-ColoredOutput "`n🛡️ Configuring Windows Firewall..." "Info"
    
    foreach ($port in $Ports) {
        try {
            # Remove existing rule
            Remove-NetFirewallRule -DisplayName $port.Name -ErrorAction SilentlyContinue
            
            # Add new inbound rule
            New-NetFirewallRule -DisplayName $port.Name -Direction Inbound -Protocol $port.Protocol -LocalPort $port.Internal -Action Allow -Profile Any | Out-Null
            Write-ColoredOutput "✅ Firewall: $($port.Name) port $($port.Internal)" "Success"
        } catch {
            Write-ColoredOutput "❌ Firewall rule failed: $($port.Name)" "Error"
        }
    }
}

function Test-Connectivity {
    $localIP = Get-LocalIP
    Write-ColoredOutput "`n🧪 Testing Local Connectivity..." "Info"
    
    foreach ($port in $Ports) {
        $result = Test-NetConnection -ComputerName $localIP -Port $port.Internal -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($result) {
            Write-ColoredOutput "✅ Port $($port.Internal) ($($port.Name)): Reachable" "Success"
        } else {
            Write-ColoredOutput "❌ Port $($port.Internal) ($($port.Name)): Not reachable" "Error"
        }
    }
}

# Main execution
Write-ColoredOutput "🚀 Maaxly UPnP Port Forwarding Tool" "Header"
Write-ColoredOutput "===================================" "Header"

# Check admin privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-ColoredOutput "⚠️ Administrator privileges required for firewall configuration" "Warning"
    Write-ColoredOutput "Some features may not work properly" "Warning"
}

# Get local IP
$localIP = Get-LocalIP
if (-not $localIP) {
    Write-ColoredOutput "❌ Could not determine local IP address" "Error"
    exit 1
}
Write-ColoredOutput "📍 Local IP Address: $localIP" "Info"

# Initialize UPnP
$upnpService = Initialize-UPnP
if (-not $upnpService) {
    Write-ColoredOutput "`n💡 UPnP Troubleshooting Tips:" "Warning"
    Write-ColoredOutput "   1. Enable UPnP/IGD in router settings" "Info"
    Write-ColoredOutput "   2. Restart router after enabling UPnP" "Info"
    Write-ColoredOutput "   3. Ensure Windows UPnP Device Host service is running" "Info"
    Write-ColoredOutput "   4. Try running: Get-Service UPnPHost | Start-Service" "Info"
    exit 1
}

if ($List) {
    Show-PortMappings $upnpService
    exit 0
}

if ($Remove) {
    Write-ColoredOutput "`n🗑️ Removing Maaxly port mappings..." "Warning"
    $removedCount = 0
    foreach ($port in $Ports) {
        if (Remove-PortMapping $upnpService $port) {
            $removedCount++
        }
    }
    Write-ColoredOutput "`n✅ Removed $removedCount port mappings" "Success"
    exit 0
}

# Add port mappings
Write-ColoredOutput "`n🔧 Adding UPnP port mappings..." "Info"
$successCount = 0
foreach ($port in $Ports) {
    if (Add-PortMapping $upnpService $port $localIP) {
        $successCount++
    }
}

# Configure firewall if admin
if ($isAdmin) {
    Add-FirewallRules
}

# Show results
Write-ColoredOutput "`n📊 Configuration Summary:" "Header"
Write-ColoredOutput "✅ UPnP mappings added: $successCount/$($Ports.Count)" "Info"
if ($successCount -eq $Ports.Count) {
    Write-ColoredOutput "🎉 All port mappings configured successfully!" "Success"
} else {
    Write-ColoredOutput "⚠️ Some mappings failed - check router UPnP settings" "Warning"
}

# Test connectivity
Test-Connectivity

# Show current mappings
Show-PortMappings $upnpService

# Final instructions
Write-ColoredOutput "`n🎯 Next Steps:" "Header"
Write-ColoredOutput "1. Configure NPM: http://localhost:81" "Info"
Write-ColoredOutput "2. Test external access on ports 8088, 8443, 81" "Info"
Write-ColoredOutput "3. Add SSL certificate in NPM for your domain" "Info"

$publicIP = try { (Invoke-RestMethod -Uri "https://api.ipify.org?format=json" -TimeoutSec 5).ip } catch { "unknown" }
if ($publicIP -ne "unknown") {
    Write-ColoredOutput "`n🌐 Test External Access:" "Info"
    Write-ColoredOutput "   http://$publicIP:8088 (Maaxly App)" "Success"
    Write-ColoredOutput "   http://$publicIP:81 (NPM Admin)" "Success"
}

Write-ColoredOutput "`n💡 Use -List to view current mappings, -Remove to clean up" "Info"