# Supabase Redirect URL Configuration - Step-by-Step Guide

## The Problem You're Experiencing

When you click the password reset link in your email, Supabase is redirecting to:
```
https://vhvxfnxtyrgiydztsonz.supabase.co/auth/v1/verify?token=...&redirect_to=http://localhost:3000
```

But your frontend is running on **`http://localhost:5174`**, not `localhost:3000`.

This causes: **"This site can't be reached - localhost refused to connect"**

## The Solution: Add Redirect URLs to Supabase

### Step-by-Step Instructions

#### 1. Go to Supabase Dashboard

```
URL: https://app.supabase.com
```

Log in with your account and select your project.

---

#### 2. Find Authentication Settings

```
Sidebar Menu:
  └─ Authentication (or Auth)
     └─ Providers
```

Look for a section called **"Redirect URLs"** or **"Authorized Redirect URLs"**

---

#### 3. Add Your Frontend URLs

In the Redirect URLs section, you need to add:

**For Development (localhost):**
```
http://localhost:5174
```

**Also add (recommended):**
```
http://localhost:5174/reset-password
```

**For Production (add later):**
```
https://yourdomain.com
https://yourdomain.com/reset-password
```

---

#### 4. Save Changes

Click the **Save** or **Update** button to save your changes.

Supabase will show a confirmation message.

---

## Visual Guide

```
SUPABASE DASHBOARD
═════════════════════════════════════════════════════════════

Left Sidebar:
┌─────────────────────┐
│ Project Settings    │
│ ├─ General          │
│ ├─ API              │
│ ├─ Database         │
│ ├─ Auth             │ ← CLICK HERE
│ │  ├─ Users         │
│ │  ├─ Policies      │
│ │  └─ Providers     │
│ └─ ...              │
└─────────────────────┘

Main Area (After clicking Auth → Providers):
┌───────────────────────────────────────────────────────┐
│ Authentication                                        │
├───────────────────────────────────────────────────────┤
│                                                       │
│ Authorized Redirect URLs                            │
│ ─────────────────────────────────────────────────    │
│                                                       │
│ [Input Field]                                        │
│ [ Add URL ] or [ + Add ]                             │
│                                                       │
│ Current URLs:                                        │
│ ─────────────────────────────────────────────────    │
│                                                       │
│ □ http://localhost:3000                             │
│ □ http://localhost:5174                             │
│ □ http://localhost:5174/reset-password              │
│ □ https://yourdomain.com                            │
│                                                       │
│ [ Save ] or [ Update ]                              │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## Exact URLs to Add (Copy-Paste)

### For Development:
```
http://localhost:5174
http://localhost:5174/reset-password
```

### For Production (Replace yourdomain.com):
```
https://yourdomain.com
https://yourdomain.com/reset-password
https://www.yourdomain.com
https://www.yourdomain.com/reset-password
```

---

## Testing After Configuration

### 1. Clear Browser Cache & Cookies

```
Windows/Linux:
  Ctrl + Shift + Delete

Mac:
  Cmd + Shift + Delete
```

Or in your browser:
1. Press F12 (open DevTools)
2. Right-click refresh button
3. Select "Empty cache and hard refresh"

### 2. Clear LocalStorage (Browser Console)

```javascript
localStorage.clear()
```

### 3. Close and Reopen Browser

### 4. Test the Password Reset Flow

1. Go to: `http://localhost:5174/forgot-password`
2. Enter your email address
3. Click "Send Reset Link"
4. Check your email inbox
5. Click the reset link
6. You should now see the reset password form at: `http://localhost:5174/reset-password`
   (NOT at `localhost:3000`)

---

## Verification Checklist

- [ ] I've logged into Supabase dashboard
- [ ] I've found Authentication → Providers → Redirect URLs
- [ ] I've added `http://localhost:5174`
- [ ] I've added `http://localhost:5174/reset-password`
- [ ] I've clicked Save/Update
- [ ] I've cleared browser cache
- [ ] I've cleared localStorage
- [ ] I've restarted my frontend dev server
- [ ] I can see the Redirect URLs in the list
- [ ] The reset link now redirects to `http://localhost:5174/reset-password`

---

## What Each URL Does

| URL | Purpose |
|-----|---------|
| `http://localhost:5174` | Main app URL |
| `http://localhost:5174/reset-password` | Specific reset page |
| `https://yourdomain.com` | Production main URL |
| `https://yourdomain.com/reset-password` | Production reset page |

Supabase will accept email links that redirect to ANY of these URLs.

---

## Common Issues & Fixes

### Issue 1: Still redirecting to localhost:3000

**Fix:**
1. Verify `http://localhost:5174` is in the Redirect URLs list
2. Check for typos (5174 not 3000)
3. Try adding it again
4. Wait 1-2 minutes for changes to propagate
5. Hard refresh browser (Ctrl+Shift+R)

### Issue 2: "Invalid redirect_to parameter"

**Fix:**
1. Make sure the URL is EXACTLY in the list (including protocol http://)
2. No trailing slashes: `http://localhost:5174` ✓ (NOT `http://localhost:5174/`)
3. Add both URLs (with and without /reset-password)
4. Restart dev server

### Issue 3: Email still not arriving

**Fix:**
1. Check your email's spam/junk folder
2. Verify the email address is correct
3. Try with a different email address
4. Wait a few minutes before resending
5. Check Supabase logs (Dashboard → Logs)

### Issue 4: "Cannot reach server" error

**Fix:**
1. Verify frontend is running on port 5174
   ```bash
   cd /var/www/Puurga
   npm run dev
   ```
   You should see: `VITE ready in xxx ms`

2. Verify you can access `http://localhost:5174` in browser

3. Check that the URL is added to Redirect URLs in Supabase

4. Clear browser cache completely

---

## How Supabase Email Links Work

```
1. User requests password reset
   │
   ├─→ Frontend sends email to Supabase: resetPasswordForEmail()
   │   └─ Includes: redirectTo: "http://localhost:5174/reset-password"
   │
2. Supabase receives request
   │
   ├─→ Supabase verifies redirectTo URL is in allowed list
   │   └─ If NOT in list: ERROR
   │   └─ If in list: CONTINUE
   │
3. Supabase generates secure token
   │
   ├─→ Creates email with reset link:
   │   └─ "http://localhost:5174/reset-password?token=xyz&type=recovery"
   │
4. User receives email
   │
   ├─→ Clicks reset link
   │   └─ Browser navigates to: http://localhost:5174/reset-password?token=xyz
   │
5. Frontend receives token
   │
   ├─→ Validates token with Supabase
   ├─→ Shows reset password form
   ├─→ User enters new password
   ├─→ Frontend updates password
   └─→ Success! ✓
```

---

## After Configuring - Next Steps

1. ✅ **Add redirect URLs to Supabase** (steps above)
2. ✅ **Clear browser cache**
3. ✅ **Request password reset again**
4. ✅ **Click email link**
5. ✅ **Reset password** at `http://localhost:5174/reset-password`
6. ✅ **Login** with new password
7. ✅ **Success!**

---

## Production Deployment

When deploying to production:

### Update Redirect URLs
1. Go to Supabase dashboard
2. Add your production domain:
   - `https://yourdomain.com`
   - `https://yourdomain.com/reset-password`
3. Keep `http://localhost:5174` for development testing

### Code Already Handles This
Your updated `ForgotPassword.tsx` now automatically detects:
- **Development**: Uses `http://localhost:5174/reset-password`
- **Production**: Uses `https://yourdomain.com/reset-password`

No code changes needed!

---

## Screenshot Example

If you can see your Supabase dashboard, it looks something like this:

```
AUTHORIZED REDIRECT URLS
────────────────────────────────────────────────

[Text input: "Enter URL"]  [+ ADD]

Current Authorized URLs:
─────────────────────────────────────────────

✓ http://localhost:5174
✓ http://localhost:5174/reset-password
✓ https://yourdomain.com
✓ https://yourdomain.com/reset-password

[SAVE CHANGES]
```

---

## Support

If you're still having issues:

1. **Check Supabase Status**: https://status.supabase.com
2. **Review Email Logs**: Dashboard → Logs (filter for email events)
3. **Contact Supabase Support**: https://app.supabase.com/support
4. **Check DevTools Console**: Press F12, look for errors

---

## Summary

**The Fix:**
1. Add `http://localhost:5174` to Supabase Redirect URLs
2. Add `http://localhost:5174/reset-password` to Redirect URLs
3. Clear browser cache
4. Try password reset again

**That's it! It should work now.** ✨
