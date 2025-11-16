# TP-Link Router Port Forwarding Setup Guide

## 📋 Current Status
- ✅ Local services running on ports 8088, 8443, 81
- ❌ External access blocked (needs router port forwarding)
- 🎯 Need to configure "Virtual Servers" in TP-Link router

## 🔧 Step-by-Step Router Configuration

### Step 1: Access Router Admin
1. Open browser: `http://192.168.0.1`
2. Login with your admin password

### Step 2: Find Virtual Servers Menu
Your TP-Link router calls port forwarding "Virtual Servers". Look for it here:

**Try these menu paths in order:**

#### Path 1: Advanced → NAT → Virtual Servers
```
Menu: Advanced
Submenu: NAT
Option: Virtual Servers
```

#### Path 2: Network → NAT → Virtual Servers
```
Menu: Network
Submenu: NAT
Option: Virtual Servers
```

#### Path 3: Forwarding → Virtual Servers
```
Menu: Forwarding
Option: Virtual Servers
```

#### Path 4: Applications & Gaming → Virtual Servers
```
Menu: Applications & Gaming
Option: Virtual Servers
```

### Step 3: Add Port Forwarding Rules

Once you find "Virtual Servers", click **"Add"** or **"+"** button and enter these **3 rules**:

#### Rule 1: Maaxly HTTP (Port 8088)
```
Name: Maaxly-HTTP
External Port Start: 8088
External Port End: 8088
Protocol: TCP
Internal IP: 192.168.0.112
Internal Port: 8088
Status: Enabled ✓
```

#### Rule 2: Maaxly HTTPS (Port 8443)
```
Name: Maaxly-HTTPS
External Port Start: 8443
External Port End: 8443
Protocol: TCP
Internal IP: 192.168.0.112
Internal Port: 8443
Status: Enabled ✓
```

#### Rule 3: NPM Admin (Port 81)
```
Name: NPM-Admin
External Port Start: 81
External Port End: 81
Protocol: TCP
Internal IP: 192.168.0.112
Internal Port: 81
Status: Enabled ✓
```

### Step 4: Save and Reboot
1. **Save** each rule
2. **Save** router settings
3. **Reboot** the router (very important!)

### Step 5: Test External Access
After router reboots, test:
```powershell
.\setup-port-forwarding-simple.ps1 -Test
```

## 🎯 Expected Results After Setup
You should see:
```
[SUCCESS] External access on port 8088: OPEN ✅
[SUCCESS] External access on port 8443: OPEN ✅
[SUCCESS] External access on port 81: OPEN ✅
```

## 🌐 Access URLs
Once working, access from anywhere:
- **Maaxly App**: `http://123.201.177.58:8088`
- **NPM Admin**: `http://123.201.177.58:81`

## 🆘 Can't Find Virtual Servers?

### Screenshot Your Router Interface
Take a screenshot of your router's main menu and share it - I can help identify the correct path.

### Check Router Model
Look at the bottom of your router for the model number (e.g., TL-WR841N) and search:
```
"TP-Link [MODEL] virtual servers port forwarding"
```

### Alternative Names
Your router might call it:
- **"Port Forwarding"**
- **"Port Mapping"**
- **"NAT Settings"**

## ⚡ Quick Test During Setup
After adding each rule, you can test individually:
```powershell
# Test just port 8088
Test-NetConnection -ComputerName 123.201.177.58 -Port 8088
```

## 🔄 If Still Not Working
1. **Double-check IP**: Ensure internal IP is `192.168.0.112`
2. **Reboot router**: Sometimes required for changes to take effect
3. **Check firewall**: Make sure Windows Firewall allows the ports
4. **Try DMZ**: As temporary test (⚠️ less secure)

## 📞 Need Help?
If you get stuck:
1. Screenshot your router interface
2. Note your exact router model
3. Describe what menus you see

Let's get your Maaxly app accessible from the internet! 🚀</content>
<parameter name="filePath">e:\Other\maaxly aug 31\EOM August 31\ROUTER_SETUP_GUIDE.md