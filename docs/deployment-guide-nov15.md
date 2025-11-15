# Maaxly Production Deployment Guide (November 15, 2025)

## Branch: gcp-deploy-nov15

This guide covers the complete production deployment setup with Nginx Proxy Manager and DuckDNS integration for SSL termination and dynamic DNS management.

## 🎯 What's New in This Branch

- ✅ Uncommented and configured Nginx Proxy Manager container
- ✅ Uncommented and configured DuckDNS container
- ✅ Added IP detection and logging scripts
- ✅ Created automated deployment scripts
- ✅ Enhanced monitoring and logging capabilities
- ✅ Added comprehensive setup documentation

## 📋 Prerequisites

### Required Accounts & Services
1. **DuckDNS Account**: https://www.duckdns.org/
2. **Docker Desktop** or **Docker Engine** installed
3. **PowerShell 5.1+** or **Bash** for running scripts

### Required Configuration
1. DuckDNS subdomain created
2. DuckDNS token obtained
3. Environment variables configured

## 🚀 Quick Start Deployment

### Option 1: Automated Deployment (Recommended)
```powershell
# Run the automated deployment script
.\scripts\Deploy-Production.ps1

# For dry run (test without deploying)
.\scripts\Deploy-Production.ps1 -DryRun

# Skip IP check if needed
.\scripts\Deploy-Production.ps1 -SkipIPCheck
```

### Option 2: Manual Deployment
```powershell
# 1. Check your public IP
.\scripts\Check-PublicIP.ps1

# 2. Update DuckDNS (use IP from step 1)
# Go to https://www.duckdns.org/ and update your subdomain

# 3. Deploy the stack
docker compose -f docker-compose.kafka.yml --profile prod --env-file .env.prod up -d
```

## 🌐 Access Points

After deployment, your services will be available at:

| Service | URL | Description |
|---------|-----|-------------|
| **Main Application** | `http://your-ip:8080` | Maaxly frontend (production) |
| **Nginx Proxy Manager** | `http://your-ip:81` | SSL & proxy management |
| **MongoDB Express** | `http://your-ip:8082` | Database management |
| **Redis Insight** | `http://your-ip:5540` | Redis monitoring |

> **Note**: Replace `your-ip` with your actual public IP address

## 🔧 Configuration Files Modified

### docker-compose.kafka.yml
- Uncommented `nginx-proxy-manager` service
- Uncommented `duckdns` service  
- Added logging configurations
- Enhanced volume mappings

### .env.prod
- Enabled `DUCKDNS_SUBDOMAINS` configuration
- Enabled `DUCKDNS_TOKEN` configuration
- Added Nginx Proxy Manager port configurations

## 📁 New Files Added

| File | Purpose |
|------|---------|
| `scripts/Check-PublicIP.ps1` | PowerShell IP detection script |
| `scripts/check-public-ip.sh` | Bash IP detection script |
| `scripts/Deploy-Production.ps1` | Automated deployment script |
| `docs/nginx-duckdns-setup.md` | Detailed setup instructions |
| `logs/duckdns/` | Directory for DuckDNS logs |

## 🔐 SSL Setup Process

### Step 1: Initial Access
1. Deploy the application using the deployment script
2. Access Nginx Proxy Manager at `http://your-ip:81`
3. Login with default credentials:
   - Email: `admin@example.com`
   - Password: `changeme`
4. **IMMEDIATELY** change the admin password

### Step 2: Configure DuckDNS
1. Get your public IP using `.\scripts\Check-PublicIP.ps1`
2. Go to https://www.duckdns.org/
3. Update your subdomain to point to your public IP
4. Wait 2-5 minutes for DNS propagation

### Step 3: Create SSL Certificate
1. In NPM, go to "SSL Certificates"
2. Click "Add SSL Certificate" → "Let's Encrypt"
3. Enter your domain: `your-subdomain.duckdns.org`
4. Enter your email address
5. Save and wait for certificate generation

### Step 4: Create Proxy Host
1. Go to "Hosts" → "Proxy Hosts"
2. Click "Add Proxy Host"
3. Configure:
   - **Domain**: `your-subdomain.duckdns.org`
   - **Scheme**: `http`
   - **Forward Hostname**: `frontend-prod`
   - **Forward Port**: `80`
   - **SSL Certificate**: Select your Let's Encrypt certificate
   - **Force SSL**: Enable
   - **HTTP/2 Support**: Enable

## 📊 Monitoring & Maintenance

### Check Container Status
```powershell
# View all containers
docker ps

# Check specific service logs
docker logs maaxly-nginx-proxy-manager
docker logs maaxly-duckdns
docker logs maaxly-frontend-prod
docker logs maaxly-backend
```

### Monitor Public IP Changes
```powershell
# Check current IP
.\scripts\Check-PublicIP.ps1

# View IP change history
Get-Content logs\public-ip.log
```

### DuckDNS Status
```powershell
# Check DuckDNS container logs
docker logs maaxly-duckdns

# View DuckDNS log files
Get-Content logs\duckdns\duckdns.log
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. 502 Bad Gateway
**Symptoms**: Nginx returns 502 error
**Solutions**:
- Check backend container status: `docker ps`
- Verify container networking: `docker network ls`
- Restart backend: `docker restart maaxly-backend`

#### 2. SSL Certificate Failed
**Symptoms**: Let's Encrypt certificate creation fails
**Solutions**:
- Verify DNS resolution: `nslookup your-subdomain.duckdns.org`
- Check DuckDNS pointing to correct IP
- Wait for DNS propagation (up to 1 hour)

#### 3. DuckDNS Not Updating
**Symptoms**: IP not updating automatically
**Solutions**:
- Check token and subdomain in `.env.prod`
- Verify DuckDNS container logs: `docker logs maaxly-duckdns`
- Manually update at duckdns.org

#### 4. Port Conflicts
**Symptoms**: Container fails to start due to port conflicts
**Solutions**:
- Check what's using the port: `netstat -an | findstr :8080`
- Modify port mappings in `.env.prod`
- Restart conflicting services

### Log Analysis
```powershell
# Get deployment overview
docker compose -f docker-compose.kafka.yml ps

# Follow all logs
docker compose -f docker-compose.kafka.yml logs -f

# Check specific service with timestamps
docker logs maaxly-nginx-proxy-manager --timestamps --tail 50
```

## 🔄 Updating the Deployment

### To Update Configuration
1. Stop the services:
   ```powershell
   docker compose -f docker-compose.kafka.yml --profile prod down
   ```

2. Update configuration files (`.env.prod`, `docker-compose.kafka.yml`)

3. Redeploy:
   ```powershell
   .\scripts\Deploy-Production.ps1
   ```

### To Update Container Images
```powershell
# Pull latest images
docker compose -f docker-compose.kafka.yml --profile prod pull

# Restart with new images
docker compose -f docker-compose.kafka.yml --profile prod up -d
```

## 📚 Additional Resources

- [Nginx Proxy Manager Documentation](https://nginxproxymanager.com/guide/)
- [DuckDNS API Documentation](https://www.duckdns.org/spec.jsp)
- [Let's Encrypt Rate Limits](https://letsencrypt.org/docs/rate-limits/)

## 🎯 Next Steps After Deployment

1. **Security Hardening**:
   - Change default NPM admin credentials
   - Configure firewall rules
   - Set up fail2ban (optional)

2. **Monitoring Setup**:
   - Configure log aggregation
   - Set up health check endpoints
   - Monitor SSL certificate expiration

3. **Performance Optimization**:
   - Configure CDN (optional)
   - Optimize Nginx caching rules
   - Monitor application metrics

4. **Backup Strategy**:
   - Backup NPM configuration
   - Database backup automation
   - SSL certificate backup

---

## 📞 Support

For issues specific to this deployment setup, check:
1. Container logs using commands above
2. Network connectivity between containers
3. DNS propagation status
4. SSL certificate validity

Remember: This setup is designed for production use with proper SSL termination and dynamic DNS management. Always test changes in a development environment first.

**Branch Created**: November 15, 2025  
**Last Updated**: November 15, 2025  
**Version**: gcp-deploy-nov15