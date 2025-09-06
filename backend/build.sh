#!/bin/bash

# Install dependencies
npm install

# Build TypeScript
npm run build

# Copy production environment file
cp .env.production .env

# Copy build to deployment directory
sudo cp -r dist/* /var/www/puurga/backend/
sudo cp package.json /var/www/puurga/backend/
sudo cp ecosystem.config.js /var/www/puurga/backend/

# Install production dependencies
cd /var/www/puurga/backend
npm install --production

# Start/restart the application with PM2
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js 