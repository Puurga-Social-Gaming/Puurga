# 🚨 URGENT: Password Reset Fix - Step by Step

## Current Issue
Password reset emails are redirecting to `http://localhost:3000` instead of `http://localhost:5174`, causing the error:
```
error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
```

## Root Cause
**Supabase Dashboard has `localhost:3000` configured as the Site URL.**
Even though our code sends the correct URL (`localhost:5174`), Supabase uses its dashboard configuration, which overrides our setting.

---

## ✅ SOLUTION: 3-Step Fix

### Step 1: Test Current URL Configuration (Optional Diagnostic)

1. Open browser: **http://localhost:5174/test-reset-url**
2. This test page will show you:
   - Current environment (should be `localhost:5174`)
   - The exact URL being sent to Supabase
   - Developer tools console logs
3. This confirms the frontend is sending the RIGHT URL

### Step 2: Update Supabase Dashboard (CRITICAL - DO THIS NOW!)

**Go to Supabase Dashboard:**
1. Navigate to: **https://app.supabase.com**
2. Login with your credentials
3. Select project: **vhvxfnxtyrgiydztsonz.supabase.co**

**Update URL Configuration:**
1. Click **Authentication** in left sidebar
2. Click **URL Configuration** tab
3. Find **"Site URL"** field

   **CHANGE FROM:**
   ```
   http://localhost:3000
   ```
   
   **CHANGE TO:**
   ```
   http://localhost:5174
   ```

4. In **"Redirect URLs"** section, add these (one per line or comma-separated):
   ```
   http://localhost:5174/**
   http://localhost:5174/reset-password
   http://localhost:5173/**
   http://127.0.0.1:5174/**
   ```

5. **Click Save** (bottom of page)

6. **Wait 10 seconds** for Supabase to apply changes

### Step 3: Test With NEW Password Reset Email

**IMPORTANT:** You MUST request a NEW reset email. Old emails still use the old URL!

1. **Clear your email inbox** (or note which emails are NEW)

2. **Go to:** http://localhost:5174/forgot-password

3. **Enter your email address**

4. **Click "Send Reset Link"**

5. **Check your email** (check spam folder too!)

6. **NEW email should arrive** within 1-2 minutes

7. **Verify the link** - It should START with:
   ```
   http://localhost:5174/reset-password#access_token=...
   ```
   NOT:
   ```
   http://localhost:3000/...  ← If you see this, Supabase wasn't updated!
   ```

8. **Click the link** - Should open the reset password form

9. **Enter new password:**
   - Minimum 8 characters
   - Example: `TestPassword123!`

10. **Confirm password** (enter same password)

11. **Click "Reset Password"**

12. **See success message** and auto-redirect to login

13. **Login with new password**

---

## 🔍 Verification Checklist

After updating Supabase, verify:

- [ ] Supabase Site URL = `http://localhost:5174` (NOT 3000)
- [ ] Redirect URLs include `http://localhost:5174/**`
- [ ] Settings saved in Supabase (green success message)
- [ ] Requested NEW password reset (after changing Supabase)
- [ ] Email received with link to `localhost:5174` (NOT 3000)
- [ ] Reset password page loads successfully
- [ ] Password successfully reset
- [ ] Can login with new password

---

## ❌ Common Mistakes to Avoid

1. **Using old email links** - Always request a NEW reset after updating Supabase
2. **Not saving Supabase settings** - Make sure you click "Save" at bottom
3. **Wrong project** - Ensure you're in project `vhvxfnxtyrgiydztsonz`
4. **Typo in URL** - Must be exactly `http://localhost:5174` (no trailing slash in Site URL)

---

## 🐛 Still Having Issues?

### Issue: Email still links to localhost:3000

**Solutions:**
1. Double-check Supabase Site URL is exactly `http://localhost:5174`
2. Clear Supabase cache:
   - In Supabase Dashboard → Authentication
   - Disable email provider (toggle off)
   - Save
   - Re-enable email provider (toggle on)
   - Save
   - Re-enter Site URL
   - Save again

### Issue: No email arriving

**Solutions:**
1. Check spam/junk folder
2. Verify email exists in Supabase:
   - Dashboard → Authentication → Users
   - Find your email in the list
3. Check Supabase logs:
   - Dashboard → Logs
   - Filter by "auth"
   - Look for errors

### Issue: "Session not found" error on reset page

**Causes:**
- Clicked link in different browser
- Cookies disabled
- Link older than 1 hour

**Solutions:**
1. Request NEW password reset
2. Click link in same browser
3. Click link within 5 minutes
4. Ensure cookies enabled

---

## 📸 Screenshots to Help

### What the Supabase Dashboard Should Look Like:

**Authentication → URL Configuration:**
```
Site URL: http://localhost:5174

Redirect URLs:
http://localhost:5174/**
http://localhost:5174/reset-password
http://localhost:5173/**
http://127.0.0.1:5174/**
```

### What the Email Link Should Look Like:

✅ **CORRECT:**
```
http://localhost:5174/reset-password#access_token=eyJ...
```

❌ **WRONG:**
```
http://localhost:3000/reset-password#access_token=eyJ...
```

---

## 🎯 Quick Reference

| Item | Current (Wrong) | Should Be (Correct) |
|------|----------------|---------------------|
| Supabase Site URL | http://localhost:3000 | http://localhost:5174 |
| App Running On | localhost:5174 | localhost:5174 ✅ |
| Email Link | localhost:3000 ❌ | localhost:5174 ✅ |

---

## 🔗 Helpful Links

1. **Test Page:** http://localhost:5174/test-reset-url
2. **Forgot Password:** http://localhost:5174/forgot-password
3. **Supabase Dashboard:** https://app.supabase.com
4. **Your Project:** https://app.supabase.com/project/vhvxfnxtyrgiydztsonz

---

## 📋 Summary

**The frontend code is working perfectly!**
- ✅ ForgotPassword.tsx - Correct
- ✅ ResetPassword.tsx - Correct
- ✅ App routes - Correct
- ✅ Supabase client - Correct

**The ONLY issue is Supabase Dashboard configuration.**

**Action Required:**
1. Go to Supabase Dashboard
2. Change Site URL from `localhost:3000` to `localhost:5174`
3. Add redirect URLs
4. Save
5. Request NEW password reset
6. Test

That's it! Once you update Supabase, everything will work.

---

**Last Updated:** 2026-01-28 12:48 PM  
**Status:** ⏳ Waiting for Supabase configuration update
