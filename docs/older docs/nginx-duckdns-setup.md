# Nginx Proxy Manager + DuckDNS Setup Guide

## Overview

This guide covers setting up Nginx Proxy Manager for SSL termination and reverse proxying, along with DuckDNS for dynamic DNS updates in a production environment.

## Prerequisites

1. **DuckDNS Account**: Sign up at https://www.duckdns.org/
2. **Domain/Subdomain**: Create a subdomain (e.g., `your-maaxly-instance.duckdns.org`)
3. **DuckDNS Token**: Get your token from the DuckDNS dashboard
4. **Public IP**: Know your current public IP address

## Step 1: Configure Environment Variables

Update your `.env.prod` file with the following:

```env
# DuckDNS Configuration
DUCKDNS_SUBDOMAINS=your-maaxly-instance
DUCKDNS_TOKEN=your-actual-duckdns-token

# Nginx Proxy Manager Ports
NPM_HTTP_PORT=8088
NPM_ADMIN_PORT=81
NPM_HTTPS_PORT=8443
```

## Step 2: Check Your Public IP

Run the IP check script to get your current public IP:

### Windows (PowerShell):
```powershell
.\scripts\Check-PublicIP.ps1
```

### Linux/Mac:
```bash
chmod +x scripts/check-public-ip.sh
./scripts/check-public-ip.sh
```

## Step 3: Update DuckDNS

1. Go to https://www.duckdns.org/
2. Login to your account
3. Find your subdomain (e.g., `your-maaxly-instance`)
4. Update the IP address field with your public IP from Step 2
5. Click "update ip"

## Step 4: Deploy the Stack

Deploy with the production profile:

```bash
docker compose -f docker-compose.kafka.yml --profile prod --env-file .env.prod up -d
```

## Step 5: Access Nginx Proxy Manager

1. Wait for all containers to start (check with `docker ps`)
2. Access NPM admin interface: http://your-public-ip:81
3. Default login credentials:
   - Email: `admin@example.com`
   - Password: `changeme`

## Step 6: Configure SSL Certificate

In Nginx Proxy Manager:

1. **Add SSL Certificate**:
   - Go to "SSL Certificates" tab
   - Click "Add SSL Certificate"
   - Choose "Let's Encrypt"
   - Domain Names: `your-maaxly-instance.duckdns.org`
   - Email: your email address
   - Toggle "Use a DNS Challenge"
   - DNS Provider: Choose appropriate provider or manual
   - Save

2. **Add Proxy Host**:
   - Go to "Hosts" -> "Proxy Hosts"
   - Click "Add Proxy Host"
   - Details Tab:
     - Domain Names: `your-maaxly-instance.duckdns.org`
     - Scheme: `http`
     - Forward Hostname/IP: `frontend-prod` (Docker service name)
     - Forward Port: `80`
     - Block Common Exploits: ✓
     - Websockets Support: ✓
   - SSL Tab:
     - SSL Certificate: Select the certificate created above
     - Force SSL: ✓
     - HTTP/2 Support: ✓
     - HSTS Enabled: ✓
   - Save

## Step 7: Verify Setup

1. **Test DuckDNS Resolution**:
   ```bash
   nslookup your-maaxly-instance.duckdns.org
   ```

2. **Test HTTPS Access**:
   - Visit `https://your-maaxly-instance.duckdns.org`
   - Should show your Maaxly application with valid SSL

3. **Check Container Logs**:
   ```bash
   # DuckDNS logs
   docker logs maaxly-duckdns
   
   # Nginx Proxy Manager logs
   docker logs maaxly-nginx-proxy-manager
   ```

## Monitoring and Maintenance

### DuckDNS IP Updates

The DuckDNS container will automatically update your IP address, but you can monitor it:

```bash
# View DuckDNS logs
docker logs maaxly-duckdns --tail 50

# Check current IP
./scripts/Check-PublicIP.ps1
```

### SSL Certificate Renewal

Let's Encrypt certificates auto-renew through Nginx Proxy Manager. Monitor renewal:

```bash
# Check NPM logs for renewal activities
docker logs maaxly-nginx-proxy-manager | grep -i "renew\|certificate"
```

## Troubleshooting

### Common Issues

1. **DuckDNS Not Updating**:
   - Check token and subdomain in `.env.prod`
   - Verify container logs: `docker logs maaxly-duckdns`
   - Manually update IP at duckdns.org

2. **SSL Certificate Issues**:
   - Ensure domain points to correct IP
   - Check DNS propagation: `nslookup your-subdomain.duckdns.org`
   - Try manual certificate generation in NPM

3. **502 Bad Gateway**:
   - Check if backend containers are running
   - Verify NPM proxy host configuration
   - Ensure container networking is correct

4. **Port Conflicts**:
   - Adjust NPM_HTTP_PORT, NPM_ADMIN_PORT in .env.prod
   - Ensure ports are not used by other services

### Useful Commands

```bash
# Check all container status
docker ps

# View specific container logs
docker logs maaxly-nginx-proxy-manager
docker logs maaxly-duckdns
docker logs maaxly-frontend-prod
docker logs maaxly-backend

# Restart specific service
docker compose -f docker-compose.kafka.yml restart nginx-proxy-manager

# Check public IP from container
docker run --rm curlimages/curl curl -s https://api.ipify.org
```

## Security Considerations

1. **Change NPM Admin Password**: Immediately after first login
2. **Firewall Rules**: Only expose necessary ports (80, 443, 81 for admin)
3. **Regular Updates**: Keep containers updated
4. **Monitor Logs**: Regularly check for suspicious activity
5. **Backup NPM Config**: Backup npm_data volume regularly

## Network Architecture

```
Internet → DuckDNS → Public IP → NPM (Ports 80/443) → Frontend (Port 80) → Backend (Port 4000)
                                    ↓
                              Admin UI (Port 81)
```

## Next Steps

1. Configure additional security headers in NPM
2. Set up monitoring and alerting
3. Configure backup strategies for SSL certificates
4. Consider CDN integration for better performance