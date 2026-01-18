# 🚀 Puurga Deployment Guide - GitHub Actions to Digital Ocean

This guide will help you set up automatic deployment from GitHub to your Digital Ocean Droplet.

## 📋 Prerequisites

- Digital Ocean Droplet with Ubuntu 20.04+ running
- GitHub repository for your Puurga project
- SSH access to your droplet
- Node.js, PostgreSQL, Nginx, and PM2 installed on the droplet

---

## 🔧 Step 1: Prepare Your Digital Ocean Droplet

### 1.1 SSH into your droplet
```bash
ssh root@your-droplet-ip
```

### 1.2 Create application directory
```bash
sudo mkdir -p /var/www/puurga
sudo chown -R $USER:$USER /var/www/puurga
cd /var/www/puurga
```

### 1.3 Clone your repository
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
```

### 1.4 Set up environment variables
Create a `.env` file in the backend directory:
```bash
cd /var/www/puurga/backend
nano .env
```

Add your environment variables:
```env
DATABASE_URL=postgresql://puurga:your_password@localhost:5432/puurga
JWT_SECRET=your_jwt_secret_here
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
NODE_ENV=production
PORT=3005
```

### 1.5 Initial build and start
```bash
# Backend
cd /var/www/puurga/backend
npm install
npm run build

# Frontend
cd /var/www/puurga
npm install
npm run build

# Start with PM2
pm2 start backend/dist/server.js --name puurga-backend --instances 2 --exec-mode cluster
pm2 save
pm2 startup
```

---

## 🔑 Step 2: Set Up SSH Key for GitHub Actions

### 2.1 Generate SSH key on your droplet (if not already done)
```bash
ssh-keygen -t ed25519 -C "github-actions@puurga" -f ~/.ssh/github_actions
```

### 2.2 Add the public key to authorized_keys
```bash
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
```

### 2.3 Copy the private key (you'll need this for GitHub)
```bash
cat ~/.ssh/github_actions
```
**Copy the entire output including `-----BEGIN` and `-----END` lines**

---

## 🔐 Step 3: Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add the following secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `DO_HOST` | `your-droplet-ip` | Your Digital Ocean droplet IP address |
| `DO_USERNAME` | `root` or `your-user` | SSH username (usually root or your user) |
| `DO_SSH_KEY` | `[private key content]` | The private key from step 2.3 |
| `DO_PORT` | `22` | SSH port (default is 22) |
| `DO_APP_PATH` | `/var/www/puurga` | Path to your app on the server |

### How to add secrets:
1. Click **"New repository secret"**
2. Enter the **Name** (e.g., `DO_HOST`)
3. Paste the **Value**
4. Click **"Add secret"**
5. Repeat for all secrets

---

## 📝 Step 4: Configure Git on Your Droplet

### 4.1 Set up Git credentials (for pulling)
```bash
cd /var/www/puurga
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
```

### 4.2 For private repositories, set up GitHub token
```bash
# Create a GitHub Personal Access Token (PAT)
# Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
# Generate new token with 'repo' scope

# Configure Git to use the token
git remote set-url origin https://YOUR_GITHUB_USERNAME:YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO.git
```

---

## 🎯 Step 5: Test the Deployment

### 5.1 Make a test commit
```bash
# On your local machine
echo "# Test deployment" >> README.md
git add .
git commit -m "test: trigger deployment"
git push origin main
```

### 5.2 Watch the deployment
1. Go to your GitHub repository
2. Click on **"Actions"** tab
3. You should see your workflow running
4. Click on it to see the live logs

### 5.3 Verify on your server
```bash
ssh root@your-droplet-ip
pm2 logs puurga-backend
```

---

## 🔍 Step 6: Verify Nginx Configuration

Ensure your Nginx configuration is correct:

```bash
sudo nano /etc/nginx/sites-available/puurga
```

Should contain:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/puurga/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Uploads
    location /uploads {
        alias /var/www/puurga/uploads;
    }
}
```

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🛠️ Troubleshooting

### Deployment fails with "Permission denied"
```bash
# On your droplet, ensure proper permissions
sudo chown -R $USER:$USER /var/www/puurga
chmod +x /var/www/puurga/server-deploy.sh
```

### PM2 process not restarting
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs puurga-backend

# Restart manually
pm2 restart puurga-backend
```

### Frontend not updating
```bash
# Ensure nginx has access to the dist folder
sudo chown -R www-data:www-data /var/www/puurga/frontend/dist
sudo chmod -R 755 /var/www/puurga/frontend/dist
```

### Git pull fails
```bash
# Reset any local changes
cd /var/www/puurga
git fetch origin
git reset --hard origin/main
```

---

## 📊 Monitoring Your Deployment

### Check PM2 status
```bash
pm2 status
pm2 logs puurga-backend --lines 100
```

### Check Nginx logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Check system resources
```bash
htop
df -h
free -h
```

---

## 🔄 Manual Deployment (if needed)

If you need to deploy manually:

```bash
ssh root@your-droplet-ip
cd /var/www/puurga
./server-deploy.sh
```

---

## 🎉 Success!

Your GitHub Actions workflow is now set up! Every time you push to the `main` or `master` branch, your app will automatically deploy to your Digital Ocean Droplet.

### Workflow triggers:
- ✅ Push to `main` or `master` branch
- ✅ Manual trigger via GitHub Actions UI (workflow_dispatch)

### What happens during deployment:
1. 📥 Pulls latest code from GitHub
2. 🔧 Installs backend dependencies and builds
3. 🎨 Installs frontend dependencies and builds
4. 📦 Copies frontend build to nginx directory
5. ♻️ Restarts backend with PM2
6. 🔄 Reloads nginx
7. ✅ Confirms successful deployment

---

## 🔐 Security Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use strong SSH keys** - Ed25519 or RSA 4096-bit
3. **Limit SSH access** - Use firewall rules
4. **Keep secrets in GitHub Secrets** - Never in code
5. **Regular updates** - Keep server packages updated
6. **Monitor logs** - Check for suspicious activity

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Digital Ocean Deployment Guide](https://www.digitalocean.com/community/tutorials)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

**Need help?** Check the GitHub Actions logs in your repository's Actions tab for detailed error messages.
