# Maaxly Production Deployment Script
# This script handles the complete deployment process including IP detection and DuckDNS setup

param(
    [switch]$SkipIPCheck,
    [switch]$DryRun,
    [string]$Profile = "prod",
    [string]$EnvFile = ".env.prod"
)

Write-Host "🚀 Maaxly Production Deployment Script" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Step 1: Check current public IP (unless skipped)
if (-not $SkipIPCheck) {
    Write-Host "`n📡 Step 1: Checking current public IP address..." -ForegroundColor Yellow
    try {
        $publicIP = .\scripts\Check-PublicIP.ps1
        Write-Host "✅ Current public IP: $publicIP" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to check public IP: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "💡 You can skip this check with -SkipIPCheck flag" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "⏭️  Skipping IP check as requested" -ForegroundColor Yellow
}

# Step 2: Verify environment file
Write-Host "`n📋 Step 2: Verifying environment configuration..." -ForegroundColor Yellow
if (-not (Test-Path $EnvFile)) {
    Write-Host "❌ Environment file '$EnvFile' not found!" -ForegroundColor Red
    exit 1
}

# Check for required DuckDNS variables
$envContent = Get-Content $EnvFile -Raw
$requiredVars = @("DUCKDNS_SUBDOMAINS", "DUCKDNS_TOKEN", "JWT_SECRET")
$missingVars = @()

foreach ($var in $requiredVars) {
    if ($envContent -notmatch "$var=.+") {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "❌ Missing or empty required environment variables:" -ForegroundColor Red
    $missingVars | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    Write-Host "💡 Please update $EnvFile with proper values" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Environment file validated" -ForegroundColor Green

# Step 3: Check Docker and docker-compose
Write-Host "`n🐳 Step 3: Checking Docker environment..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker: $dockerVersion" -ForegroundColor Green
    
    $composeVersion = docker compose version
    Write-Host "✅ Docker Compose: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker or Docker Compose not found!" -ForegroundColor Red
    Write-Host "💡 Please install Docker Desktop or Docker Engine" -ForegroundColor Yellow
    exit 1
}

# Step 4: Show deployment plan
Write-Host "`n📋 Step 4: Deployment Plan" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow
Write-Host "Profile: $Profile"
Write-Host "Environment File: $EnvFile"
Write-Host "Containers to deploy:"
Write-Host "  - MongoDB + MongoDB Express"
Write-Host "  - Redis + Redis Insight"
Write-Host "  - Kafka"
Write-Host "  - Backend API"
Write-Host "  - Frontend (Production)"
Write-Host "  - Nginx Proxy Manager"
Write-Host "  - DuckDNS Updater"
Write-Host "  - Backup Service"

if ($DryRun) {
    Write-Host "`n🔍 DRY RUN MODE - No actual deployment will occur" -ForegroundColor Magenta
    Write-Host "Command that would be executed:" -ForegroundColor Magenta
    Write-Host "docker compose -f docker-compose.kafka.yml --profile $Profile --env-file $EnvFile up -d" -ForegroundColor White
    exit 0
}

# Step 5: Confirmation
Write-Host "`n⚠️  Ready to deploy to production!" -ForegroundColor Yellow
$confirmation = Read-Host "Continue with deployment? (y/N)"
if ($confirmation -ne "y" -and $confirmation -ne "Y") {
    Write-Host "Deployment cancelled by user" -ForegroundColor Yellow
    exit 0
}

# Step 6: Stop existing containers (if any)
Write-Host "`n🛑 Step 5: Stopping existing containers..." -ForegroundColor Yellow
try {
    docker compose -f docker-compose.kafka.yml --profile $Profile --env-file $EnvFile down
    Write-Host "✅ Existing containers stopped" -ForegroundColor Green
} catch {
    Write-Host "⚠️  No existing containers to stop" -ForegroundColor Yellow
}

# Step 7: Pull latest images
Write-Host "`n📦 Step 6: Pulling latest container images..." -ForegroundColor Yellow
try {
    docker compose -f docker-compose.kafka.yml --profile $Profile --env-file $EnvFile pull
    Write-Host "✅ Images pulled successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Some images may not have updates available" -ForegroundColor Yellow
}

# Step 8: Deploy
Write-Host "`n🚀 Step 7: Starting deployment..." -ForegroundColor Yellow
try {
    docker compose -f docker-compose.kafka.yml --profile $Profile --env-file $EnvFile up -d
    Write-Host "✅ Deployment initiated successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 9: Wait and check container health
Write-Host "`n⏳ Step 8: Checking container health..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

$containers = docker ps --format "table {{.Names}}\t{{.Status}}" | Select-Object -Skip 1
Write-Host "Container Status:" -ForegroundColor Cyan
$containers | ForEach-Object { Write-Host "  $_" }

# Step 10: Display access information
Write-Host "`n🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green

if (-not $SkipIPCheck -and $publicIP) {
    Write-Host "`n🌐 Access Information:" -ForegroundColor Cyan
    Write-Host "Frontend (Production): http://$publicIP`:8080"
    Write-Host "Nginx Proxy Manager: http://$publicIP`:81"
    Write-Host "MongoDB Express: http://$publicIP`:8082"
    Write-Host "Redis Insight: http://$publicIP`:5540"
    
    Write-Host "`n📋 DuckDNS Setup Required:" -ForegroundColor Yellow
    Write-Host "1. Go to https://www.duckdns.org/"
    Write-Host "2. Update your subdomain to point to: $publicIP"
    Write-Host "3. Wait for DNS propagation (2-5 minutes)"
    Write-Host "4. Configure SSL in Nginx Proxy Manager"
}

Write-Host "`n📊 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Monitor container logs: docker compose -f docker-compose.kafka.yml logs -f"
Write-Host "2. Set up SSL certificates in Nginx Proxy Manager"
Write-Host "3. Configure DuckDNS subdomain"
Write-Host "4. Test the application functionality"

Write-Host "`n📁 Useful Commands:" -ForegroundColor Cyan
Write-Host "View logs: docker compose -f docker-compose.kafka.yml logs -f [service-name]"
Write-Host "Restart service: docker compose -f docker-compose.kafka.yml restart [service-name]"
Write-Host "Stop all: docker compose -f docker-compose.kafka.yml --profile $Profile down"

Write-Host "`n✨ Deployment script completed successfully!" -ForegroundColor Green