# PowerShell File Transfer Script for Windows
# Run this on your LOCAL Windows machine

# Configuration - UPDATE THESE VALUES
$DROPLET_IP = "YOUR_DROPLET_IP"
$DROPLET_USER = "root"
$LOCAL_PROJECT_PATH = "G:\Chris Home\Documents\CHRISTOPHER WORK FILE\Adam Projects\Puurga\New folder\Puurga\Puurga"
$REMOTE_APP_PATH = "/var/www/app"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Puurga Application - File Transfer" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Droplet IP: $DROPLET_IP" -ForegroundColor Yellow
Write-Host "Local Path: $LOCAL_PROJECT_PATH" -ForegroundColor Yellow
Write-Host "Remote Path: $REMOTE_APP_PATH" -ForegroundColor Yellow
Write-Host ""
Write-Host "This script requires SCP/RSYNC. Install via:" -ForegroundColor Yellow
Write-Host "  - Git for Windows (includes SSH/SCP)" -ForegroundColor Yellow
Write-Host "  - Or use WSL (Windows Subsystem for Linux)" -ForegroundColor Yellow
Write-Host ""
$continue = Read-Host "Press Enter to continue or Ctrl+C to cancel"

# Function to run SCP
function Transfer-File {
    param($Source, $Destination)
    Write-Host "Transferring: $Source" -ForegroundColor Green
    scp -r "$Source" "${DROPLET_USER}@${DROPLET_IP}:${Destination}"
}

# Create backend directory on server
Write-Host "Creating directories on server..." -ForegroundColor Green
ssh "${DROPLET_USER}@${DROPLET_IP}" "mkdir -p $REMOTE_APP_PATH/backend $REMOTE_APP_PATH/frontend/src $REMOTE_APP_PATH/uploads $REMOTE_APP_PATH/logs"

# Transfer backend files (excluding node_modules, dist, etc.)
Write-Host "Transferring backend files..." -ForegroundColor Green
scp -r "$LOCAL_PROJECT_PATH\backend\*.ts" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/backend/"
scp -r "$LOCAL_PROJECT_PATH\backend\*.json" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/backend/"
scp -r "$LOCAL_PROJECT_PATH\backend\config" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/backend/"
scp -r "$LOCAL_PROJECT_PATH\backend\middleware" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/backend/"
scp -r "$LOCAL_PROJECT_PATH\backend\models" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/backend/"
scp -r "$LOCAL_PROJECT_PATH\backend\routes" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/backend/"
scp -r "$LOCAL_PROJECT_PATH\backend\migrations" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/backend/"
scp -r "$LOCAL_PROJECT_PATH\backend\scripts" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/backend/"

# Transfer frontend source
Write-Host "Transferring frontend files..." -ForegroundColor Green
scp -r "$LOCAL_PROJECT_PATH\src" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/frontend/"

# Transfer frontend config files
Write-Host "Transferring frontend configuration..." -ForegroundColor Green
scp "$LOCAL_PROJECT_PATH\package.json" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/frontend/"
scp "$LOCAL_PROJECT_PATH\vite.config.ts" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/frontend/"
scp "$LOCAL_PROJECT_PATH\tsconfig.json" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/frontend/"
scp "$LOCAL_PROJECT_PATH\tsconfig.app.json" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/frontend/"
scp "$LOCAL_PROJECT_PATH\tsconfig.node.json" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/frontend/"
scp "$LOCAL_PROJECT_PATH\tailwind.config.js" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/frontend/"
scp "$LOCAL_PROJECT_PATH\postcss.config.js" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/frontend/"
scp "$LOCAL_PROJECT_PATH\index.html" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/frontend/"

# Transfer deployment files
Write-Host "Transferring deployment configuration..." -ForegroundColor Green
scp "$LOCAL_PROJECT_PATH\deployment\ecosystem.config.js" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/"
scp "$LOCAL_PROJECT_PATH\deployment\nginx.conf" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/"
scp "$LOCAL_PROJECT_PATH\backend\.env.production.template" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/backend/"

# Transfer uploads if exists
if (Test-Path "$LOCAL_PROJECT_PATH\uploads") {
    Write-Host "Transferring uploads directory..." -ForegroundColor Green
    scp -r "$LOCAL_PROJECT_PATH\uploads\*" "${DROPLET_USER}@${DROPLET_IP}:${REMOTE_APP_PATH}/uploads/"
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "File transfer completed successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. SSH into your droplet: ssh ${DROPLET_USER}@${DROPLET_IP}" -ForegroundColor Yellow
Write-Host "2. Run the deployment script: bash /var/www/app/3-deploy-app.sh" -ForegroundColor Yellow
Write-Host ""
