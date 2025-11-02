
You are absolutely right. My apologies, I missed the introductory text for step 2.4, which broke the formatting pattern.

Thank you for catching that. Here is the corrected and consistent version of the `Maaxly "Plan F" Deployment Log & Guide` markdown file. The fix has been applied to **Section 2.4**.

`# Maaxly "Plan F" Deployment Log & Guide

This document tracks the complete, step-by-step deployment of the Maaxly project onto the GCP Free Trial, following the "Plan F" architecture.

## Section 1: Initial Setup (Completed)

This section logs the initial setup of the local environment.

### 1.1: GCloud CLI Installation & Init

* ****Status:**** `COMPLETED`
* ****Date:**** 2025-11-02
* ****Log:****    ```
    Welcome to the Google Cloud CLI!
    ...
    You are signed in as: [maharajanabishekyt@gmail.com].
    Pick cloud project to use:
    [7] Create a new project
    Enter a Project ID: maaxly-deploy-trial
    ...
    Your current project has been set to: [maaxly-deploy-trial].
    The Google Cloud CLI is configured and ready to use!
    * Commands that require authentication will use maharajanabishekyt@gmail.com by default
    * Commands will reference project maaxly-deploy-trial by default
    ```

### 1.2: GitHub Deploy Key Creation

* ****Status:**** `COMPLETED`
* ****Date:**** 2025-11-02
* ****Action:**** Generated a new SSH key pair (`gcp_deploy_key` and `gcp_deploy_key.pub`) locally.
* ****Log:**** The public key was added to the `TentacioPro/maaxly` repository.
    ```
    GCP VM-1 App Server
    SHA256:RVALDVs90IWAh/dUPbEAL6a3EW8msn/ascAC78LH/M
    Added on Nov 2, 2025 by @TentacioPro
    Never used-Read-only
    ```

---

## Section 2: Git & Project File Setup (To-Do)

This is your next step. You must prepare your repository **before** you create the VMs.

### 2.1: Define Your Git Branching Strategy

You need to create the branch that the VM will deploy from.

* ****`main`****: Your stable, primary branch.
* ****`gcp-deploy-300`****: Your ****production branch****. This is the branch VM-1 will clone.
* ****`staging`****: Your ****testing branch****. You will test changes here before merging them into `gcp-deploy-300`.
* ****`feature/**`**: Your development branches (e.g., `feature/new-chat-ui`).

### 2.2: Create `gcp-deploy-300` Branch

On your local Windows machine, in your `maaxly` project folder:

```powershell
# Make sure you are on your main branch and have the latest code
git checkout main
git pull

# Create the new deployment branch from main
git checkout -b gcp-deploy-300

# Push the new branch to GitHub
git push -u origin gcp-deploy-300***`

### 2.3: Add the `Dockerfile`

In the **root** of your `maaxly` project, create a new file named `Dockerfile` (no extension).

Dockerfile

# 

`# --- STAGE 1: Build the React Frontend ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copy all package.json and package-lock.json files
COPY package.json package-lock.json* ./
COPY server/package.json server/
COPY src/package.json src/
# (Add any other package.json files if they exist)

# Install all dependencies for the entire monorepo
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the frontend (Vite)
RUN npm run build

# --- STAGE 2: Build the Production Server ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy only the production dependencies' package.json files
COPY package.json package-lock.json* ./
COPY server/package.json server/

# Install *only* the production dependencies for the server
RUN npm install --production

# Copy the server source code
COPY server/ ./server/

# Copy the built React app from the 'builder' stage
# Assumes Express serves static files from 'server/dist'
COPY --from-builder /app/dist ./server/dist

# Expose the port your server runs on (PORT 4000)
EXPOSE 4000

# The command to start your server (server/index.js)
CMD [ "node", "server/index.js" ]`

### 2.4: Commit and Push the Dockerfile

On your local Windows machine, commit the new `Dockerfile` to your `gcp-deploy-300` branch.

PowerShell

# 

`# Add the new Dockerfile
git add Dockerfile

# Commit the change to your deployment branch
git commit -m "feat: Add production Dockerfile for GCP deployment"

# Push the commit
git push`

---

## Section 3: Secure Private Key in GCP (To-Do)

Now you must upload the **private deploy key** (`gcp_deploy_key`) to GCP Secret Manager so the VM can access it securely.

Run these commands in your local PowerShell:

PowerShell

# 

`# 1. Create the secret container
gcloud secrets create maaxly-github-deploy-key --replication-policy="automatic"

# 2. Add the private key file as the first version
# (This assumes the gcp_deploy_key file is in your current directory)
gcloud secrets versions add maaxly-github-deploy-key --data-file="./gcp_deploy_key"

# 3. Get your Project Number (Project ID is 'maaxly-deploy-trial')
$PROJECT_NUMBER = gcloud projects describe maaxly-deploy-trial --format="value(projectNumber)"

# 4. Define the VM's service account email
$SERVICE_ACCOUNT = "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# 5. Grant the VM's service account permission to read the secret
Write-Host "Granting secret access to $SERVICE_ACCOUNT"
gcloud secrets add-iam-policy-binding maaxly-github-deploy-key `
    --member="serviceAccount:$SERVICE_ACCOUNT" `
    --role="roles/secretmanager.secretAccessor"`

---

## Section 4: Create VM Startup Scripts (To-Do)

Create these two Bash script files on your local machine. The PowerShell script in the next step will read them.

### `startup-vm-1.sh` (App Server)

This is the **updated** script that securely fetches the deploy key from Secret Manager and clones your private repo.

`#!/bin/bash
# Filename: startup-vm-1.sh
echo "--- VM-1 Startup Script: START ---" | tee -a /var/log/startup.log

# 1. Install Docker and required tools
apt-get update
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release htop git
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable docker
systemctl start docker

# 2. Configure Docker Log Rotation
mkdir -p /etc/docker
tee /etc/docker/daemon.json > /dev/null <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
EOF
systemctl restart docker

# 3. Setup SSH for private GitHub repo
echo "Configuring SSH for private GitHub repo..."
mkdir -p /root/.ssh
chmod 700 /root/.ssh
# Fetch the private deploy key from GCP Secret Manager
gcloud secrets versions access latest --secret="maaxly-github-deploy-key" > /root/.ssh/id_rsa
chmod 600 /root/.ssh/id_rsa
# Add GitHub's public key to known_hosts to prevent interactive prompt
ssh-keyscan -t rsa github.com >> /root/.ssh/known_hosts

# 4. Clone the repository using SSH protocol
echo "Cloning private repo..."
# 🚨 UPDATE this to your SSH clone URL
git clone git@github.com:TentacioPro/maaxly.git /opt/maaxly
cd /opt/maaxly
git checkout gcp-deploy-300

# 5. Create Docker Compose file for App + Nginx Proxy Manager
tee /opt/maaxly/docker-compose.yml > /dev/null <<'EOF'
version: '3.8'
services:
  maaxly-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: maaxly-app
    restart: unless-stopped
    environment:
      # 🚨 UPDATE VM_2_INTERNAL_IP with the actual internal IP of vm-2-data
      - MONGODB_URI=mongodb://VM_2_INTERNAL_IP:27017/maaxly-db
      - REDIS_URL=redis://VM_2_INTERNAL_IP:6379
      - JWT_SECRET=YOUR_SUPER_SECRET_KEY_HERE # 🚨 UPDATE THIS
      - PORT=4000
      - CORS_ORIGIN=https://maaxly-trial.duckdns.org # 🚨 UPDATE THIS
    depends_on:
      - npm-proxy

  npm-proxy:
    image: 'jc21/nginx-proxy-manager:latest'
    container_name: npm-proxy
    restart: unless-stopped
    ports: ["80:80", "443:443", "81:81"]
    volumes: ["npm_data:/data", "npm_letsencrypt:/etc/letsencrypt"]

volumes:
  npm_data:
  npm_letsencrypt:
EOF

# 6. Install DuckDNS client
mkdir -p /opt/duckdns
cd /opt/duckdns
tee /opt/duckdns/duck.sh > /dev/null <<'EOF'
#!/bin/bash
# 🚨 UPDATE 'maaxly-trial' and 'YOUR_TOKEN_HERE'
echo url="https://www.duckdns.org/update?domains=maaxly-trial&token=YOUR_TOKEN_HERE&ip=" | curl -k -o /opt/duckdns/duck.log -K -
EOF
chmod +x /opt/duckdns/duck.sh
./duck.sh # Run once to set the IP

# 7. Add DuckDNS to Cron
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/duckdns/duck.sh >/dev/null 2>&1") | crontab -

echo "--- VM-1 Startup Script: COMPLETE ---" | tee -a /var/log/startup.log`

### `startup-vm-2.sh` (Data Server)

This script installs Docker, runs Mongo/Redis, and sets up backup scripts.

`#!/bin/bash
# Filename: startup-vm-2.sh
echo "--- VM-2 Startup Script: START ---" | tee -a /var/log/startup.log

# 1. Install Docker and required tools
apt-get update
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release htop git
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable docker
systemctl start docker

# 2. Configure Docker Log Rotation
mkdir -p /etc/docker
tee /etc/docker/daemon.json > /dev/null <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
EOF
systemctl restart docker

# 3. Create Docker Compose file for Mongo + Redis
mkdir -p /opt/maaxly
tee /opt/maaxly/docker-compose.yml > /dev/null <<'EOF'
version: '3.8'
services:
  maaxly-mongo:
    image: mongo:latest
    container_name: maaxly-mongo
    ports: ["27017:27017"] #Exposed only to internal VPC
    volumes: ["mongo_data:/data/db"]
    restart: unless-stopped
  maaxly-redis:
    image: redis:7-alpine
    container_name: maaxly-redis
    ports: ["6379:6379"] # Exposed only to internal VPC
    volumes: ["redis_data:/data"]
    restart: unless-stopped
volumes:
  mongo_data:
  redis_data:
EOF

# 4. Start the database containers
cd /opt/maaxly
docker compose up -d

# 5. Setup GCS Backup scripts
mkdir -p /opt/scripts
# Mongo Backup Script
tee /opt/scripts/backup_mongo.sh > /dev/null <<'EOF'
#!/bin/bash
# 🚨 UPDATE this GCS_BUCKET_NAME
export GCS_BUCKET_NAME="maaxly-backups-bucket"
export BACKUP_DIR="/backups/mongo/$(date +%F)"
mkdir -p $BACKUP_DIR
docker exec maaxly-mongo mongodump --out $BACKUP_DIR
gsutil rsync -r $BACKUP_DIR gs://$GCS_BUCKET_NAME/mongo/
rm -rf /backups/mongo/*
EOF
chmod +x /opt/scripts/backup_mongo.sh

# Redis Backup Script
tee /opt/scripts/backup_redis.sh > /dev/null <<'EOF'
#!/bin.bash
# 🚨 UPDATE this GCS_BUCKET_NAME
export GCS_BUCKET_NAME="maaxly-backups-bucket"
export REDIS_DATA_PATH=$(docker inspect --format='{{.Mounts}}' maaxly-redis | grep -oE '/var/lib/docker/volumes/.*?/_data')
docker exec maaxly-redis redis-cli BGSAVE
sleep 10 # Give BGSAVE time to complete
gsutil cp $REDIS_DATA_PATH/dump.rdb gs://$GCS_BUCKET_NAME/redis/dump-$(date +%F).rdb
EOF
chmod +x /opt/scripts/backup_redis.sh

# 6. Add to Cron
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/scripts/backup_mongo.sh >/dev/null 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "5 2 * * * /opt/scripts/backup_redis.sh >/dev/null 2>&1") | crontab -

echo "--- VM-2 Startup Script: COMPLETE ---" | tee -a /var/log/startup.log`

---

## Section 5: Provision GCP Infrastructure (To-Do)

You are now ready to create your VMs. Run this entire script from your local PowerShell.

`# [ACTION REQUIRED]: Run this entire script from PowerShell 7.5

Write-Host "🔒 Creating firewall rules..." -ForegroundColor Yellow
# Allow public HTTP/HTTPS traffic to the app server
gcloud compute firewall-rules create allow-http-https --network=default --allow=tcp:80,tcp:443 --source-ranges=0.0.0.0/0 --target-tags=app-server

# Allow SSH only via Google's secure IAP
gcloud compute firewall-rules create allow-ssh-iap --network=default --allow=tcp:22 --source-ranges=35.235.240.0/20 --target-tags=app-server,db-server

# Allow internal traffic from the app server to the DB server
gcloud compute firewall-rules create allow-internal-db --network=default --allow=tcp:27017,tcp:6379 --source-tags=app-server --target-tags=db-server
Write-Host "✅ Firewall rules created." -ForegroundColor Green

Write-Host "🚀 Provisioning VM-2 (Data Server)..." -ForegroundColor Yellow
gcloud compute instances create vm-2-data `
    --zone=us-central1-a `
    --machine-type=e2-medium `
    --network=default `
    --no-address `
    --tags=db-server,allow-ssh-iap `
    --image-family=debian-12 `
    --image-project=debian-cloud `
    --boot-disk-size=30GB `
    --boot-disk-type=pd-standard `
    --metadata-from-file=startup-script=./startup-vm-2.sh `
    --shielded-secure-boot `
    --scopes=https://www.googleapis.com/auth/cloud-platform `
    --labels=gcp-plan=plan-f,role=database `
    --enable-monitoring
Write-Host "✅ VM-2 (Data Server) is being created." -ForegroundColor Green

Write-Host " reserving static IP..." -ForegroundColor Yellow
gcloud compute addresses create maaxly-static-ip --region=us-central1
$env:STATIC_IP = (gcloud compute addresses describe maaxly-static-ip --region=us-central1 --format="value(address)")
Write-Host "✅ Reserved Static IP: $env:STATIC_IP. Point your DuckDNS domain to this IP." -ForegroundColor Green

Write-Host "🚀 Provisioning VM-1 (App Server)..." -ForegroundColor Yellow
gcloud compute instances create vm-1-app `
    --zone=us-central1-a `
    --machine-type=e2-medium `
    --network=default `
    --address=$env:STATIC_IP `
    --tags=app-server,allow-ssh-iap `
    --image-family=debian-12 `
    --image-project=debian-cloud `
    --boot-disk-size=30GB `
    --boot-disk-type=pd-standard `
    --metadata-from-file=startup-script=./startup-vm-1.sh `
    --shielded-secure-boot `
    --scopes=https://www.googleapis.com/auth/cloud-platform `
    --labels=gcp-plan=plan-f,role=application `
    --enable-monitoring
Write-Host "✅ VM-1 (App Server) is being created." -ForegroundColor Green
Write-Host "---"
Write-Host "🎉 Deployment script finished. VMs are provisioning." -ForegroundColor Cyan`

---

## Section 6: Final Manual Configuration (To-Do)

After the script in Section 5 finishes, your VMs will be running. You must perform these final steps to link them and go live.

1. **Get VM-2 Internal IP:**
    - In the GCP Console (or run `gcloud compute instances list`).
    - Find `vm-2-data` and copy its **Internal IP** (e.g., `10.128.0.2`).
2. **Configure VM-1:**
    - In PowerShell, SSH into VM-1: `gcloud compute ssh vm-1-app --zone=us-central1-a`
    - Once inside the VM's (Linux) terminal, edit the compose file:
        
        sudo nano /opt/maaxly/docker-compose.yml
        
    - Replace `VM_2_INTERNAL_IP` with the real IP you copied.
    - Update `JWT_SECRET`, `CORS_ORIGIN`, and any other required environment variables.
    - Save the file (Ctrl+O, Enter, Ctrl+X).
3. **Build and Run VM-1:**
    - Navigate to the app directory: `cd /opt/maaxly`
    - Build the application image: `sudo docker compose build`
    - Start the app and proxy: `sudo docker compose up -d`
4. **Configure Nginx Proxy Manager (SSL):**
    - From your local PowerShell, run this command to create a secure tunnel to the NPM admin UI:
        
        gcloud compute ssh vm-1-app --zone=us-central1-a -- -L 8181:localhost:81
        
    - Open `http://localhost:8181` in your local browser.
    - Log in (Default: `admin@example.com` / `changeme`).
    - Go to **"Proxy Hosts"** > "Add Proxy Host."
    - **Domain Name:** `maaxly-trial.duckdns.org` (Your DuckDNS domain)
    - **Forward Hostname / IP:** `maaxly-app` (This is the Docker container name)
    - **Forward Port:** `4000`
    - Go to the **"SSL"** tab.
    - Select "Request a new SSL Certificate."
    - Enable "Force SSL" and click **Save**.

Your application is now live at `https://maaxly-trial.duckdns.org`.

---

## Section 7: Activate Disaster Recovery (To-Do)

Your `startup-vm-2.sh` script already installed and scheduled the backup scripts, but they will fail until you create the destination GCS bucket.

1. **Create GCS Bucket:**
    - In the GCP Console, go to "Cloud Storage" > "Buckets" and create a new bucket.
    - Use the *exact* name you put in the backup scripts (e.g., `maaxly-backups-bucket`).
    - Choose "Standard" storage, and select a US-based region to align with the "Always Free" tier.
2. **Verify:**
    - The cron job on VM-2 will automatically run at 2 AM and upload the database dumps to this bucket.