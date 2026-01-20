#!/bin/bash
# Application Deployment Script - Run this on the DROPLET as root
# This script deploys the backend and frontend

set -e

APP_DIR="/var/www/app"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
UPLOADS_DIR="$APP_DIR/uploads"
LOGS_DIR="$APP_DIR/logs"

echo "=========================================="
echo "Puurga Application - Deployment"
echo "=========================================="

# Ensure we're in the right directory
cd $APP_DIR

# Create necessary directories
echo "Creating required directories..."
mkdir -p $UPLOADS_DIR
mkdir -p $LOGS_DIR
mkdir -p $FRONTEND_DIR/dist

# Set permissions
echo "Setting permissions..."
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR
chmod -R 775 $UPLOADS_DIR
chmod -R 775 $LOGS_DIR

# ==========================================
# BACKEND DEPLOYMENT
# ==========================================
echo ""
echo "=========================================="
echo "Deploying Backend..."
echo "=========================================="

cd $BACKEND_DIR

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found!"
    echo "Please create .env from .env.production.template"
    echo "Run: cp .env.production.template .env"
    echo "Then edit .env with your configuration"
    exit 1
fi

# Install backend dependencies
echo "Installing backend dependencies..."
npm install --production

# Build backend
echo "Building backend..."
npm run build

# Check if build was successful
if [ ! -f "dist/server.js" ]; then
    echo "ERROR: Backend build failed! dist/server.js not found"
    exit 1
fi

echo "Backend build completed successfully!"

# ==========================================
# DATABASE MIGRATIONS
# ==========================================
echo ""
echo "Do you want to run database migrations? (y/n)"
read -r run_migrations
if [ "$run_migrations" = "y" ]; then
    echo "Running database migrations..."
    # Add your migration command here if you have one
    # Example: npm run migrate
    echo "Migrations completed (or skipped if no migration script)"
fi

# ==========================================
# FRONTEND DEPLOYMENT
# ==========================================
echo ""
echo "=========================================="
echo "Deploying Frontend..."
echo "=========================================="

cd $FRONTEND_DIR

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install

# Build frontend for production
echo "Building frontend for production..."
npm run build

# Check if build was successful
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "ERROR: Frontend build failed! dist/index.html not found"
    exit 1
fi

echo "Frontend build completed successfully!"

# ==========================================
# NGINX CONFIGURATION
# ==========================================
echo ""
echo "=========================================="
echo "Configuring Nginx..."
echo "=========================================="

# Backup existing nginx config if exists
if [ -f "/etc/nginx/sites-available/puurga" ]; then
    echo "Backing up existing Nginx config..."
    cp /etc/nginx/sites-available/puurga /etc/nginx/sites-available/puurga.backup.$(date +%Y%m%d_%H%M%S)
fi

# Copy nginx configuration
echo "Installing Nginx configuration..."
cp $APP_DIR/nginx.conf /etc/nginx/sites-available/puurga

# Enable site
if [ ! -L "/etc/nginx/sites-enabled/puurga" ]; then
    ln -s /etc/nginx/sites-available/puurga /etc/nginx/sites-enabled/puurga
fi

# Remove default nginx site if exists
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    echo "Removing default Nginx site..."
    rm /etc/nginx/sites-enabled/default
fi

# Test nginx configuration
echo "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx configuration is valid!"
    echo "Reloading Nginx..."
    systemctl reload nginx
    systemctl enable nginx
else
    echo "ERROR: Nginx configuration test failed!"
    exit 1
fi

# ==========================================
# PM2 DEPLOYMENT
# ==========================================
echo ""
echo "=========================================="
echo "Starting Backend with PM2..."
echo "=========================================="

cd $APP_DIR

# Stop existing PM2 process if running
pm2 stop puurga-backend 2>/dev/null || true
pm2 delete puurga-backend 2>/dev/null || true

# Start application with PM2
echo "Starting application..."
pm2 start ecosystem.config.js

# Save PM2 process list
echo "Saving PM2 process list..."
pm2 save

# Setup PM2 to start on boot
echo "Setting up PM2 startup..."
pm2 startup systemd -u root --hp /root

echo ""
echo "=========================================="
echo "Deployment completed successfully!"
echo "=========================================="
echo ""
echo "Application Status:"
pm2 status
echo ""
echo "Nginx Status:"
systemctl status nginx --no-pager | head -n 10
echo ""
echo "Your application should now be accessible at:"
echo "  http://$(curl -s ifconfig.me)"
echo ""
echo "Useful commands:"
echo "  - View backend logs: pm2 logs puurga-backend"
echo "  - Restart backend: pm2 restart puurga-backend"
echo "  - Stop backend: pm2 stop puurga-backend"
echo "  - View Nginx logs: tail -f /var/log/nginx/puurga_error.log"
echo "  - Reload Nginx: systemctl reload nginx"
echo ""
