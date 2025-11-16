# Maaxly Docker Deployment Guide

Complete step-by-step guide to deploy the Maaxly application using Docker with domain access via DuckDNS.

## Prerequisites

- Docker and Docker Compose installed
- Git installed
- Router admin access for port forwarding
- DuckDNS account and token

## 1. Initial Setup

### Clone and Navigate
```powershell
git clone https://github.com/TentacioPro/maaxly.git
cd maaxly
git checkout gcp-deploy-nov15
```

### Environment Configuration
Create/verify `.env.prod` file:

```env
# Core Configuration
COMPOSE_PROJECT_NAME=maaxly
PORT=4000
HOST=0.0.0.0
MONGO_INITDB_ROOT_USERNAME=maaxly
MONGO_INITDB_ROOT_PASSWORD=maaxlypass
MONGODB_DB=maaxly_prod_db
MONGODB_APP_USER=maaxly_prod_user
MONGODB_APP_PASS=maaxlypass
MONGODB_URI=mongodb://maaxly_prod_user:maaxlypass@mongodb:27017/maaxly_prod_db?authSource=admin

# Services
REDIS_URL=redis://redis:6379
KAFKA_BROKERS=kafka:29092
VITE_API_BASE=/api
TZ=Asia/Kolkata
JWT_SECRET=b245de8221a916fc8ff78d3ffa1f076ac55342008bda4ae3744b20522c7151bc14af768052b149f59a41bf111758c84e

# DuckDNS Configuration (REPLACE WITH YOUR VALUES)
DUCKDNS_SUBDOMAINS=your-subdomain-here
DUCKDNS_TOKEN=your-duckdns-token-here

# Nginx Proxy Manager Ports
NPM_HTTP_PORT=80       # External HTTP access
NPM_ADMIN_PORT=81      # Admin UI
NPM_HTTPS_PORT=443     # External HTTPS access
```

**⚠️ IMPORTANT**: Replace `your-subdomain-here` and `your-duckdns-token-here` with your actual DuckDNS credentials.

## 2. Router Configuration

### Port Forwarding Setup
Configure your router to forward these ports to your server's local IP:

| External Port | Internal Port | Protocol | Service |
|---------------|---------------|----------|---------|
| 80 | 80 | TCP | HTTP (Nginx Proxy Manager) |
| 443 | 443 | TCP | HTTPS (SSL) |
| 81 | 81 | TCP | NPM Admin UI |

**Example for IP `192.168.0.100`:**
- Forward `80 → 192.168.0.100:80`
- Forward `443 → 192.168.0.100:443`
- Forward `81 → 192.168.0.100:81`

### Find Your Local IP
```powershell
ipconfig | Select-String "IPv4"
```

## 3. Clean Deployment

### Remove Old Containers and Images
```powershell
# Stop everything
docker compose -f docker-compose.kafka.yml --env-file .env.prod down

# Remove all containers and networks
docker system prune -f

# Remove images (optional, forces rebuild)
docker image prune -a -f

# Remove volumes (⚠️ WARNING: This will delete all data)
docker volume prune -f
```

### Build and Deploy
```powershell
# Build with no cache (ensures fresh Linux binaries)
docker compose -f docker-compose.kafka.yml --profile prod --env-file .env.prod build --no-cache

# Start all services
docker compose -f docker-compose.kafka.yml --profile prod --env-file .env.prod up -d

# Check all containers are running
docker compose -f docker-compose.kafka.yml --env-file .env.prod ps
```

### Seed the Database
```powershell
# Wait for containers to be ready (30 seconds)
Start-Sleep -Seconds 30

# Run seed script
docker exec maaxly-backend node server/scripts/seed.js
```

## 4. Verify Local Access

### Test API Endpoints
```powershell
# Basic API test
curl http://localhost:8080/api/test

# Test login
$body = @{email='student4@example.com'; password='Abcd1234'} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body $body
```

### Access Points
- **Frontend**: http://localhost:8080
- **API**: http://localhost:8080/api/test
- **Nginx Proxy Manager**: http://localhost:81
- **MongoDB Express**: http://localhost:8082
- **Redis Insight**: http://localhost:5540

## 5. Domain Configuration

### Check DuckDNS Status
```powershell
# Test if your domain resolves to your public IP
nslookup your-subdomain.duckdns.org

# Get your current public IP
Invoke-RestMethod -Uri "https://api.ipify.org?format=json"
```

### Manual DuckDNS Update (if needed)
```powershell
# Update DuckDNS manually
$subdomain = "your-subdomain"
$token = "your-duckdns-token"
Invoke-WebRequest -Uri "https://www.duckdns.org/update?domains=$subdomain&token=$token&ip="
```

### Nginx Proxy Manager Setup

1. **Access NPM Admin**: http://localhost:81
   - Default login: `admin@example.com` / `changeme`
   - Change password on first login

2. **Add Proxy Host**:
   - **Domain Names**: `your-subdomain.duckdns.org`
   - **Scheme**: `http`
   - **Forward Hostname**: `maaxly-frontend-prod` (container name)
   - **Forward Port**: `80`
   - **Websockets Support**: ✅ Enabled
   - **Block Common Exploits**: ✅ Enabled

3. **SSL Configuration**:
   - **SSL Tab**: Request new certificate
   - **Email**: Your email for Let's Encrypt
   - **Use DNS Challenge**: ❌ (Use HTTP challenge)
   - **Accept Terms**: ✅
   - **Save**

## 6. Troubleshooting

### Container Issues
```powershell
# Check logs
docker logs maaxly-backend --tail 50
docker logs maaxly-frontend-prod --tail 50
docker logs maaxly-nginx-proxy-manager --tail 50

# Restart specific service
docker compose -f docker-compose.kafka.yml --env-file .env.prod restart frontend-prod
```

### Domain Not Accessible

**Check 1: DuckDNS Resolution**
```powershell
nslookup your-subdomain.duckdns.org 8.8.8.8
```

**Check 2: Port Forwarding**
```powershell
# Test from external network (use mobile hotspot)
curl http://your-subdomain.duckdns.org
```

**Check 3: Firewall**
- Windows: Allow Docker Desktop in Windows Defender
- Router: Ensure ports 80, 443 are not blocked

### SSL Certificate Issues

1. **Check NPM Logs**:
   ```powershell
   docker logs maaxly-nginx-proxy-manager --tail 100
   ```

2. **Verify Domain Points to Your IP**:
   ```powershell
   nslookup your-subdomain.duckdns.org
   ```

3. **Test HTTP First**: Ensure `http://your-domain.duckdns.org` works before adding SSL

### Database/API Issues
```powershell
# Test MongoDB connection
docker exec maaxly-backend node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('MongoDB connected successfully');
  process.exit(0);
}).catch(err => {
  console.error('MongoDB connection failed:', err.message);
  process.exit(1);
});
"

# Check if users exist
docker exec maaxly-backend node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const users = await mongoose.connection.db.collection('users').find({}).limit(3).toArray();
  console.log('Sample users:', users.map(u => u.email));
  process.exit(0);
});
"
```

## 7. Production Checklist

- [ ] DuckDNS subdomain and token configured
- [ ] Router port forwarding setup (80, 443, 81)
- [ ] All containers running successfully
- [ ] Database seeded with test data
- [ ] Local access working (http://localhost:8080)
- [ ] Domain resolves to your public IP
- [ ] Nginx Proxy Manager configured
- [ ] SSL certificate obtained
- [ ] External access working (https://your-subdomain.duckdns.org)

## 8. Test Credentials

After seeding, you can login with:
- **Email**: `student4@example.com`
- **Password**: `Abcd1234`

## 9. Maintenance Commands

### Update Application Code
```powershell
# Pull latest changes
git pull origin gcp-deploy-nov15

# Rebuild and restart
docker compose -f docker-compose.kafka.yml --profile prod --env-file .env.prod build --no-cache
docker compose -f docker-compose.kafka.yml --profile prod --env-file .env.prod up -d --force-recreate
```

### Backup Database
```powershell
# Manual backup
docker exec maaxly-mongodb mongodump --uri="mongodb://maaxly_prod_user:maaxlypass@localhost:27017/maaxly_prod_db?authSource=admin" --out=/backup/manual-backup-$(Get-Date -Format 'yyyy-MM-dd-HH-mm')
```

### View Logs
```powershell
# All services
docker compose -f docker-compose.kafka.yml --env-file .env.prod logs --tail 50

# Specific service
docker compose -f docker-compose.kafka.yml --env-file .env.prod logs frontend-prod --tail 20 -f
```

## Notes

- The application runs on port 8080 locally but will be accessible on standard ports (80/443) via domain
- DuckDNS container automatically updates your IP every 5 minutes
- Nginx Proxy Manager handles SSL certificates automatically via Let's Encrypt
- All data is persisted in Docker volumes
- For development, use `--profile dev --env-file .env.dev` instead