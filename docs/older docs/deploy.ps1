# Quick Deployment Script for Maaxly
# Run this script to deploy the complete application

# === STEP 1: CONFIGURATION ===
Write-Host "🚀 Starting Maaxly Deployment..." -ForegroundColor Green

# Check if .env.prod exists
if (-not (Test-Path ".env.prod")) {
    Write-Host "❌ .env.prod file not found!" -ForegroundColor Red
    Write-Host "Please create .env.prod with your DuckDNS credentials:" -ForegroundColor Yellow
    Write-Host "DUCKDNS_SUBDOMAINS=your-subdomain" -ForegroundColor Yellow
    Write-Host "DUCKDNS_TOKEN=your-token" -ForegroundColor Yellow
    exit 1
}

# === STEP 2: CLEAN DEPLOYMENT ===
Write-Host "🧹 Cleaning previous deployment..." -ForegroundColor Blue
docker compose -f docker-compose.kafka.yml --env-file .env.prod down
docker system prune -f

# === STEP 3: BUILD AND START ===
Write-Host "🔨 Building containers (this may take 2-3 minutes)..." -ForegroundColor Blue
docker compose -f docker-compose.kafka.yml --profile prod --env-file .env.prod build --no-cache

Write-Host "🚀 Starting all services..." -ForegroundColor Blue
docker compose -f docker-compose.kafka.yml --profile prod --env-file .env.prod up -d

# === STEP 4: WAIT FOR SERVICES ===
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Blue
Start-Sleep -Seconds 45

# === STEP 5: SEED DATABASE ===
Write-Host "🌱 Seeding database..." -ForegroundColor Blue
docker exec maaxly-backend node server/scripts/seed.js

# === STEP 6: VERIFICATION ===
Write-Host "✅ Verifying deployment..." -ForegroundColor Green

# Check container status
Write-Host "📊 Container Status:" -ForegroundColor Cyan
docker compose -f docker-compose.kafka.yml --env-file .env.prod ps

# Test API
Write-Host "`n🔍 Testing API..." -ForegroundColor Cyan
try {
    $apiTest = Invoke-RestMethod -Uri "http://localhost:8080/api/test" -TimeoutSec 10
    Write-Host "✅ API Test: $($apiTest.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ API Test Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Login
Write-Host "`n🔐 Testing Authentication..." -ForegroundColor Cyan
try {
    $body = @{email='student4@example.com'; password='Abcd1234'} | ConvertTo-Json
    $loginTest = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 10
    Write-Host "✅ Login Test: Success" -ForegroundColor Green
} catch {
    Write-Host "❌ Login Test Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Get public IP
try {
    $publicIP = (Invoke-RestMethod -Uri "https://api.ipify.org?format=json" -TimeoutSec 10).ip
    Write-Host "`n🌐 Your Public IP: $publicIP" -ForegroundColor Cyan
} catch {
    Write-Host "`n❌ Could not get public IP" -ForegroundColor Red
}

# === STEP 7: NEXT STEPS ===
Write-Host "`n🎯 Next Steps for Domain Access:" -ForegroundColor Yellow
Write-Host "1. 🏠 Configure Router Port Forwarding:" -ForegroundColor White
Write-Host "   - Forward port 8088 → your-local-ip:8088 (HTTP)" -ForegroundColor Gray
Write-Host "   - Forward port 8443 → your-local-ip:8443 (HTTPS)" -ForegroundColor Gray
Write-Host "   - Forward port 81 → your-local-ip:81 (NPM Admin)" -ForegroundColor Gray

Write-Host "`n2. 🔧 Configure Nginx Proxy Manager:" -ForegroundColor White
Write-Host "   - Access: http://localhost:81" -ForegroundColor Gray
Write-Host "   - Login: admin@example.com / changeme" -ForegroundColor Gray
Write-Host "   - Add Proxy Host for your DuckDNS domain" -ForegroundColor Gray

Write-Host "`n3. 🔒 Setup SSL Certificate:" -ForegroundColor White
Write-Host "   - In NPM, request Let's Encrypt certificate" -ForegroundColor Gray
Write-Host "   - Point domain to: maaxly-frontend-prod:80" -ForegroundColor Gray

Write-Host "`n📱 Access Points:" -ForegroundColor Cyan
Write-Host "   Local Frontend: http://localhost:8080" -ForegroundColor White
Write-Host "   NPM Admin: http://localhost:81" -ForegroundColor White
Write-Host "   MongoDB Express: http://localhost:8082" -ForegroundColor White

Write-Host "`n🔑 Test Credentials:" -ForegroundColor Cyan
Write-Host "   Email: student4@example.com" -ForegroundColor White
Write-Host "   Password: Abcd1234" -ForegroundColor White

Write-Host "`n🏁 Deployment Complete!" -ForegroundColor Green