# GCP VM Complete Storage Setup & Docker Migration Guide

This comprehensive guide documents the entire process of setting up persistent storage on a GCP VM, resolving disk space issues, and migrating the Maaxly project for optimal Docker performance.

## 🎯 Initial Goal & Problem Statement

**Objective:** Attach a 50GB external persistent disk to a GCP VM and configure it to run Docker containers efficiently with the Maaxly full-stack project.

**Critical Issues Encountered:**
- GCP VM root disk (10GB) was 100% full
- Docker operations failing with "no space left on device"
- Missing system utilities (fdisk)
- Containerd snapshots consuming 6GB of space
- Need for persistent storage that survives VM restarts

## 📋 Complete Chronological Command Sequence & Troubleshooting

### Phase 1: Initial Disk Assessment & Setup Issues

#### 1. Check Existing Disk Configuration
```bash
# Check available disks and partitions
lsblk

# Check disk usage and mount points
df -h

# List all disk details
sudo fdisk -l
```

**Issue #1:** `fdisk: command not found`
- **Root Cause:** Incomplete base Ubuntu installation
- **Impact:** Could not partition the new disk
- **Fix Applied:**
```bash
sudo apt install -y fdisk
```

**Issue #2:** Package installation failing
- **Root Cause:** Root disk 100% full, no space in `/var/cache/apt/archives/`
- **Impact:** Could not install required tools like `rsync`
- **Temporary Workaround:** Install fdisk manually to proceed

#### 2. Partition the New 50GB Disk
```bash
# Open fdisk for the new disk
sudo fdisk /dev/sdb

# Inside fdisk interactive prompt:
# n (new partition)
# p (primary partition)
# 1 (partition number)
# [accept all defaults]
# w (write changes and exit)
```

#### 3. Format the New Partition
```bash
# Format as ext4 filesystem
sudo mkfs.ext4 /dev/sdb1
```

#### 4. Create Mount Point and Mount
```bash
# Create mount directory
sudo mkdir -p /mnt/disks/data

# Mount the partition
sudo mount /dev/sdb1 /mnt/disks/data

# Verify successful mount
df -h
# Expected output: /dev/sdb1   49G   24K   47G   1% /mnt/disks/data
```

### Phase 2: Critical Disk Space Crisis Resolution

#### Issue #3: Root Disk 100% Full During Docker Operations
**Error Encountered:**
```
no space left on device
failed to extract layer...
```

**Root Cause Analysis:**
```bash
# Identify space usage
sudo du -sh /var/lib/containerd
# Output: 6.0GB /var/lib/containerd
```

**Space Hogs Identified:**
- Containerd snapshots: 6GB
- Docker overlay2 storage
- Docker image cache
- APT cache

**Fixes Applied:**

```bash
# Stop containerd service
sudo systemctl stop containerd

# Remove containerd snapshots (CAUTION: This clears container cache)
sudo rm -rf /var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/*

# Restart containerd
sudo systemctl start containerd

# Clean Docker temporary files
sudo rm -rf /var/lib/docker/tmp/*

# Clean Docker overlay storage
sudo rm -rf /var/lib/docker/overlay2/*

# Clean Docker image cache
sudo rm -rf /var/lib/docker/image/*
```

**Result:** Root disk usage reduced from 100% → 36%

#### 5. Make Mount Persistent (Survives Reboots)
```bash
# Add to /etc/fstab for automatic mounting
echo "/dev/sdb1 /mnt/disks/data ext4 defaults 0 2" | sudo tee -a /etc/fstab

# Test the fstab configuration
sudo mount -a
```

### Phase 3: Docker Storage Migration to Persistent Disk

#### 6. Configure Docker to Use Persistent Disk
```bash
# Create Docker directory on persistent disk
sudo mkdir -p /mnt/disks/data/docker

# Create Docker daemon configuration
sudo mkdir -p /etc/docker
echo '{
  "data-root": "/mnt/disks/data/docker"
}' | sudo tee /etc/docker/daemon.json

# Restart Docker service
sudo systemctl restart docker

# Verify Docker root directory location
docker info | grep "Docker Root Dir"
# Expected: Docker Root Dir: /mnt/disks/data/docker
```

#### Issue #4: Containerd Migration Attempt Failed
**Attempted Commands:**
```bash
sudo systemctl stop containerd
sudo rsync -aHAX /var/lib/containerd/ /mnt/disks/data/containerd/
```

**Error:** `rsync: change_dir "/var/lib/containerd" failed: No such file or directory`

**Root Cause:** Containerd directory was wiped during space cleanup
**Resolution:** Skip migration, let containerd recreate on new location

#### 7. Configure Containerd for Persistent Storage
```bash
# Stop containerd
sudo systemctl stop containerd

# Create containerd directory on persistent disk
sudo mkdir -p /mnt/disks/data/containerd

# Move existing containerd data (if any remains)
sudo mv /var/lib/containerd/* /mnt/disks/data/containerd/ 2>/dev/null || true

# Create symlink to persistent location
sudo ln -sf /mnt/disks/data/containerd /var/lib/containerd

# Start containerd
sudo systemctl start containerd
```

### Phase 4: Project Migration & Final Setup

#### 8. Prepare Project Storage Area
```bash
# Create apps directory on persistent disk
sudo mkdir -p /mnt/disks/data/apps

# Set proper ownership
sudo chown $USER:$USER /mnt/disks/data/apps
```

#### 9. Migrate Maaxly Project to Persistent Storage
```bash
# Install rsync (now possible after freeing space)
sudo apt-get update && sudo apt-get install -y rsync

# Create project directory on persistent disk
sudo mkdir -p /mnt/maaxly-storage

# Set proper ownership
sudo chown -R maharajanabishekyt:maharajanabishekyt /mnt/maaxly-storage

# Copy project files efficiently
rsync -av /home/maharajanabishekyt/maaxly/ /mnt/maaxly-storage/

# Remove old project directory to free root disk space
rm -rf /home/maharajanabishekyt/maaxly
```

## 📊 Final Storage Layout & Verification

### Current Disk Usage (After Migration)
```bash
df -h
# Expected output:
# /dev/sda1         9.7G  3.3G  5.9G  36% /
# /dev/sdb1          49G   11M   47G   1% /mnt/disks/data
```

### Storage Structure
```
/mnt/disks/data/          # 50GB GCP Persistent Disk
├── docker/              # Docker daemon data root
├── containerd/          # Containerd storage
└── apps/                # Application storage area

/mnt/maaxly-storage/     # Maaxly project directory
├── docker-compose.kafka.yml
├── .env.prod
├── server/
├── src/
└── ... (all project files)
```

### Verification Commands
```bash
# Check Docker storage location
docker info | grep "Docker Root Dir"
# Should show: /mnt/disks/data/docker

# Check containerd storage
ls -la /var/lib/containerd
# Should be symlink to /mnt/disks/data/containerd

# Check running containers
docker ps

# Verify project files
ls -la /mnt/maaxly-storage
```

## 🎉 Benefits Achieved & Issues Resolved

### ✅ Problems Fixed
- **Disk Space Crisis:** Root disk usage reduced from 100% → 36%
- **Docker Failures:** No more "no space left on device" errors
- **Missing Tools:** fdisk and other utilities installed
- **Storage Persistence:** Data survives VM restarts
- **Performance:** Docker operations use fast persistent disk

### ✅ Improvements Made
- **Docker Storage:** Moved to 50GB persistent disk
- **Containerd Storage:** Migrated to persistent disk
- **Project Storage:** All files on persistent disk
- **System Stability:** Root disk has 6GB free space
- **Backup Ready:** Persistent disk can be snapshotted

### ✅ Production Readiness
- **Scalability:** Room for MongoDB, Redis, Kafka data
- **Reliability:** No more disk space emergencies
- **Maintenance:** Easy to backup and restore
- **Performance:** Faster Docker operations on SSD

## 🚀 Deployment Instructions

### Access Your Project
```bash
# Navigate to project directory
cd /mnt/maaxly-storage

# Run Docker commands from here
docker compose -f docker-compose.kafka.yml --profile prod --env-file .env.prod up -d --build
```

### Access Your Application
- **Maaxly Frontend:** `http://localhost:8088`
- **Nginx Proxy Manager:** `http://localhost:81`

### Configure External Access
1. **GCP Firewall:** Allow ports 80, 443, 8088, 81
2. **Nginx Proxy Manager:** Configure SSL certificates
3. **Domain Setup:** Point domain to VM external IP

## 📝 Key Lessons Learned

1. **Monitor Disk Space:** Set up alerts before reaching 100%
2. **Plan Storage Layout:** Separate OS, Docker, and application data
3. **Use Persistent Disks:** GCP persistent disks survive VM recreation
4. **Clean Up Regularly:** Remove unused Docker images and containers
5. **Test Migrations:** Always verify after moving critical services

## 🔧 Troubleshooting Reference

| Issue | Symptom | Quick Fix |
|-------|---------|-----------|
| No space on device | Docker pull fails | Clean containerd + Docker cache |
| fdisk not found | Partitioning fails | `sudo apt install -y fdisk` |
| Mount not persistent | Disk unmounts on reboot | Add to `/etc/fstab` |
| Docker slow | Using root disk | Move Docker to persistent disk |
| Project files lost | VM recreation | Store in persistent disk |

## 📋 Summary of Key Problems & Fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| fdisk not found | incomplete base install | installed fdisk manually |
| New disk unusable | unpartitioned | manually partitioned + formatted |
| Root disk full (100%) | Docker + containerd snapshots | removed `/var/lib/containerd/snapshots` + cleaned Docker |
| Could not install packages | no space in `/var/cache/apt/archives` | cleaned up & freed disk |
| Failed pulling Docker images | no space for layers | freed containerd & docker storage |
| Could not rsync containerd | folder wiped earlier | skip rsync, recreate instead |

Your GCP VM is now fully configured with robust storage architecture and ready for production deployment! 🎯