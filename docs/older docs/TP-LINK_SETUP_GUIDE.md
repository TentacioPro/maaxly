# TP-Link Router Port Forwarding Guide for Maaxly
# Step-by-step instructions for TP-Link router configuration

## 🔧 TP-Link Router Configuration Guide

### Your Network Information:
- **Router IP**: 192.168.0.1
- **Your Computer IP**: 192.168.0.112  
- **Public IP**: 123.201.177.58

---

## Step 1: Access Your TP-Link Router Admin Panel

1. **Open Web Browser** (Chrome, Firefox, Edge)
2. **Go to**: `http://192.168.0.1`
3. **Login with your credentials**:
   - **Default Username**: `admin`
   - **Default Password**: `admin` (or check router sticker)
   - If changed during setup, use your custom credentials

---

## Step 2: Navigate to Port Forwarding

### For Newer TP-Link Routers (Archer series, etc.):
1. Click **"Advanced"** in the top menu
2. Go to **"NAT Forwarding"** on the left sidebar  
3. Click **"Port Forwarding"**

### For Older TP-Link Routers:
1. Click **"Advanced Settings"** or **"Advanced"**
2. Look for **"Virtual Servers"** or **"Port Forwarding"**
3. Click on that section

---

## Step 3: Add Port Forwarding Rules

You need to create **3 separate rules**. Click **"Add"** or **"+"** for each rule:

### Rule 1: Maaxly HTTP Access
- **Service Name**: `Maaxly-HTTP`
- **Device**: Select your computer or type `192.168.0.112`
- **External Port**: `8088` 
- **Internal Port**: `8088`
- **Protocol**: `TCP` or `All`
- **Status**: `Enabled` ✅
- Click **"Save"**

### Rule 2: Maaxly HTTPS Access  
- **Service Name**: `Maaxly-HTTPS`
- **Device**: Select your computer or type `192.168.0.112`
- **External Port**: `8443`
- **Internal Port**: `8443` 
- **Protocol**: `TCP` or `All`
- **Status**: `Enabled` ✅
- Click **"Save"**

### Rule 3: NPM Admin Access
- **Service Name**: `Maaxly-Admin`
- **Device**: Select your computer or type `192.168.0.112`
- **External Port**: `81`
- **Internal Port**: `81`
- **Protocol**: `TCP` or `All` 
- **Status**: `Enabled` ✅
- Click **"Save"**

---

## Step 4: Additional TP-Link Settings (Important!)

### Enable UPnP (Recommended):
1. Go to **"Advanced"** → **"NAT Forwarding"** → **"UPnP"**
2. **Enable UPnP**: ✅ ON
3. Click **"Save"**

### Check SIP ALG (Disable if causing issues):
1. Go to **"Advanced"** → **"NAT Forwarding"** → **"ALG"** 
2. **Disable SIP ALG** if enabled (can interfere with port forwarding)
3. Click **"Save"**

---

## Step 5: Reboot Router
1. Go to **"Advanced"** → **"System Tools"** → **"Reboot"**
2. Click **"Reboot"**
3. **Wait 2-3 minutes** for router to fully restart

---

## Step 6: Test Configuration

### Test Internal Access First:
```powershell
# Run these in PowerShell:
curl http://192.168.0.112:8088
curl http://192.168.0.112:81
```

### Test External Access:
```powershell
# Use mobile hotspot or ask someone external to test:
curl http://123.201.177.58:8088
curl http://123.201.177.58:81
```

---

## 🎯 Specific TP-Link Interface Screenshots Reference

### What You'll See in TP-Link Interface:

**Step 1**: Main Dashboard
```
┌─────────────────────────────────────────────────┐
│ TP-Link Router Admin                            │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │ Basic   │ │Advanced │ │ System  │ │  WiFi   │ │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
└─────────────────────────────────────────────────┘
```
👆 Click **"Advanced"**

**Step 2**: Advanced Menu
```
┌─────────────────────────────────────────────────┐
│ Advanced Settings                               │
│ ├ Network                                       │
│ ├ Wireless                                      │  
│ ├ NAT Forwarding ← Click Here                   │
│ │  ├ Port Forwarding ← Then Click Here          │
│ │  ├ Port Triggering                            │
│ │  └ UPnP                                       │
│ ├ Security                                      │
│ └ System Tools                                  │
└─────────────────────────────────────────────────┘
```

**Step 3**: Port Forwarding Page
```
┌─────────────────────────────────────────────────┐
│ Port Forwarding                    [+ Add] ←    │
│ ┌─────────────────────────────────────────────┐ │
│ │ Service   │Ext Port│Int IP     │Int Port│En│ │
│ ├─────────────────────────────────────────────┤ │
│ │Maaxly-HTTP│ 8088   │192.168.0.1│ 8088   │✓ │ │
│ │           │        │      12   │        │  │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 🚨 Troubleshooting TP-Link Issues

### Can't Access Router (192.168.0.1):
- Try `192.168.1.1` instead
- Check if connected to router's WiFi/Ethernet
- Try different browser

### Login Issues:
- Default: `admin` / `admin`  
- Try: `admin` / `password`
- Check router bottom sticker for default credentials
- Reset router if needed (hold reset button 10 seconds)

### Port Forwarding Not Working:
1. **Double-check IP**: Make sure `192.168.0.112` is correct
2. **Disable Firewall Temporarily**: Advanced → Security → Firewall
3. **Check DHCP**: Make sure your computer has static/reserved IP
4. **Reboot Everything**: Router, then computer

### Common TP-Link Menu Variations:
- **Archer Series**: Advanced → NAT Forwarding → Port Forwarding  
- **AC Series**: Advanced → NAT Forwarding → Virtual Servers
- **N Series**: Advanced Settings → Virtual Servers
- **Older Models**: Advanced → Gaming Accelerator → Port Forwarding

---

## ✅ Success Verification

After configuration, you should see:

### In Router Interface:
```
Port Forwarding Rules:
✅ Maaxly-HTTP    | 8088 → 192.168.0.112:8088 | Enabled
✅ Maaxly-HTTPS   | 8443 → 192.168.0.112:8443 | Enabled  
✅ Maaxly-Admin   | 81   → 192.168.0.112:81   | Enabled
```

### Test URLs Should Work:
- ✅ `http://123.201.177.58:8088` (Your Maaxly app)
- ✅ `http://123.201.177.58:81` (NPM admin panel)

---

## 🎯 Next Steps After Port Forwarding Works

1. **Configure NPM**: Go to `http://localhost:81`
2. **Add Domain**: Point `maaxly-prod-mvp.duckdns.org` to `maaxly-frontend-prod:80`
3. **Setup SSL**: Request Let's Encrypt certificate
4. **Test Domain**: `https://maaxly-prod-mvp.duckdns.org`