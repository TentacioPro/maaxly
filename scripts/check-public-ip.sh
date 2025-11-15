#!/bin/bash

# Script to check and log current public IP address
# This helps with mapping to DuckDNS subdomain

LOG_FILE="/var/log/public-ip.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "=== IP Address Check - $TIMESTAMP ===" | tee -a "$LOG_FILE"

# Get public IP using multiple services (fallback)
echo "Checking public IP address..." | tee -a "$LOG_FILE"

# Primary method: ipify.org
PUBLIC_IP=$(curl -s --connect-timeout 10 https://api.ipify.org)
if [ $? -eq 0 ] && [ ! -z "$PUBLIC_IP" ]; then
    echo "✅ Public IP (ipify.org): $PUBLIC_IP" | tee -a "$LOG_FILE"
else
    echo "❌ Failed to get IP from ipify.org" | tee -a "$LOG_FILE"
    
    # Fallback: httpbin.org
    PUBLIC_IP=$(curl -s --connect-timeout 10 https://httpbin.org/ip | grep -oP '"origin":\s*"\K[^"]+')
    if [ $? -eq 0 ] && [ ! -z "$PUBLIC_IP" ]; then
        echo "✅ Public IP (httpbin.org): $PUBLIC_IP" | tee -a "$LOG_FILE"
    else
        echo "❌ Failed to get IP from httpbin.org" | tee -a "$LOG_FILE"
        
        # Final fallback: ifconfig.me
        PUBLIC_IP=$(curl -s --connect-timeout 10 https://ifconfig.me)
        if [ $? -eq 0 ] && [ ! -z "$PUBLIC_IP" ]; then
            echo "✅ Public IP (ifconfig.me): $PUBLIC_IP" | tee -a "$LOG_FILE"
        else
            echo "❌ All IP check services failed" | tee -a "$LOG_FILE"
            exit 1
        fi
    fi
fi

# Display network info
echo "" | tee -a "$LOG_FILE"
echo "Network Information:" | tee -a "$LOG_FILE"
echo "===================" | tee -a "$LOG_FILE"

# Show local IP addresses
LOCAL_IPS=$(hostname -I 2>/dev/null || ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1)
if [ ! -z "$LOCAL_IPS" ]; then
    echo "Local IP addresses: $LOCAL_IPS" | tee -a "$LOG_FILE"
else
    echo "Could not determine local IP addresses" | tee -a "$LOG_FILE"
fi

# Show default gateway
GATEWAY=$(ip route | grep default | awk '{print $3}' | head -1)
if [ ! -z "$GATEWAY" ]; then
    echo "Default Gateway: $GATEWAY" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "DuckDNS Mapping Instructions:" | tee -a "$LOG_FILE"
echo "============================" | tee -a "$LOG_FILE"
echo "1. Go to https://www.duckdns.org/" | tee -a "$LOG_FILE"
echo "2. Login with your account" | tee -a "$LOG_FILE"
echo "3. Update your subdomain to point to: $PUBLIC_IP" | tee -a "$LOG_FILE"
echo "4. Or use the DuckDNS container with TOKEN and SUBDOMAINS env vars" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Save IP to a simple file for other scripts to use
echo "$PUBLIC_IP" > "/tmp/current-public-ip.txt"

echo "Public IP saved to /tmp/current-public-ip.txt" | tee -a "$LOG_FILE"
echo "Log saved to $LOG_FILE" | tee -a "$LOG_FILE"
echo "=========================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"