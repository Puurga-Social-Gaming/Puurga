#!/bin/bash
# Update Deployment Script - Run this on the DROPLET when you need to update the app
# This script rebuilds and restarts the application

set -e

APP_DIR="/var/www/app"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

echo "=========================================="
echo "Puurga Application - Update Deployment"
echo "=========================================="
echo ""
echo "This will rebuild and restart your application"
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Update cancelled"
    exit 1
fi

# Update Backend
echo ""
echo "Updating Backend..."
cd $BACKEND_DIR

# Install any new dependencies
echo "Installing backend dependencies..."
npm install --production

# Rebuild
echo "Building backend..."
npm run build

if [ ! -f "dist/server.js" ]; then
    echo "ERROR: Backend build failed!"
    exit 1
fi

# Restart PM2 process
echo "Restarting backend..."
pm2 restart puurga-backend

# Update Frontend
echo ""
echo "Updating Frontend..."
cd $FRONTEND_DIR

# Install any new dependencies
echo "Installing frontend dependencies..."
npm install

# Rebuild
echo "Building frontend..."
npm run build

if [ ! -f "dist/index.html" ]; then
    echo "ERROR: Frontend build failed!"
    exit 1
fi

# Reload Nginx to clear cache
echo "Reloading Nginx..."
systemctl reload nginx

echo ""
echo "=========================================="
echo "Update completed successfully!"
echo "=========================================="
echo ""
echo "Application Status:"
pm2 status
echo ""
echo "Your application has been updated!"
echo ""
