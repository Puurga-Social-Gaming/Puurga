#!/bin/bash
# Deployment Verification Script - Run this on the DROPLET

echo "=========================================="
echo "Puurga Application - Verification"
echo "=========================================="
echo ""

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)
echo "Server IP: $SERVER_IP"
echo ""

# Check if PM2 is running
echo "1. Checking PM2 status..."
if pm2 list | grep -q "puurga-backend"; then
    echo "   ✓ PM2 process is running"
    pm2 status
else
    echo "   ✗ PM2 process is NOT running"
    echo "   Run: pm2 start /var/www/app/ecosystem.config.js"
fi
echo ""

# Check if backend is responding
echo "2. Checking backend health..."
BACKEND_HEALTH=$(curl -s http://localhost:3005/health)
if [ $? -eq 0 ]; then
    echo "   ✓ Backend is responding"
    echo "   Response: $BACKEND_HEALTH"
else
    echo "   ✗ Backend is NOT responding"
    echo "   Check logs: pm2 logs puurga-backend"
fi
echo ""

# Check Nginx status
echo "3. Checking Nginx status..."
if systemctl is-active --quiet nginx; then
    echo "   ✓ Nginx is running"
else
    echo "   ✗ Nginx is NOT running"
    echo "   Start: systemctl start nginx"
fi
echo ""

# Check Nginx configuration
echo "4. Testing Nginx configuration..."
if nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✓ Nginx configuration is valid"
else
    echo "   ✗ Nginx configuration has errors"
    nginx -t
fi
echo ""

# Check if frontend files exist
echo "5. Checking frontend build..."
if [ -f "/var/www/app/frontend/dist/index.html" ]; then
    echo "   ✓ Frontend build exists"
    echo "   Files: $(ls -lh /var/www/app/frontend/dist/index.html)"
else
    echo "   ✗ Frontend build NOT found"
    echo "   Run: cd /var/www/app/frontend && npm run build"
fi
echo ""

# Check uploads directory
echo "6. Checking uploads directory..."
if [ -d "/var/www/app/uploads" ]; then
    echo "   ✓ Uploads directory exists"
    echo "   Permissions: $(ls -ld /var/www/app/uploads)"
else
    echo "   ✗ Uploads directory NOT found"
fi
echo ""

# Check firewall
echo "7. Checking firewall (UFW)..."
if ufw status | grep -q "Status: active"; then
    echo "   ✓ Firewall is active"
    ufw status | grep -E "80|443|OpenSSH"
else
    echo "   ⚠ Firewall is NOT active"
fi
echo ""

# Test frontend access
echo "8. Testing frontend access..."
FRONTEND_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
if [ "$FRONTEND_TEST" = "200" ]; then
    echo "   ✓ Frontend is accessible (HTTP $FRONTEND_TEST)"
else
    echo "   ✗ Frontend returned HTTP $FRONTEND_TEST"
fi
echo ""

# Test API access
echo "9. Testing API access..."
API_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health)
if [ "$API_TEST" = "200" ]; then
    echo "   ✓ API is accessible (HTTP $API_TEST)"
else
    echo "   ✗ API returned HTTP $API_TEST"
fi
echo ""

# Check disk space
echo "10. Checking disk space..."
df -h / | tail -n 1
echo ""

# Check memory usage
echo "11. Checking memory usage..."
free -h
echo ""

# Recent logs
echo "12. Recent backend logs (last 20 lines)..."
pm2 logs puurga-backend --lines 20 --nostream
echo ""

echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo ""
echo "Access your application at:"
echo "  http://$SERVER_IP"
echo ""
echo "If any checks failed, review the output above"
echo "and check the respective logs for more details."
echo ""
echo "Useful debugging commands:"
echo "  - Backend logs: pm2 logs puurga-backend"
echo "  - Nginx error log: tail -f /var/log/nginx/puurga_error.log"
echo "  - Nginx access log: tail -f /var/log/nginx/puurga_access.log"
echo "  - System logs: journalctl -xe"
echo ""
