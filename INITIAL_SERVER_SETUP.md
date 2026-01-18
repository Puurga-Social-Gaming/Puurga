# 🖥️ Initial Digital Ocean Droplet Setup

This guide covers the **one-time setup** of your Digital Ocean Droplet. Run these commands only once when setting up a new server.

---

## 📋 Prerequisites

- Digital Ocean Droplet with Ubuntu 20.04 or 22.04
- Root or sudo access
- Your domain name (optional but recommended)

---

## 🔧 Step 1: Initial Server Configuration

### 1.1 Update system packages
```bash
sudo apt update
sudo apt upgrade -y
```

### 1.2 Create a non-root user (recommended)
```bash
adduser puurga
usermod -aG sudo puurga
```

### 1.3 Set up firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 📦 Step 2: Install Required Software

### 2.1 Install Node.js 18.x
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

### 2.2 Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2.3 Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2.4 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
pm2 startup systemd
```

### 2.5 Install Git
```bash
sudo apt install -y git
git --version
```

---

## 🗄️ Step 3: Configure PostgreSQL

### 3.1 Create database and user
```bash
sudo -u postgres psql
```

In PostgreSQL shell:
```sql
CREATE DATABASE puurga;
CREATE USER puurga WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE puurga TO puurga;
\q
```

### 3.2 Optimize PostgreSQL for production
```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Add/modify these settings:
```
shared_buffers = 256MB
effective_cache_size = 768MB
maintenance_work_mem = 64MB
work_mem = 4MB
max_connections = 100
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

---

## 📁 Step 4: Set Up Application Directory

### 4.1 Create app directory
```bash
sudo mkdir -p /var/www/puurga
sudo chown -R $USER:$USER /var/www/puurga
cd /var/www/puurga
```

### 4.2 Create uploads directory
```bash
mkdir -p /var/www/puurga/uploads
chmod 755 /var/www/puurga/uploads
```

### 4.3 Clone your repository
```bash
# For public repos
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# For private repos (use Personal Access Token)
git clone https://YOUR_GITHUB_USERNAME:YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO.git .
```

---

## 🔐 Step 5: Configure Environment Variables

### 5.1 Create backend .env file
```bash
cd /var/www/puurga/backend
nano .env
```

Add your environment variables:
```env
# Database
DATABASE_URL=postgresql://puurga:your_password@localhost:5432/puurga

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Server
NODE_ENV=production
PORT=3005

# File Upload
UPLOAD_PATH=/var/www/puurga/uploads
```

### 5.2 Secure the .env file
```bash
chmod 600 .env
```

---

## 🌐 Step 6: Configure Nginx

### 6.1 Create Nginx configuration
```bash
sudo nano /etc/nginx/sites-available/puurga
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend
    location / {
        root /var/www/puurga/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # Uploads
    location /uploads {
        alias /var/www/puurga/uploads;
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

### 6.2 Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/puurga /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🚀 Step 7: Initial Build and Deploy

### 7.1 Build backend
```bash
cd /var/www/puurga/backend
npm install
npm run build
```

### 7.2 Build frontend
```bash
cd /var/www/puurga
npm install
npm run build
```

### 7.3 Deploy frontend
```bash
sudo mkdir -p /var/www/puurga/frontend
sudo cp -r dist /var/www/puurga/frontend/
```

### 7.4 Start backend with PM2
```bash
cd /var/www/puurga
pm2 start backend/dist/server.js --name puurga-backend --instances 2 --exec-mode cluster
pm2 save
pm2 startup
```

---

## 🔒 Step 8: Set Up SSL (Optional but Recommended)

### 8.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 8.2 Obtain SSL certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 8.3 Auto-renewal
```bash
sudo certbot renew --dry-run
```

---

## 💾 Step 9: Add Swap Space (for low memory droplets)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 🔑 Step 10: Set Up SSH Key for GitHub Actions

### 10.1 Generate SSH key
```bash
ssh-keygen -t ed25519 -C "github-actions@puurga" -f ~/.ssh/github_actions
```

### 10.2 Add public key to authorized_keys
```bash
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 10.3 Get private key (for GitHub Secrets)
```bash
cat ~/.ssh/github_actions
```
**Copy this entire output including BEGIN and END lines**

---

## ✅ Step 11: Verify Installation

### 11.1 Check all services
```bash
# PostgreSQL
sudo systemctl status postgresql

# Nginx
sudo systemctl status nginx

# PM2
pm2 status

# Node.js
node --version

# Git
git --version
```

### 11.2 Check application
```bash
# Backend logs
pm2 logs puurga-backend

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### 11.3 Test the application
Visit your domain or IP address in a browser

---

## 📊 Monitoring Commands

```bash
# View PM2 processes
pm2 status
pm2 logs puurga-backend
pm2 monit

# View system resources
htop
df -h
free -h

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

---

## 🎉 Setup Complete!

Your Digital Ocean Droplet is now ready for automatic deployments via GitHub Actions!

**Next Steps:**
1. Follow the `DEPLOYMENT_GUIDE.md` to set up GitHub Actions
2. Configure GitHub Secrets
3. Push code to trigger automatic deployment

---

## 🔧 Troubleshooting

### Backend won't start
```bash
cd /var/www/puurga/backend
npm run build
pm2 restart puurga-backend
pm2 logs puurga-backend
```

### Nginx errors
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### Database connection issues
```bash
sudo -u postgres psql
\l
\du
```

### Permission issues
```bash
sudo chown -R $USER:$USER /var/www/puurga
chmod -R 755 /var/www/puurga
```
