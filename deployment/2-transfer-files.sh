#!/bin/bash
# File Transfer Script - Run this on your LOCAL machine (Windows PowerShell or WSL)
# This script transfers files to the DigitalOcean droplet

set -e

# Configuration - UPDATE THESE VALUES
DROPLET_IP="YOUR_DROPLET_IP"
DROPLET_USER="root"
LOCAL_PROJECT_PATH="G:/Chris Home/Documents/CHRISTOPHER WORK FILE/Adam Projects/Puurga/New folder/Puurga/Puurga"
REMOTE_APP_PATH="/var/www/app"

echo "=========================================="
echo "Puurga Application - File Transfer"
echo "=========================================="
echo ""
echo "Droplet IP: $DROPLET_IP"
echo "Local Path: $LOCAL_PROJECT_PATH"
echo "Remote Path: $REMOTE_APP_PATH"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Create temporary directory for transfer (exclude node_modules, .git, etc.)
echo "Preparing files for transfer..."

# Transfer backend files
echo "Transferring backend files..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude '*.log' \
  "$LOCAL_PROJECT_PATH/backend/" \
  "$DROPLET_USER@$DROPLET_IP:$REMOTE_APP_PATH/backend/"

# Transfer frontend source files
echo "Transferring frontend files..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude '*.log' \
  "$LOCAL_PROJECT_PATH/src/" \
  "$DROPLET_USER@$DROPLET_IP:$REMOTE_APP_PATH/frontend/src/"

# Transfer frontend config files
echo "Transferring frontend configuration..."
scp "$LOCAL_PROJECT_PATH/package.json" \
    "$DROPLET_USER@$DROPLET_IP:$REMOTE_APP_PATH/frontend/"
scp "$LOCAL_PROJECT_PATH/vite.config.ts" \
    "$DROPLET_USER@$DROPLET_IP:$REMOTE_APP_PATH/frontend/"
scp "$LOCAL_PROJECT_PATH/tsconfig.json" \
    "$DROPLET_USER@$DROPLET_IP:$REMOTE_APP_PATH/frontend/"
scp "$LOCAL_PROJECT_PATH/tsconfig.app.json" \
    "$DROPLET_USER@$DROPLET_IP:$REMOTE_APP_PATH/frontend/"
scp "$LOCAL_PROJECT_PATH/tsconfig.node.json" \
    "$DROPLET_USER@$DROPLET_IP:$REMOTE_APP_PATH/frontend/"
scp "$LOCAL_PROJECT_PATH/tailwind.config.js" \
    "$DROPLET_USER@$DROPLET_IP:$REMOTE_APP_PATH/frontend/"
scp "$LOCAL_PROJECT_PATH/postcss.config.js" \
    "$DROPLET_USER@$DROPLET_IP:$REMOTE_APP_PATH/frontend/"
scp "$LOCAL_PROJECT_PATH/index.html" \
    "$DROPLET_USER@$DROPLET_IP:$REMOTE_APP_PATH/frontend/"

# Transfer deployment files
echo "Transferring deployment configuration..."
scp "$LOCAL_PROJECT_PATH/deployment/ecosystem.config.js" \
    "$DROPLET_USER@$DROPLET_IP:$REMOTE_APP_PATH/"
scp "$LOCAL_PROJECT_PATH/deployment/nginx.conf" \
    "$DROPLET_USER@$DROPLET_IP:$REMOTE_APP_PATH/"
scp "$LOCAL_PROJECT_PATH/backend/.env.production.template" \
    "$DROPLET_USER@$DROPLET_IP:$REMOTE_APP_PATH/backend/"

# Transfer uploads directory (if exists and needed)
if [ -d "$LOCAL_PROJECT_PATH/uploads" ]; then
    echo "Transferring uploads directory..."
    rsync -avz --progress \
      "$LOCAL_PROJECT_PATH/uploads/" \
      "$DROPLET_USER@$DROPLET_IP:$REMOTE_APP_PATH/uploads/"
fi

echo ""
echo "=========================================="
echo "File transfer completed successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. SSH into your droplet: ssh $DROPLET_USER@$DROPLET_IP"
echo "2. Run the deployment script: bash /var/www/app/3-deploy-app.sh"
echo ""
