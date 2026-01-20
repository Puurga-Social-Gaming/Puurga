#!/bin/bash

# Puurga Deployment Script
# This script is triggered by GitHub Actions or run manually

echo "🚀 Starting Deployment..."
# export PATH=$PATH:/root/.nvm/versions/node/v20.10.0/bin

# 1. Navigate to project directory
cd /var/www/Puurga || exit

# 2. Pull latest changes
echo "📥 Pulling latest code..."
git fetch origin main
git reset --hard origin/main

# 3. Install Dependencies
echo "📦 Installing Frontend Dependencies..."
npm install --quiet

echo "📦 Installing Backend Dependencies..."
cd backend || exit
npm install --quiet
cd ..

# 4. Build Project
echo "🏗️ Building Project..."
npm run build

# 5. Restart Services
echo "🔄 Restarting Backend..."
pm2 restart backend
pm2 restart puurga-backend 2>/dev/null || true

echo "✅ Deployment Complete!"
