#!/bin/bash

# Puurga Deployment Script
# Triggered by GitHub Actions or run manually on the VPS.
# Runs: git pull → install → build → MIGRATE → restart

set -e   # Stop on any error

echo "🚀 Starting Deployment..."

# 1. Navigate to project directory
cd /home/lezoapp/projects/Puurga || exit 1

# 2. Pull latest changes
echo "📥 Pulling latest code..."
git fetch origin main
git reset --hard origin/main

# 3. Install dependencies
echo "📦 Installing frontend dependencies..."
npm install --quiet

echo "📦 Installing backend dependencies..."
cd backend
npm install --quiet

# 4. Run database migrations BEFORE building
#    Uses ts-node so migrations run from source (no compile step needed)
#    Safe to run every deploy — already-applied migrations are skipped.
echo "🗄️  Running database migrations..."
npm run migrate

cd ..

# 5. Build Project
echo "🏗️  Building backend..."
cd backend && npm run build && cd ..

echo "🏗️  Building frontend..."
npm run build

# 6. Update Nginx config if changed
echo "🔧 Updating Nginx config..."
cp /home/lezoapp/projects/Puurga/nginx-puurga-fixed.conf /etc/nginx/sites-available/puurga 2>/dev/null || true
sudo nginx -t && sudo systemctl reload nginx || echo "⚠️  Nginx config unchanged or test failed"

# 7. Restart backend
echo "🔄 Restarting backend..."
pm2 restart puurga-backend

echo ""
echo "✅ Deployment complete!"
echo "   → Migrations applied"
echo "   → Backend rebuilt and restarted"
echo "   → Frontend rebuilt"
