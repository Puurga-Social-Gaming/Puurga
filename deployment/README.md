# Deployment Package for Puurga Application

This directory contains all necessary files and scripts for deploying your Puurga application directly to a DigitalOcean droplet via SSH.

## 📁 Files Overview

### Configuration Files
- **`nginx.conf`** - Nginx reverse proxy configuration
- **`ecosystem.config.js`** - PM2 process manager configuration
- **`.env.production.template`** - Backend environment variables template (in backend/)

### Deployment Scripts
- **`1-server-setup.sh`** - Initial server preparation (run on droplet)
- **`2-transfer-files.sh`** - File transfer script for Linux/Mac
- **`2-transfer-files.ps1`** - File transfer script for Windows PowerShell
- **`3-deploy-app.sh`** - Application deployment script (run on droplet)
- **`4-verify-deployment.sh`** - Deployment verification script (run on droplet)
- **`5-update-deployment.sh`** - Application update script (run on droplet)

### Documentation
- **`DEPLOYMENT_GUIDE.md`** - Comprehensive deployment guide with troubleshooting
- **`QUICK_START.md`** - Quick 5-step deployment process
- **`CHECKLIST.md`** - Pre-deployment and post-deployment checklist

## 🚀 Quick Start

### For Impatient Deployers

1. **Update your droplet IP** in `2-transfer-files.ps1` or `2-transfer-files.sh`
2. Follow the steps in `QUICK_START.md`
3. Your app will be live in ~20 minutes

### For Thorough Deployers

Read `DEPLOYMENT_GUIDE.md` for:
- Detailed explanations
- Security best practices
- Troubleshooting guides
- Performance optimization
- Backup strategies

## 📋 Deployment Process Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    LOCAL MACHINE (Windows)                   │
├─────────────────────────────────────────────────────────────┤
│  1. Edit 2-transfer-files.ps1 (set DROPLET_IP)             │
│  2. Run: .\2-transfer-files.ps1                             │
│     → Transfers all files to droplet                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              DIGITALOCEAN DROPLET (Ubuntu)                   │
├─────────────────────────────────────────────────────────────┤
│  3. SSH: ssh root@YOUR_DROPLET_IP                           │
│  4. Run: bash /root/1-server-setup.sh                       │
│     → Installs Node.js, PM2, Nginx, PostgreSQL              │
│                                                              │
│  5. Configure: nano /var/www/app/backend/.env               │
│     → Set database credentials, JWT secret, etc.            │
│                                                              │
│  6. Run: bash /var/www/app/3-deploy-app.sh                  │
│     → Builds backend, builds frontend, starts services      │
│                                                              │
│  7. Run: bash /var/www/app/4-verify-deployment.sh           │
│     → Verifies everything is working                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   YOUR APPLICATION IS LIVE!                  │
│              Access at: http://YOUR_DROPLET_IP               │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 What Gets Deployed

### Backend (`/var/www/app/backend/`)
- Express.js server with TypeScript
- WebSocket support for real-time features
- API routes for all application features
- Database migrations
- File upload handling

### Frontend (`/var/www/app/frontend/`)
- React + Vite production build
- Optimized static assets
- Service worker (if configured)
- All routes handled by SPA

### Infrastructure
- **PM2**: Manages backend process, auto-restart, logging
- **Nginx**: Serves frontend, proxies API requests, handles WebSocket
- **UFW**: Firewall configured for ports 22, 80, 443
- **Systemd**: Auto-starts PM2 and Nginx on boot

## 🔐 Security Considerations

### Before Deployment
- [ ] Generate strong JWT_SECRET
- [ ] Use secure database passwords
- [ ] Review CORS origins in backend/server.ts
- [ ] Ensure .env file is not committed to Git

### After Deployment
- [ ] Enable UFW firewall
- [ ] Setup SSH key authentication (disable password auth)
- [ ] Configure SSL/HTTPS with Let's Encrypt
- [ ] Setup automated backups
- [ ] Enable fail2ban for SSH protection

## 📊 Architecture

```
Internet
   ↓
Nginx (Port 80/443)
   ├─→ Frontend (Static Files) → /var/www/app/frontend/dist/
   ├─→ API Requests (/api/*) → Backend (Port 3005)
   ├─→ WebSocket (/ws) → Backend WebSocket
   └─→ Uploads (/uploads/*) → /var/www/app/uploads/
```

## 🛠️ Common Tasks

### View Logs
```bash
pm2 logs puurga-backend                      # Backend logs
tail -f /var/log/nginx/puurga_error.log      # Nginx errors
tail -f /var/log/nginx/puurga_access.log     # Nginx access
```

### Restart Services
```bash
pm2 restart puurga-backend                   # Restart backend
systemctl reload nginx                       # Reload Nginx
systemctl restart nginx                      # Restart Nginx
```

### Update Application
```bash
# From local machine
.\deployment\2-transfer-files.ps1

# On droplet
bash /var/www/app/5-update-deployment.sh
```

### Database Operations
```bash
# Backup database
pg_dump -U puurga_user puurga_db > backup.sql

# Restore database
psql -U puurga_user puurga_db < backup.sql

# Access database
psql -U puurga_user -d puurga_db
```

## 🐛 Troubleshooting

### Backend Issues
```bash
# Check if backend is running
pm2 status

# View detailed logs
pm2 logs puurga-backend --lines 100

# Check if port is in use
lsof -i :3005

# Restart backend
pm2 restart puurga-backend
```

### Frontend Issues
```bash
# Check if frontend files exist
ls -la /var/www/app/frontend/dist/

# Rebuild frontend
cd /var/www/app/frontend
npm run build

# Check Nginx config
nginx -t

# Reload Nginx
systemctl reload nginx
```

### Database Issues
```bash
# Test database connection
psql -h localhost -U puurga_user -d puurga_db

# Check database logs
tail -f /var/log/postgresql/postgresql-*.log

# Verify .env settings
cat /var/www/app/backend/.env | grep DB_
```

## 📈 Performance Optimization

### Enable PM2 Clustering
```javascript
// Edit /var/www/app/ecosystem.config.js
instances: 'max',      // Use all CPU cores
exec_mode: 'cluster',
```

### Nginx Caching
Already configured with:
- Gzip compression
- Static file caching (1 year for uploads)
- Browser caching headers

### Database Indexing
Add indexes to frequently queried columns in your database.

## 🔄 CI/CD Integration (Future)

After confirming the application works:
1. Setup GitHub repository
2. Configure GitHub Actions
3. Use deployment scripts as base for automation
4. Implement blue-green deployment strategy

## 📝 Environment Variables Reference

### Required
- `DB_HOST` - Database host
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - JWT signing secret (min 32 chars)

### Optional
- `PORT` - Backend port (default: 3005)
- `NODE_ENV` - Environment (production/development)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `UPLOAD_DIR` - Upload directory path
- `MAX_FILE_SIZE` - Max upload size in bytes

## 🆘 Getting Help

1. Check `DEPLOYMENT_GUIDE.md` troubleshooting section
2. Review logs: `pm2 logs puurga-backend`
3. Check Nginx logs: `tail -f /var/log/nginx/puurga_error.log`
4. Verify configuration: `nginx -t`
5. Check system logs: `journalctl -xe`

## 📚 Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [DigitalOcean Tutorials](https://www.digitalocean.com/community/tutorials)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## ⚠️ Important Notes

- **No GitHub Required**: This deployment is completely independent of Git
- **Direct SSH Only**: All operations via SSH and SCP/RSYNC
- **Production Ready**: Includes process management, reverse proxy, auto-restart
- **Reboot Safe**: Services auto-start on system reboot
- **Scalable**: Can be upgraded to multi-instance PM2 clustering

## 🎯 Success Criteria

Your deployment is successful when:
- ✅ Application accessible via browser at http://YOUR_DROPLET_IP
- ✅ PM2 shows backend running: `pm2 status`
- ✅ Nginx serving frontend and proxying API
- ✅ Database connected and migrations applied
- ✅ File uploads working
- ✅ WebSocket connections established
- ✅ Services survive reboot

## 📞 Support

For deployment issues:
1. Run verification script: `bash 4-verify-deployment.sh`
2. Check all items in `CHECKLIST.md`
3. Review troubleshooting in `DEPLOYMENT_GUIDE.md`

---

**Ready to deploy?** Start with `QUICK_START.md` for a fast deployment or `DEPLOYMENT_GUIDE.md` for detailed instructions.
