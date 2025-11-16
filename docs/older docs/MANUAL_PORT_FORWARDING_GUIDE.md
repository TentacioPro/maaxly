# Manual Port Forwarding Setup for TP-Link Router

## 🎯 Your Router Status
- ✅ UPnP is enabled but doesn't support automatic forwarding
- ✅ Local services are running (ports 8088, 8443, 81 reachable)
- ✅ Windows Firewall configured
- ❌ Need manual port forwarding in router

## 🔍 Finding Virtual Servers in Your TP-Link Router

Since you only see "Port Triggering", your router uses "Virtual Servers" for port forwarding. Here are the exact steps:

### Step 1: Access Router Admin Panel
1. Open browser: `http://192.168.0.1`
2. Login with your router password

### Step 2: Navigate to Virtual Servers
Look for these menu paths (try them in order):

#### Option A: Advanced → NAT → Virtual Servers
```
Advanced → NAT → Virtual Servers
```

#### Option B: Network → NAT → Virtual Servers
```
Network → NAT → Virtual Servers
```

#### Option C: Forwarding → Virtual Servers
```
Forwarding → Virtual Servers
```

#### Option D: Applications & Gaming → Virtual Servers
```
Applications & Gaming → Virtual Servers
```

### Step 3: Add Port Forwarding Rules

For each port, click **"Add"** or **"+"** button and enter:

#### Rule 1: Maaxly HTTP (Port 8088)
```
Service Name: Maaxly-HTTP
External Port: 8088
Internal IP: 192.168.0.112
Internal Port: 8088
Protocol: TCP
Status: Enabled ✓
```

#### Rule 2: Maaxly HTTPS (Port 8443)
```
Service Name: Maaxly-HTTPS
External Port: 8443
Internal IP: 192.168.0.112
Internal Port: 8443
Protocol: TCP
Status: Enabled ✓
```

#### Rule 3: Nginx Proxy Manager Admin (Port 81)
```
Service Name: NPM-Admin
External Port: 81
Internal IP: 192.168.0.112
Internal Port: 81
Protocol: TCP
Status: Enabled ✓
```

### Step 4: Save and Test

1. **Save** each rule
2. **Reboot router** (important!)
3. Test external access:
   ```powershell
   .\setup-port-forwarding-simple.ps1 -Test
   ```

## 🆘 If You Can't Find Virtual Servers

### Check Router Model
Look at the bottom/sticker of your router and search:
```
"TP-Link [YOUR-MODEL] virtual servers setup"
```

### Alternative Menu Names
Your router might call it:
- **"Port Forwarding"**
- **"Port Mapping"**
- **"NAT Forwarding"**
- **"Gaming"** section

### Try Different Router IP
Some TP-Link models use: `192.168.1.1`

## 🧪 Testing External Access

After setup, test with:
```powershell
# Check if ports are open externally
.\setup-port-forwarding-simple.ps1 -Test
```

Or use online tools:
- `https://canyouseeme.org/` (enter port 8088)
- `https://www.portcheckers.com/` (check ports 8088, 8443, 81)

## 🎯 Expected Result

Once configured, you should be able to access:
- **Maaxly App**: `http://YOUR_PUBLIC_IP:8088`
- **NPM Admin**: `http://YOUR_PUBLIC_IP:81`

## 📞 Need Help?

If you still can't find the menu:
1. **Take a screenshot** of your router interface
2. **Note your router model** from the sticker
3. Search: `"TP-Link [model] port forwarding"`

## ⚠️ Security Note
Port forwarding exposes your services to the internet. Consider:
- Using strong passwords
- Enabling firewall rules
- Monitoring access logs</content>
<parameter name="filePath">e:\Other\maaxly aug 31\EOM August 31\MANUAL_PORT_FORWARDING_GUIDE.md