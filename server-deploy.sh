#!/bin/bash

# Puurga Deployment Script for Digital Ocean
# This script deploys the latest version of the app

set -e

echo "🚀 Starting Puurga deployment..."

# Configuration
APP_DIR="/var/www/puurga"
BRANCH="main"

# Navigate to app directory
cd $APP_DIR

# Pull latest changes
echo "📥 Pulling latest code from GitHub..."
git fetch origin
git reset --hard origin/$BRANCH

# Backend deployment
echo "🔧 Building backend..."
cd backend
npm ci --production=false
npm run build

# Frontend deployment
echo "🎨 Building frontend..."
cd ../
npm ci --production=false
npm run build

# Deploy frontend to nginx directory
echo "📦 Deploying frontend..."
sudo rm -rf /var/www/puurga/frontend/dist
sudo mkdir -p /var/www/puurga/frontend
sudo cp -r dist /var/www/puurga/frontend/

# Restart backend with PM2
echo "♻️ Restarting backend..."
pm2 restart puurga-backend || pm2 start backend/dist/server.js --name puurga-backend --instances 2 --exec-mode cluster
pm2 save

# Reload nginx
echo "🔄 Reloading nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deployment completed successfully!"
echo "📊 Backend status:"
pm2 status puurga-backend
