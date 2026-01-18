# Puurga Application - Direct SSH Deployment Guide

## Overview

This guide walks you through deploying your full-stack Puurga application directly to a DigitalOcean droplet via SSH, without using GitHub or CI/CD pipelines.

**Technology Stack:**
- **Backend:** Node.js + Express + TypeScript + PostgreSQL/Supabase
- **Frontend:** React + Vite + TypeScript
- **Process Manager:** PM2
- **Web Server:** Nginx
- **Database:** Supabase (cloud) or PostgreSQL (local)

---

## Prerequisites

### On Your Local Machine (Windows)
- SSH client installed (Git Bash, WSL, or native Windows SSH)
- SCP/RSYNC available (comes with Git for Windows)
- Your DigitalOcean droplet IP address
- SSH key configured for droplet access

### On Your DigitalOcean Droplet
- Ubuntu 20.04 or 22.04 LTS
- Root or sudo access
- Minimum 1GB RAM (2GB recommended)
- At least 10GB free disk space

---

## Deployment Steps

### Step 1: Prepare Your Droplet

**1.1. SSH into your droplet:**
```bash
ssh root@YOUR_DROPLET_IP
```

**1.2. Upload the server setup script:**

From your local machine (PowerShell):
```powershell
scp "G:\Chris Home\Documents\CHRISTOPHER WORK FILE\Adam Projects\Puurga\New folder\Puurga\Puurga\deployment\1-server-setup.sh" root@YOUR_DROPLET_IP:/root/
```

**1.3. Run the server setup script on the droplet:**
```bash
chmod +x /root/1-server-setup.sh
bash /root/1-server-setup.sh
```

This script will:
- Update system packages
- Install Node.js LTS (v20.x)
- Install PM2 globally
- Install Nginx
- Optionally install PostgreSQL
- Configure UFW firewall
- Create application directories

**Expected Duration:** 5-10 minutes

---

### Step 2: Configure Environment Variables

**2.1. After file transfer (Step 3), create the backend .env file:**

SSH into your droplet:
```bash
cd /var/www/app/backend
cp .env.production.template .env
nano .env
```

**2.2. Update the following critical values:**

```env
# Database Configuration
DB_HOST=localhost                          # Or your Supabase host
DB_PORT=5432
DB_NAME=puurga_db
DB_USER=puurga_user
DB_PASSWORD=YOUR_SECURE_PASSWORD           # Generate a strong password

# JWT Secret (CRITICAL - Generate a strong random string)
JWT_SECRET=YOUR_JWT_SECRET_HERE            # Use: openssl rand -base64 32

# Server Configuration
PORT=3005
NODE_ENV=production

# Supabase Configuration (if using Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Storage Configuration
UPLOAD_DIR=/var/www/app/uploads
MAX_FILE_SIZE=10485760

# CORS Origins (Update with your droplet IP)
ALLOWED_ORIGINS=http://YOUR_DROPLET_IP,https://YOUR_DROPLET_IP
```

**2.3. Generate a secure JWT secret:**
```bash
openssl rand -base64 32
```

**2.4. Save and exit:**
- Press `Ctrl+X`, then `Y`, then `Enter`

---

### Step 3: Transfer Application Files

**Option A: Using PowerShell (Recommended for Windows)**

**3.1. Edit the transfer script with your droplet IP:**

Open `deployment\2-transfer-files.ps1` and update:
```powershell
$DROPLET_IP = "YOUR_ACTUAL_DROPLET_IP"
```

**3.2. Run the transfer script:**
```powershell
cd "G:\Chris Home\Documents\CHRISTOPHER WORK FILE\Adam Projects\Puurga\New folder\Puurga\Puurga\deployment"
.\2-transfer-files.ps1
```

**Option B: Using Git Bash or WSL**

**3.1. Edit the transfer script:**
```bash
nano deployment/2-transfer-files.sh
# Update DROPLET_IP="YOUR_ACTUAL_DROPLET_IP"
```

**3.2. Run the transfer script:**
```bash
chmod +x deployment/2-transfer-files.sh
bash deployment/2-transfer-files.sh
```

**What gets transferred:**
- Backend source code and configuration
- Frontend source code and configuration
- Deployment scripts
- PM2 ecosystem configuration
- Nginx configuration template

**Expected Duration:** 2-5 minutes (depending on connection speed)

---

### Step 4: Update Nginx Configuration

**4.1. SSH into your droplet:**
```bash
ssh root@YOUR_DROPLET_IP
```

**4.2. Edit the Nginx configuration:**
```bash
nano /var/www/app/nginx.conf
```

**4.3. Replace `YOUR_DROPLET_IP` with your actual IP:**
```nginx
server_name YOUR_DROPLET_IP;  # Change this line
```

**4.4. Save and exit** (Ctrl+X, Y, Enter)

---

### Step 5: Deploy the Application

**5.1. Upload the deployment script:**

From your local machine:
```powershell
scp "G:\Chris Home\Documents\CHRISTOPHER WORK FILE\Adam Projects\Puurga\New folder\Puurga\Puurga\deployment\3-deploy-app.sh" root@YOUR_DROPLET_IP:/var/www/app/
```

**5.2. SSH into your droplet and run deployment:**
```bash
ssh root@YOUR_DROPLET_IP
cd /var/www/app
chmod +x 3-deploy-app.sh
bash 3-deploy-app.sh
```

This script will:
1. Install backend dependencies
2. Build backend TypeScript code
3. Install frontend dependencies
4. Build frontend for production
5. Configure Nginx
6. Start backend with PM2
7. Enable PM2 startup on boot

**Expected Duration:** 5-15 minutes

**Important:** The script will ask if you want to run database migrations. Answer `y` if this is your first deployment.

---

### Step 6: Verify Deployment

**6.1. Upload the verification script:**
```powershell
scp "G:\Chris Home\Documents\CHRISTOPHER WORK FILE\Adam Projects\Puurga\New folder\Puurga\Puurga\deployment\4-verify-deployment.sh" root@YOUR_DROPLET_IP:/var/www/app/
```

**6.2. Run verification:**
```bash
cd /var/www/app
chmod +x 4-verify-deployment.sh
bash 4-verify-deployment.sh
```

**6.3. Check all items pass:**
- ✓ PM2 process is running
- ✓ Backend is responding
- ✓ Nginx is running
- ✓ Nginx configuration is valid
- ✓ Frontend build exists
- ✓ Uploads directory exists
- ✓ Firewall is active
- ✓ Frontend is accessible
- ✓ API is accessible

**6.4. Access your application:**

Open your browser and navigate to:
```
http://YOUR_DROPLET_IP
```

You should see your Puurga application running!

---

### Step 7: Test Reboot Safety

**7.1. Reboot the droplet:**
```bash
reboot
```

**7.2. Wait 1-2 minutes, then SSH back in:**
```bash
ssh root@YOUR_DROPLET_IP
```

**7.3. Verify services auto-started:**
```bash
pm2 status
systemctl status nginx
```

Both should be running automatically.

---

## Post-Deployment Tasks

### Database Setup (If Using Local PostgreSQL)

If you installed PostgreSQL locally:

**1. Create database and user:**
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE puurga_db;
CREATE USER puurga_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE puurga_db TO puurga_user;
\q
```

**2. Run migrations:**
```bash
cd /var/www/app/backend
npm run migrate  # If you have a migration script
```

### SSL/HTTPS Setup (Optional but Recommended)

**1. Install Certbot:**
```bash
apt-get install -y certbot python3-certbot-nginx
```

**2. Get SSL certificate:**
```bash
certbot --nginx -d your-domain.com
```

**3. Auto-renewal:**
```bash
certbot renew --dry-run
```

---

## Updating Your Application

When you need to update your application:

**1. Transfer updated files:**

Run the transfer script again from your local machine:
```powershell
.\deployment\2-transfer-files.ps1
```

**2. Run the update script on the droplet:**
```bash
ssh root@YOUR_DROPLET_IP
cd /var/www/app
chmod +x 5-update-deployment.sh
bash 5-update-deployment.sh
```

This will rebuild and restart both frontend and backend.

---

## Troubleshooting

### Backend Not Starting

**Check PM2 logs:**
```bash
pm2 logs puurga-backend
```

**Common issues:**
- Missing .env file
- Invalid database credentials
- Port 3005 already in use

**Solutions:**
```bash
# Check if port is in use
lsof -i :3005

# Restart backend
pm2 restart puurga-backend

# Check environment variables
cat /var/www/app/backend/.env
```

### Frontend Not Loading

**Check Nginx logs:**
```bash
tail -f /var/log/nginx/puurga_error.log
```

**Common issues:**
- Frontend not built
- Nginx configuration errors
- File permissions

**Solutions:**
```bash
# Rebuild frontend
cd /var/www/app/frontend
npm run build

# Test Nginx config
nginx -t

# Reload Nginx
systemctl reload nginx

# Check permissions
ls -la /var/www/app/frontend/dist
```

### API Requests Failing

**Check CORS configuration:**
```bash
nano /var/www/app/backend/server.ts
```

Ensure your droplet IP is in the CORS origins array.

**Restart backend after changes:**
```bash
cd /var/www/app/backend
npm run build
pm2 restart puurga-backend
```

### Database Connection Issues

**Test database connection:**
```bash
# For PostgreSQL
psql -h localhost -U puurga_user -d puurga_db

# Check backend logs
pm2 logs puurga-backend --lines 100
```

**Verify .env database settings:**
```bash
cat /var/www/app/backend/.env | grep DB_
```

### File Upload Issues

**Check uploads directory permissions:**
```bash
ls -la /var/www/app/uploads
chown -R www-data:www-data /var/www/app/uploads
chmod -R 775 /var/www/app/uploads
```

**Check Nginx configuration:**
```bash
nano /etc/nginx/sites-available/puurga
# Verify the /uploads location block
```

---

## Useful Commands

### PM2 Commands
```bash
pm2 status                    # View all processes
pm2 logs puurga-backend       # View logs
pm2 restart puurga-backend    # Restart backend
pm2 stop puurga-backend       # Stop backend
pm2 start puurga-backend      # Start backend
pm2 monit                     # Monitor in real-time
pm2 save                      # Save process list
```

### Nginx Commands
```bash
systemctl status nginx        # Check status
systemctl restart nginx       # Restart Nginx
systemctl reload nginx        # Reload config
nginx -t                      # Test configuration
tail -f /var/log/nginx/puurga_error.log   # View error logs
tail -f /var/log/nginx/puurga_access.log  # View access logs
```

### System Commands
```bash
df -h                         # Check disk space
free -h                       # Check memory
htop                          # Monitor resources
journalctl -xe                # System logs
ufw status                    # Firewall status
```

---

## Security Checklist

- [ ] Strong JWT_SECRET generated
- [ ] Secure database password set
- [ ] UFW firewall enabled
- [ ] Only necessary ports open (22, 80, 443)
- [ ] SSH key-based authentication configured
- [ ] Regular system updates scheduled
- [ ] SSL/HTTPS configured (if using domain)
- [ ] Database backups configured
- [ ] File upload size limits set
- [ ] Rate limiting enabled (already in code)

---

## Performance Optimization

### Enable PM2 Clustering (Optional)
```bash
# Edit ecosystem.config.js
nano /var/www/app/ecosystem.config.js

# Change:
instances: 1,
# To:
instances: 'max',  # Uses all CPU cores
exec_mode: 'cluster',
```

### Nginx Caching
Already configured in the provided nginx.conf with:
- Gzip compression
- Static file caching
- Browser caching headers

### Database Optimization
- Create indexes on frequently queried columns
- Use connection pooling (already in Sequelize)
- Regular VACUUM and ANALYZE (PostgreSQL)

---

## Backup Strategy

### Database Backups
```bash
# Create backup script
nano /root/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/puurga"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# PostgreSQL backup
pg_dump -U puurga_user puurga_db > $BACKUP_DIR/db_backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete
```

```bash
chmod +x /root/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /root/backup-db.sh
```

### File Backups
```bash
# Backup uploads directory
tar -czf /var/backups/puurga/uploads_$(date +%Y%m%d).tar.gz /var/www/app/uploads
```

---

## Monitoring

### Setup Basic Monitoring
```bash
# Install monitoring tools
apt-get install -y htop iotop nethogs

# Monitor PM2
pm2 install pm2-logrotate  # Auto-rotate logs
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Log Rotation
Already handled by PM2 and Nginx, but verify:
```bash
ls -la /etc/logrotate.d/nginx
```

---

## Next Steps

After successful deployment:

1. **Test all features** - Login, posts, messages, uploads, etc.
2. **Monitor performance** - Use `pm2 monit` and check logs
3. **Setup domain** (optional) - Point your domain to droplet IP
4. **Enable HTTPS** - Use Certbot for free SSL
5. **Configure backups** - Database and file backups
6. **Setup monitoring** - Consider tools like UptimeRobot
7. **Document custom changes** - Keep notes of any modifications

---

## Support & Maintenance

### Regular Maintenance Tasks
- **Weekly:** Check logs for errors
- **Monthly:** Update system packages (`apt-get update && apt-get upgrade`)
- **Monthly:** Review disk space and clean old logs
- **Quarterly:** Review and update dependencies

### Getting Help
If you encounter issues:
1. Check the troubleshooting section above
2. Review PM2 logs: `pm2 logs puurga-backend`
3. Review Nginx logs: `tail -f /var/log/nginx/puurga_error.log`
4. Check system logs: `journalctl -xe`

---

## Summary

You have successfully deployed your Puurga application using:
- ✅ Direct SSH deployment (no GitHub required)
- ✅ PM2 for process management
- ✅ Nginx as reverse proxy
- ✅ Automated startup on reboot
- ✅ Production-ready configuration

Your application is now running at: **http://YOUR_DROPLET_IP**

GitHub integration can be added later once the application is stable and tested.
