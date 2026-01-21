# 🔑 Password Reset - Quick Reference Card

## ⚡ Quick Fix (5 minutes)

### The Problem:
Email reset links redirect to `localhost:3000` but your app is on `localhost:5174`

### The Solution:
Tell Supabase to allow `localhost:5174` as a valid redirect URL

### Steps:

1. **Go to Supabase Dashboard**
   ```
   https://app.supabase.com → Select Project
   ```

2. **Navigate to Redirect URLs**
   ```
   Sidebar: Authentication → Providers → Redirect URLs
   ```

3. **Add These URLs**
   ```
   http://localhost:5174
   http://localhost:5174/reset-password
   ```

4. **Save & Clear Cache**
   ```
   Click Save
   Clear browser cache: Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
   ```

5. **Test It**
   ```
   Go to: http://localhost:5174/forgot-password
   Enter email, check inbox, click reset link
   Should now redirect to http://localhost:5174/reset-password ✓
   ```

---

## 📋 Checklist

```
□ Supabase Redirect URLs configured
  □ http://localhost:5174 added
  □ http://localhost:5174/reset-password added
  □ Changes saved
□ Browser cache cleared
□ Frontend running on http://localhost:5174
□ Can access http://localhost:5174 in browser
□ Requested password reset
□ Received email from Supabase
□ Email link redirects to correct URL
□ Reset password form displays
□ Password update successful
□ Able to login with new password
```

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Still redirects to `localhost:3000` | Verify URL added to Supabase, clear cache, hard refresh |
| Email not arriving | Check spam folder, try different email, wait a few minutes |
| "Invalid redirect_to" error | Check URL is EXACTLY typed (with protocol, no trailing slash) |
| "This page cannot be reached" | Verify frontend runs on :5174, restart dev server |
| Form not displaying | Check browser console for errors, hard refresh |

---

## 📂 Documentation Files

All files are in `/var/www/Puurga/`:

| File | Purpose |
|------|---------|
| `PASSWORD_RECOVERY_FIX_SUMMARY.md` | This comprehensive fix guide |
| `SUPABASE_REDIRECT_URL_GUIDE.md` | Step-by-step Supabase config |
| `SUPABASE_REDIRECT_URL_FIX.md` | Technical details |
| `PASSWORD_RECOVERY_DOCS.md` | Full feature documentation |
| `PASSWORD_RECOVERY_SETUP.md` | Setup instructions |
| `PASSWORD_RECOVERY_FLOW.md` | Flow diagrams |

---

## 🚀 Current Status

| Component | Status |
|-----------|--------|
| Frontend Code | ✅ Updated |
| Build | ✅ Successful |
| Password Pages | ✅ Created |
| Backend Endpoints | ✅ Created |
| Documentation | ✅ Complete |
| **Your Action** | ⚠️ Configure Supabase |

---

## 🎯 Expected Flow

```
User Actions                    System Response
──────────────────────────────────────────────
1. Click "Forgot Password"   → Navigates to /forgot-password
2. Enter email              → Validation check
3. Click "Send Link"        → Email sent by Supabase
4. Open email inbox         → Reset link in email
5. Click reset link         → Redirected to /reset-password
6. Enter new password       → Validation check
7. Click "Reset"            → Password updated
8. See success message      → Auto-redirect to login
9. Login with new password  → Logged in ✓
```

---

## 💡 Key URLs

| URL | Purpose | Port |
|-----|---------|------|
| `http://localhost:5174` | Frontend app | 5174 |
| `http://localhost:5174/login` | Login page | 5174 |
| `http://localhost:5174/forgot-password` | Password reset request | 5174 |
| `http://localhost:5174/reset-password` | Password reset form | 5174 |
| `http://localhost:3005` | Backend API | 3005 |
| `https://app.supabase.com` | Supabase dashboard | - |

---

## ⚙️ Configuration

### Supabase Authorized Redirect URLs

**Development:**
```
http://localhost:5174
http://localhost:5174/reset-password
```

**Production:** (add later)
```
https://yourdomain.com
https://yourdomain.com/reset-password
```

---

## 🔧 Frontend Configuration

**File:** `/src/pages/ForgotPassword.tsx`

Code automatically detects environment:
- **Development:** Uses `http://localhost:5174/reset-password`
- **Production:** Uses your domain

No manual changes needed!

---

## 📧 Email Flow

```
Request Flow:
User → ForgotPassword.tsx → Supabase Auth → Email Service
                                              ↓
                                         User Inbox

Click Flow:
Email Link → Supabase Verify → Allowed? → Yes: Redirect
                                       ↓
                                      No: Error
                                       ↓
             http://localhost:5174/reset-password
                                ↓
                          ResetPassword.tsx
```

---

## ✨ What's Included

### Pages
- ✅ `/src/pages/ForgotPassword.tsx` - Email submission
- ✅ `/src/pages/ResetPassword.tsx` - Password reset form

### Backend Routes
- ✅ `POST /api/auth/forgot-password` - Request reset email
- ✅ `POST /api/auth/reset-password` - Reset password
- ✅ `POST /api/auth/verify-reset-token` - Verify token

### Features
- ✅ Strong password validation
- ✅ Email verification
- ✅ 24-hour token expiration
- ✅ Error handling
- ✅ Responsive design
- ✅ Security best practices

---

## 🎓 Learning Resources

- [Supabase Docs - Password Reset](https://supabase.com/docs/guides/auth/password-reset)
- [Supabase Dashboard](https://app.supabase.com)
- [Your App Docs](./PASSWORD_RECOVERY_DOCS.md)

---

## 📞 Getting Help

**If reset link still doesn't work:**

1. ✅ Check Supabase Redirect URLs are saved
2. ✅ Clear browser cache completely
3. ✅ Try in incognito/private window
4. ✅ Check browser console (F12) for errors
5. ✅ Review `SUPABASE_REDIRECT_URL_GUIDE.md` for detailed steps

**Common Issues:**
- 🔴 Port mismatch (using 3000 instead of 5174)
- 🔴 Cache not cleared (old URL still in memory)
- 🔴 Redirect URL not added to Supabase
- 🔴 Email in spam folder

---

## ✅ Testing Command

```bash
# Start frontend (Terminal 1)
cd /var/www/Puurga && npm run dev

# Start backend (Terminal 2)
cd /var/www/Puurga/backend && npm run dev

# Then:
# 1. Go to http://localhost:5174/forgot-password
# 2. Enter email
# 3. Check email for reset link
# 4. Click link
# 5. Should be on http://localhost:5174/reset-password
# 6. Enter new password
# 7. Click reset
# 8. Login with new password
```

---

## 🎉 Success Indicators

When it's working:

- ✅ Email arrives from Supabase
- ✅ Reset link redirects to `localhost:5174` (not 3000)
- ✅ Reset password form displays
- ✅ Can enter and confirm password
- ✅ Receives success message
- ✅ Auto-redirects to login
- ✅ Can login with new password

---

**Last Updated:** January 21, 2025  
**Status:** 🚀 Ready to Deploy  
**Next Action:** Configure Supabase Redirect URLs
