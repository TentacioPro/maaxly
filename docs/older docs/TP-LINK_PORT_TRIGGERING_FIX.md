# TP-Link Router: Port Triggering Instead of Port Forwarding

## 🔍 Your TP-Link Router Interface

Since you only see **"Port Triggering"**, you have one of these TP-Link router models:
- **TL-WR841N/ND** series
- **TL-MR3420** series  
- **Older Archer models**
- **Basic home routers**

## 🎯 What You Need to Do

### Step 1: Look for "Virtual Servers" or "Gaming"
In your router interface, look for these menu options:
- **"Virtual Servers"** (most common)
- **"Gaming & Applications"** → **"Virtual Servers"**
- **"Forwarding"** → **"Virtual Servers"**

### Step 2: If You Only See "Port Triggering"

**Port Triggering** is different from **Port Forwarding**. We need **Port Forwarding/Virtual Servers**.

Try these alternatives:

#### Option A: Check Different Menu Sections
1. Look under **"Network"** → **"NAT"** → **"Virtual Servers"**
2. Look under **"Advanced"** → **"NAT"** → **"Virtual Servers"**
3. Look under **"Applications"** → **"Virtual Servers"**

#### Option B: Try Different Router IP
Some TP-Link routers use `192.168.1.1` instead of `192.168.0.1`

#### Option C: Check Router Model
Look at the bottom/sticker of your router for the model number, then search:
```
"TP-Link [MODEL] virtual servers setup"
```

## 🔧 Alternative: Use UPnP (Automatic Method)

Since manual port forwarding is tricky, let's try the **automatic UPnP method**:

### Step 1: Enable UPnP in Router
1. In your router, find **"UPnP"** settings
2. **Enable UPnP** ✅
3. **Save** and **reboot router**

### Step 2: Run Automatic Script
```powershell
# Run PowerShell as Administrator, then:
Set-Location "E:\Other\maaxly aug 31\EOM August 31"
.\setup-upnp-forwarding.ps1
```

**❌ If UPnP fails (like in your case):**
Your router supports UPnP but doesn't allow automatic port forwarding. We need manual configuration.

## 📱 Manual Port Forwarding (If UPnP Works)

If UPnP succeeds, you can skip manual configuration. But if you need manual setup:

### Common TP-Link Menu Paths:
```
Advanced → NAT → Virtual Servers
Network → NAT → Virtual Servers  
Applications → Port Forwarding
Gaming → Virtual Servers
```

### Virtual Servers Configuration:
```
Service Name: Maaxly-HTTP
External Port: 8088
Internal IP: 192.168.0.112
Internal Port: 8088
Protocol: TCP
Status: Enabled
```

## 🆘 If Nothing Works

### Option 1: Router Firmware Update
1. Go to TP-Link website
2. Download latest firmware for your model
3. Update router firmware (backup settings first)

### Option 2: Use DMZ (Temporary Solution)
**⚠️ SECURITY RISK - Use temporarily only**
1. Find **"DMZ"** settings in router
2. Enable DMZ for IP: `192.168.0.112`
3. Test access, then disable DMZ

### Option 3: Contact ISP
Some ISPs provide modem/router combos that block port forwarding. Contact your ISP to enable it.

## 🧪 Testing Methods

### Test 1: UPnP Automatic
```powershell
# Run as Administrator
.\setup-upnp-forwarding.ps1
```

### Test 2: Manual Port Check
Use online tools:
- `https://canyouseeme.org/` - Enter port 8088
- `https://www.portcheckers.com/` - Check ports 8088, 8443, 81

### Test 3: External Test
Ask someone outside your network to test:
```
http://123.201.177.58:8088
```

## 📞 Support Options

1. **TP-Link Support**: Call TP-Link customer support with your model number
2. **Online Forums**: Search "TP-Link [your-model] port forwarding"
3. **Reset Router**: Hold reset button 10 seconds (loses all settings)

## 🎯 Quick Diagnosis

Run this to check your setup:
```powershell
.\setup-port-forwarding-simple.ps1 -Test
```

This will show if ports are accessible externally.