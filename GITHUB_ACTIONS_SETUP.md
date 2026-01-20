# ⚡ Quick Start: GitHub Actions Setup

This is a **quick checklist** to get your GitHub Actions deployment working. For detailed instructions, see `DEPLOYMENT_GUIDE.md`.

---

## ✅ Checklist

### 1️⃣ Server Preparation (One-time setup)

- [ ] SSH into your Digital Ocean Droplet
- [ ] Clone your repository to `/var/www/puurga`
- [ ] Create backend `.env` file with all required variables
- [ ] Build and start the application once manually
- [ ] Verify the app is running

```bash
cd /var/www/puurga
git clone YOUR_REPO_URL .
cd backend && nano .env
npm install && npm run build
cd ../ && npm install && npm run build
pm2 start backend/dist/server.js --name puurga-backend
```

---

### 2️⃣ Generate SSH Key for GitHub Actions

- [ ] Generate SSH key on your droplet
- [ ] Add public key to authorized_keys
- [ ] Copy private key for GitHub Secrets

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_actions  # Copy this output
```

---

### 3️⃣ Configure GitHub Secrets

Go to: **GitHub Repo → Settings → Secrets and variables → Actions → New repository secret**

Add these 5 secrets:

| Secret Name | Value | Example |
|------------|-------|---------|
| `DO_HOST` | Your droplet IP | `123.456.789.0` |
| `DO_USERNAME` | SSH username | `root` or `puurga` |
| `DO_SSH_KEY` | Private key from step 2 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DO_PORT` | SSH port | `22` |
| `DO_APP_PATH` | App directory path | `/var/www/puurga` |

---

### 4️⃣ Test the Workflow

- [ ] Commit and push a change to `main` branch
- [ ] Go to GitHub → Actions tab
- [ ] Watch the deployment run
- [ ] Check your server to verify deployment

```bash
# On your local machine
git add .
git commit -m "test: trigger deployment"
git push origin main

# On your server (after deployment)
pm2 logs puurga-backend
```

---

## 🎯 What Happens on Each Push

1. **GitHub Actions triggers** when you push to `main`
2. **SSH into your server** using the secrets
3. **Pull latest code** from GitHub
4. **Build backend** (TypeScript → JavaScript)
5. **Build frontend** (React → static files)
6. **Deploy frontend** to nginx directory
7. **Restart backend** with PM2
8. **Reload nginx** to serve new frontend

---

## 🔍 Verify Deployment

### On GitHub
- Actions tab shows ✅ green checkmark
- Click on the workflow to see detailed logs

### On Your Server
```bash
# Check PM2 status
pm2 status

# View backend logs
pm2 logs puurga-backend --lines 50

# Check nginx
sudo systemctl status nginx

# View recent deployments
cd /var/www/puurga && git log --oneline -5
```

### In Browser
- Visit your domain/IP
- Check browser console for errors
- Test the application features

---

## 🚨 Common Issues

### ❌ "Permission denied (publickey)"
**Fix:** Check that `DO_SSH_KEY` secret contains the **private** key (including BEGIN and END lines)

### ❌ "npm: command not found"
**Fix:** Install Node.js on your server (see `INITIAL_SERVER_SETUP.md`)

### ❌ "pm2: command not found"
**Fix:** Install PM2 globally: `sudo npm install -g pm2`

### ❌ Frontend not updating
**Fix:** Check nginx configuration points to `/var/www/puurga/frontend/dist`

### ❌ Backend not restarting
**Fix:** Check PM2 process name matches: `pm2 status`

---

## 📱 Optional: Telegram Notifications

Want to get notified on deployments? Add these secrets:

| Secret Name | How to Get |
|------------|-----------|
| `TELEGRAM_BOT_TOKEN` | Create bot via [@BotFather](https://t.me/botfather) |
| `TELEGRAM_CHAT_ID` | Message [@userinfobot](https://t.me/userinfobot) |

The workflow already includes Telegram notification code!

---

## 🎉 You're Done!

Your GitHub Actions CI/CD pipeline is now active! Every push to `main` will automatically deploy to your Digital Ocean Droplet.

**Workflow triggers:**
- ✅ Push to `main` or `master` branch
- ✅ Manual trigger via GitHub Actions UI

**Need help?** Check the detailed guides:
- `DEPLOYMENT_GUIDE.md` - Complete deployment documentation
- `INITIAL_SERVER_SETUP.md` - Server setup from scratch
- GitHub Actions logs - Detailed error messages
