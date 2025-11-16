# Maaxly Port Forwarding Setup Script
# This script attempts to automatically configure port forwarding for Maaxly deployment
# Requires: Administrator privileges and UPnP-enabled router

#Requires -RunAsAdministrator

param(
    [string]$LocalIP = "192.168.0.112",
    [switch]$RemoveRules,
    [switch]$TestOnly
)

# Configuration
$AppName = "Maaxly"
$Ports = @(
    @{Name="$AppName-HTTP"; External=8088; Internal=8088; Protocol="TCP"; Description="Maaxly HTTP Access"},
    @{Name="$AppName-HTTPS"; External=8443; Internal=8443; Protocol="TCP"; Description="Maaxly HTTPS Access"},
    @{Name="$AppName-Admin"; External=81; Internal=81; Protocol="TCP"; Description="Maaxly NPM Admin"}
)

# Colors for output
$Colors = @{
    Success = "Green"
    Error = "Red" 
    Warning = "Yellow"
    Info = "Cyan"
    Header = "Magenta"
}

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-LocalNetworkInfo {
    Write-ColorOutput "🔍 Detecting Network Configuration..." "Info"
    
    # Get active network adapter
    $adapter = Get-NetAdapter | Where-Object {$_.Status -eq "Up" -and $_.Virtual -eq $false} | Select-Object -First 1
    if (-not $adapter) {
        Write-ColorOutput "❌ No active network adapter found!" "Error"
        return $null
    }
    
    # Get IP configuration
    $ipConfig = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $adapter.InterfaceIndex | Where-Object {$_.IPAddress -notlike "169.254.*"}
    if (-not $ipConfig) {
        Write-ColorOutput "❌ No valid IPv4 address found!" "Error"
        return $null
    }
    
    # Get default gateway
    $gateway = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -InterfaceIndex $adapter.InterfaceIndex | Select-Object -ExpandProperty NextHop -First 1
    
    return @{
        LocalIP = $ipConfig.IPAddress
        Gateway = $gateway
        AdapterName = $adapter.Name
    }
}

function Test-UPnPSupport {
    Write-ColorOutput "🔍 Testing UPnP Support..." "Info"
    
    try {
        # Try to create UPnP object
        $upnp = New-Object -ComObject HNetCfg.NATUPnP -ErrorAction Stop
        $mappings = $upnp.StaticPortMappingCollection
        Write-ColorOutput "✅ UPnP is available" "Success"
        return $upnp
    } catch {
        Write-ColorOutput "❌ UPnP not available: $($_.Exception.Message)" "Error"
        return $null
    }
}

function Add-UPnPPortMapping {
    param($UPnP, $Port, $LocalIP)
    
    try {
        $mappings = $UPnP.StaticPortMappingCollection
        
        # Remove existing mapping if it exists
        try {
            $mappings.Remove($Port.External, $Port.Protocol)
        } catch {
            # Mapping doesn't exist, that's OK
        }
        
        # Add new mapping
        $mappings.Add($Port.External, $Port.Protocol, $Port.Internal, $LocalIP, $true, $Port.Name)
        Write-ColorOutput "✅ Added: $($Port.Name) ($($Port.External) → $LocalIP:$($Port.Internal))" "Success"
        return $true
    } catch {
        Write-ColorOutput "❌ Failed to add $($Port.Name): $($_.Exception.Message)" "Error"
        return $false
    }
}

function Remove-UPnPPortMapping {
    param($UPnP, $Port)
    
    try {
        $mappings = $UPnP.StaticPortMappingCollection
        $mappings.Remove($Port.External, $Port.Protocol)
        Write-ColorOutput "✅ Removed: $($Port.Name)" "Success"
        return $true
    } catch {
        Write-ColorOutput "❌ Failed to remove $($Port.Name): $($_.Exception.Message)" "Error"
        return $false
    }
}

function Show-ExistingMappings {
    param($UPnP)
    
    try {
        $mappings = $UPnP.StaticPortMappingCollection
        Write-ColorOutput "`n📋 Existing Port Mappings:" "Info"
        
        $found = $false
        foreach ($mapping in $mappings) {
            if ($mapping.Description -like "*Maaxly*" -or $mapping.ExternalPort -in @(8088, 8443, 81)) {
                Write-ColorOutput "   $($mapping.ExternalPort)/$($mapping.Protocol) → $($mapping.InternalClient):$($mapping.InternalPort) [$($mapping.Description)]" "Warning"
                $found = $true
            }
        }
        
        if (-not $found) {
            Write-ColorOutput "   No Maaxly-related mappings found" "Info"
        }
    } catch {
        Write-ColorOutput "❌ Could not list existing mappings: $($_.Exception.Message)" "Error"
    }
}

function Add-WindowsFirewallRules {
    Write-ColorOutput "`n🛡️ Configuring Windows Firewall..." "Info"
    
    foreach ($port in $Ports) {
        try {
            # Remove existing rules
            Remove-NetFirewallRule -DisplayName $port.Name -ErrorAction SilentlyContinue
            
            # Add inbound rule
            New-NetFirewallRule -DisplayName $port.Name -Direction Inbound -Protocol $port.Protocol -LocalPort $port.Internal -Action Allow -Profile Any | Out-Null
            Write-ColorOutput "✅ Firewall rule added: $($port.Name)" "Success"
        } catch {
            Write-ColorOutput "❌ Failed to add firewall rule for $($port.Name): $($_.Exception.Message)" "Error"
        }
    }
}

function Remove-WindowsFirewallRules {
    Write-ColorOutput "`n🛡️ Removing Windows Firewall Rules..." "Info"
    
    foreach ($port in $Ports) {
        try {
            Remove-NetFirewallRule -DisplayName $port.Name -ErrorAction SilentlyContinue
            Write-ColorOutput "✅ Firewall rule removed: $($port.Name)" "Success"
        } catch {
            Write-ColorOutput "❌ Failed to remove firewall rule for $($port.Name): $($_.Exception.Message)" "Warning"
        }
    }
}

function Test-PortConnectivity {
    Write-ColorOutput "`n🧪 Testing Port Connectivity..." "Info"
    
    foreach ($port in $Ports) {
        try {
            $result = Test-NetConnection -ComputerName "127.0.0.1" -Port $port.Internal -InformationLevel Quiet -WarningAction SilentlyContinue
            if ($result) {
                Write-ColorOutput "✅ Port $($port.Internal) is reachable locally" "Success"
            } else {
                Write-ColorOutput "❌ Port $($port.Internal) is not reachable" "Error"
            }
        } catch {
            Write-ColorOutput "❌ Could not test port $($port.Internal)" "Error"
        }
    }
}

function Show-ManualInstructions {
    param($NetworkInfo)
    
    Write-ColorOutput "`n📖 Manual Router Configuration Instructions:" "Header"
    Write-ColorOutput "If UPnP failed, configure these manually in your router:" "Warning"
    Write-ColorOutput "`nRouter Admin Panel: http://$($NetworkInfo.Gateway)" "Info"
    Write-ColorOutput "Look for: Port Forwarding / Virtual Servers / NAT Forwarding`n" "Info"
    
    Write-ColorOutput "Port Forwarding Rules to Add:" "Info"
    Write-ColorOutput "┌─────────────────┬──────────────┬─────────────────┬──────────────┬──────────┐" "Info"
    Write-ColorOutput "│ Service Name    │ External Port│ Internal IP     │ Internal Port│ Protocol │" "Info" 
    Write-ColorOutput "├─────────────────┼──────────────┼─────────────────┼──────────────┼──────────┤" "Info"
    
    foreach ($port in $Ports) {
        $serviceName = $port.Name.PadRight(15)
        $extPort = $port.External.ToString().PadRight(12)
        $intIP = $NetworkInfo.LocalIP.PadRight(15)
        $intPort = $port.Internal.ToString().PadRight(12)
        $protocol = $port.Protocol.PadRight(8)
        Write-ColorOutput "│ $serviceName │ $extPort │ $intIP │ $intPort │ $protocol │" "Info"
    }
    Write-ColorOutput "└─────────────────┴──────────────┴─────────────────┴──────────────┴──────────┘" "Info"
    
    Write-ColorOutput "`n🔗 After configuration, test external access:" "Warning"
    $publicIP = (Invoke-RestMethod -Uri "https://api.ipify.org?format=json" -ErrorAction SilentlyContinue).ip
    if ($publicIP) {
        Write-ColorOutput "   http://$publicIP:8088 (Maaxly App)" "Info"
        Write-ColorOutput "   http://$publicIP:81 (NPM Admin)" "Info"
    }
}

function Main {
    Write-ColorOutput "🚀 Maaxly Port Forwarding Setup" "Header"
    Write-ColorOutput "=================================" "Header"
    
    # Check administrator privileges
    if (-not (Test-Administrator)) {
        Write-ColorOutput "❌ This script requires Administrator privileges!" "Error"
        Write-ColorOutput "Please run PowerShell as Administrator and try again." "Warning"
        return
    }
    
    # Get network information
    $networkInfo = Get-LocalNetworkInfo
    if (-not $networkInfo) {
        return
    }
    
    Write-ColorOutput "📊 Network Configuration:" "Info"
    Write-ColorOutput "   Local IP: $($networkInfo.LocalIP)" "Success"
    Write-ColorOutput "   Gateway: $($networkInfo.Gateway)" "Success"
    Write-ColorOutput "   Adapter: $($networkInfo.AdapterName)" "Success"
    
    # Use detected IP if not specified
    if ($LocalIP -eq "192.168.0.112") {
        $LocalIP = $networkInfo.LocalIP
        Write-ColorOutput "   Using detected IP: $LocalIP" "Info"
    }
    
    # Test UPnP support
    $upnp = Test-UPnPSupport
    
    if ($TestOnly) {
        if ($upnp) {
            Show-ExistingMappings $upnp
        }
        Test-PortConnectivity
        Show-ManualInstructions $networkInfo
        return
    }
    
    if ($RemoveRules) {
        Write-ColorOutput "`n🧹 Removing Port Forwarding Rules..." "Warning"
        
        if ($upnp) {
            foreach ($port in $Ports) {
                Remove-UPnPPortMapping $upnp $port
            }
        }
        
        Remove-WindowsFirewallRules
        Write-ColorOutput "`n✅ Cleanup completed!" "Success"
        return
    }
    
    # Add port forwarding rules
    if ($upnp) {
        Write-ColorOutput "`n🔧 Configuring UPnP Port Mappings..." "Info"
        Show-ExistingMappings $upnp
        
        $successCount = 0
        foreach ($port in $Ports) {
            if (Add-UPnPPortMapping $upnp $port $LocalIP) {
                $successCount++
            }
        }
        
        if ($successCount -eq $Ports.Count) {
            Write-ColorOutput "`n🎉 All UPnP port mappings configured successfully!" "Success"
        } else {
            Write-ColorOutput "`n⚠️ Some UPnP mappings failed. Manual configuration may be needed." "Warning"
        }
    } else {
        Write-ColorOutput "`n⚠️ UPnP not available. Manual router configuration required." "Warning"
    }
    
    # Configure Windows Firewall
    Add-WindowsFirewallRules
    
    # Test connectivity
    Test-PortConnectivity
    
    # Show manual instructions
    if (-not $upnp -or $successCount -lt $Ports.Count) {
        Show-ManualInstructions $networkInfo
    }
    
    Write-ColorOutput "`n✅ Port forwarding setup completed!" "Success"
    Write-ColorOutput "Next steps:" "Info"
    Write-ColorOutput "1. Access NPM Admin: http://localhost:81" "Info"
    Write-ColorOutput "2. Configure proxy host for your domain" "Info"
    Write-ColorOutput "3. Test external access via your public IP" "Info"
}

# Script execution
try {
    Main
} catch {
    Write-ColorOutput "❌ Script execution failed: $($_.Exception.Message)" "Error"
    Write-ColorOutput "Stack trace: $($_.ScriptStackTrace)" "Error"
}