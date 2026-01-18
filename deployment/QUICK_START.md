# Quick Start Deployment Guide

## 5-Step Deployment Process

### Prerequisites
- DigitalOcean droplet IP address
- SSH access configured
- Git Bash or PowerShell on Windows

---

## Step 1: Setup Server (5-10 min)

```powershell
# From local machine - Upload setup script
scp "G:\Chris Home\Documents\CHRISTOPHER WORK FILE\Adam Projects\Puurga\New folder\Puurga\Puurga\deployment\1-server-setup.sh" root@YOUR_DROPLET_IP:/root/

# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Run setup
chmod +x /root/1-server-setup.sh
bash /root/1-server-setup.sh
```

---

## Step 2: Transfer Files (2-5 min)

**Edit the transfer script first:**
```powershell
# Open deployment\2-transfer-files.ps1
# Change: $DROPLET_IP = "YOUR_ACTUAL_IP"
```

**Run transfer:**
```powershell
cd "G:\Chris Home\Documents\CHRISTOPHER WORK FILE\Adam Projects\Puurga\New folder\Puurga\Puurga\deployment"
.\2-transfer-files.ps1
```

---

## Step 3: Configure Environment (2 min)

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Create .env file
cd /var/www/app/backend
cp .env.production.template .env
nano .env
```

**Update these critical values:**
```env
DB_PASSWORD=your_secure_password
JWT_SECRET=$(openssl rand -base64 32)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key
ALLOWED_ORIGINS=http://YOUR_DROPLET_IP
```

**Update Nginx config:**
```bash
nano /var/www/app/nginx.conf
# Change: server_name YOUR_DROPLET_IP;
```

Save and exit (Ctrl+X, Y, Enter)

---

## Step 4: Deploy Application (5-15 min)

```powershell
# Upload deployment script
scp "G:\Chris Home\Documents\CHRISTOPHER WORK FILE\Adam Projects\Puurga\New folder\Puurga\Puurga\deployment\3-deploy-app.sh" root@YOUR_DROPLET_IP:/var/www/app/
```

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Run deployment
cd /var/www/app
chmod +x 3-deploy-app.sh
bash 3-deploy-app.sh
```

When asked about migrations, answer `y` for first deployment.

---

## Step 5: Verify (1 min)

```powershell
# Upload verification script
scp "G:\Chris Home\Documents\CHRISTOPHER WORK FILE\Adam Projects\Puurga\New folder\Puurga\Puurga\deployment\4-verify-deployment.sh" root@YOUR_DROPLET_IP:/var/www/app/
```

```bash
# Run verification
cd /var/www/app
chmod +x 4-verify-deployment.sh
bash 4-verify-deployment.sh
```

**Access your app:**
```
http://YOUR_DROPLET_IP
```

---

## Quick Commands Reference

### Check Status
```bash
pm2 status                    # Backend status
systemctl status nginx        # Nginx status
pm2 logs puurga-backend       # View logs
```

### Restart Services
```bash
pm2 restart puurga-backend    # Restart backend
systemctl reload nginx        # Reload Nginx
```

### Troubleshooting
```bash
pm2 logs puurga-backend --lines 50              # Backend logs
tail -f /var/log/nginx/puurga_error.log         # Nginx errors
nginx -t                                         # Test Nginx config
```

---

## Update Application

```powershell
# Transfer updated files
.\deployment\2-transfer-files.ps1
```

```bash
# SSH and update
ssh root@YOUR_DROPLET_IP
cd /var/www/app
bash 5-update-deployment.sh
```

---

## Common Issues

**Backend won't start:**
```bash
pm2 logs puurga-backend
# Check .env file exists and is correct
cat /var/www/app/backend/.env
```

**Frontend 404:**
```bash
# Rebuild frontend
cd /var/www/app/frontend
npm run build
systemctl reload nginx
```

**API not responding:**
```bash
# Check CORS in backend/server.ts
# Ensure droplet IP is in allowed origins
pm2 restart puurga-backend
```

---

## That's It!

Your application should now be running at **http://YOUR_DROPLET_IP**

For detailed troubleshooting, see `DEPLOYMENT_GUIDE.md`
