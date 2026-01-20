# 🔐 GitHub Secrets Setup for puurgaalive SSH

Since you're using the **puurgaalive** SSH configuration, here's what you need to add to GitHub Secrets.

---

## 📋 Required GitHub Secrets

Go to: **GitHub Repository → Settings → Secrets and variables → Actions → New repository secret**

### Add these secrets:

| Secret Name | Value | Notes |
|------------|-------|-------|
| `DO_USERNAME` | Your SSH username | Usually `root` or your user on the droplet |
| `DO_SSH_KEY` | Your SSH private key | The key you use to connect to puurgaalive |
| `DO_PORT` | `22` | Default SSH port (unless you changed it) |
| `DO_APP_PATH` | `/var/www/puurga` | Path where your app is located on the server |

---

## 🔑 Getting Your SSH Private Key

Since you already have puurgaalive SSH set up, you need to find the private key you're using.

### Option 1: If you know which key you're using
```bash
# On your local machine, check your SSH config
cat ~/.ssh/config

# Look for the puurgaalive entry, it should show which IdentityFile you're using
# Example:
# Host puurgaalive
#   HostName 123.456.789.0
#   User root
#   IdentityFile ~/.ssh/puurgaalive_key

# Then copy that key
cat ~/.ssh/puurgaalive_key
```

### Option 2: Check common key locations
```bash
# Try these common key files
cat ~/.ssh/id_rsa
cat ~/.ssh/id_ed25519
cat ~/.ssh/puurgaalive
cat ~/.ssh/puurgaalive_key
```

**Copy the entire output including the `-----BEGIN` and `-----END` lines**

---

## ✅ How to Add Secrets to GitHub

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. Click **Secrets and variables** (left sidebar)
4. Click **Actions**
5. Click **New repository secret**
6. Enter the **Name** (e.g., `DO_SSH_KEY`)
7. Paste the **Value** (the private key content)
8. Click **Add secret**
9. Repeat for all 4 secrets

---

## 🧪 Test Your Setup

After adding all secrets, test the deployment:

```bash
# On your local machine
git add .
git commit -m "test: GitHub Actions deployment"
git push origin main
```

Then go to **GitHub → Actions** tab to watch the deployment!

---

## 🔍 Verify Secrets Are Set

In your GitHub repo:
1. Go to **Settings → Secrets and variables → Actions**
2. You should see all 4 secrets listed:
   - ✅ DO_USERNAME
   - ✅ DO_SSH_KEY
   - ✅ DO_PORT
   - ✅ DO_APP_PATH

---

## 🚨 Troubleshooting

### "Permission denied (publickey)"
- Make sure `DO_SSH_KEY` contains the **private** key (not the public key)
- The key should start with `-----BEGIN OPENSSH PRIVATE KEY-----` or `-----BEGIN RSA PRIVATE KEY-----`
- Include all lines including BEGIN and END

### "Host key verification failed"
- The workflow will handle this automatically
- If issues persist, you may need to add `StrictHostKeyChecking=no` (not recommended for production)

### "Connection timeout"
- Check that `DO_PORT` is correct (usually 22)
- Verify your droplet's firewall allows SSH connections

---

## 🎉 You're All Set!

Once you've added all 4 secrets, your GitHub Actions workflow will automatically deploy to your puurgaalive server every time you push to the `main` branch!
