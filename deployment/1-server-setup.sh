#!/bin/bash
# Server Preparation Script for DigitalOcean Droplet
# Run this script on the droplet as root

set -e

echo "=========================================="
echo "Puurga Application - Server Setup"
echo "=========================================="

# Update system packages
echo "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install essential tools
echo "Installing essential tools..."
apt-get install -y curl wget git build-essential

# Install Node.js LTS (v20.x)
echo "Installing Node.js LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
echo "Node.js version:"
node --version
echo "npm version:"
npm --version

# Install PM2 globally
echo "Installing PM2..."
npm install -g pm2

# Install Nginx
echo "Installing Nginx..."
apt-get install -y nginx

# Install PostgreSQL (if needed for local database)
echo "Do you want to install PostgreSQL locally? (y/n)"
read -r install_postgres
if [ "$install_postgres" = "y" ]; then
    echo "Installing PostgreSQL..."
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    echo "PostgreSQL installed and started"
fi

# Configure UFW firewall
echo "Configuring firewall..."
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 80/tcp
ufw allow 443/tcp
ufw status

# Create application directory structure
echo "Creating application directories..."
mkdir -p /var/www/app
mkdir -p /var/www/app/backend
mkdir -p /var/www/app/frontend
mkdir -p /var/www/app/uploads
mkdir -p /var/www/app/logs

# Set proper permissions
echo "Setting permissions..."
chown -R www-data:www-data /var/www/app
chmod -R 755 /var/www/app

# Create a deployment user (optional but recommended)
echo "Creating deployment user..."
if ! id -u deploy > /dev/null 2>&1; then
    useradd -m -s /bin/bash deploy
    usermod -aG www-data deploy
    echo "User 'deploy' created"
else
    echo "User 'deploy' already exists"
fi

# Setup PM2 startup script
echo "Configuring PM2 startup..."
pm2 startup systemd -u root --hp /root

echo "=========================================="
echo "Server setup completed successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Transfer your application files to /var/www/app"
echo "2. Configure environment variables"
echo "3. Setup database (if using PostgreSQL)"
echo "4. Deploy the application"
echo ""
echo "System Information:"
echo "- Node.js: $(node --version)"
echo "- npm: $(npm --version)"
echo "- PM2: $(pm2 --version)"
echo "- Nginx: $(nginx -v 2>&1)"
echo ""
