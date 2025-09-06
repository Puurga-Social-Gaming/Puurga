#!/bin/bash

# Update system
sudo apt update
sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2

# Create application directory
sudo mkdir -p /var/www/puurga
sudo chown -R $USER:$USER /var/www/puurga

# Create uploads directory
sudo mkdir -p /var/www/puurga/uploads
sudo chmod 755 /var/www/puurga/uploads

# Configure PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE puurga;"
sudo -u postgres psql -c "CREATE USER puurga WITH ENCRYPTED PASSWORD 'your_secure_password_here';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE puurga TO puurga;"

# Configure Nginx
sudo tee /etc/nginx/sites-available/puurga << EOF
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/puurga/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
    }

    # Uploads
    location /uploads {
        alias /var/www/puurga/uploads;
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/puurga /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Configure firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'puurga-backend',
    script: './backend/dist/server.js',
    instances: 2,
    exec_mode: 'cluster',
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Optimize PostgreSQL
sudo tee -a /etc/postgresql/14/main/postgresql.conf << EOF
shared_buffers = 256MB
effective_cache_size = 768MB
maintenance_work_mem = 64MB
work_mem = 4MB
EOF

# Restart PostgreSQL
sudo systemctl restart postgresql

echo "Deployment setup completed!" 