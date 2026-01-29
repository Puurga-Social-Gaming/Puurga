# Password Reset Redirect URL Fix

## Problem
Password reset emails are sending users to `http://localhost:3000` instead of `http://localhost:5174`, causing the error:
```
http://localhost:3000/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
```

## Root Cause
Supabase dashboard has `localhost:3000` configured as the redirect URL, but the app runs on `localhost:5174`.

## Solution Steps

### 1. Update Supabase Dashboard Configuration

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (vhvxfnxtyrgiydztsonz)
3. Navigate to **Authentication** → **URL Configuration**
4. Update the following settings:

   **Site URL:**
   ```
   http://localhost:5174
   ```

   **Redirect URLs:** (Add all of these)
   ```
   http://localhost:5174/**
   http://localhost:5173/**
   http://localhost:3000/**
   http://127.0.0.1:5174/**
   ```
   
   > Note: We keep localhost:3000 and 5173 for compatibility, but 5174 is primary

5. Click **Save**

### 2. Update Email Template (Optional but Recommended)

While in Supabase Dashboard:

1. Navigate to **Authentication** → **Email Templates**
2. Click on **"Confirm signup"** or **"Magic Link"** templates
3. Look for the email template that has password reset
4. Find **"Reset Password"** template
5. Verify the reset URL uses: `{{ .SiteURL }}/reset-password`
6. It should look like:
   ```html
   <a href="{{ .ConfirmationURL }}">Reset Password</a>
   ```
   This automatically uses the Site URL configured above.

### 3. Clear Browser Cache & Test

After updating Supabase:

1. Clear browser cache and cookies
2. Go to `http://localhost:5174/forgot-password`
3. Enter your email
4. Check your email for the reset link
5. Verify the link now points to `localhost:5174`

## Verification Checklist

- [ ] Supabase Site URL set to `http://localhost:5174`
- [ ] Redirect URLs include `http://localhost:5174/**`
- [ ] App accessible at `http://localhost:5174`
- [ ] Password reset email received
- [ ] Email link redirects to `http://localhost:5174/reset-password`
- [ ] Password reset form loads successfully
- [ ] Can successfully reset password

## Testing the Complete Flow

1. **Start the development server:**
   ```powershell
   npm run dev
   ```

2. **Navigate to login page:**
   ```
   http://localhost:5174/login
   ```

3. **Click "Forgot Password?"**

4. **Enter your email address**

5. **Check your email inbox** (and spam folder)

6. **Click the reset link** - Should redirect to `localhost:5174/reset-password`

7. **Enter new password:**
   - Minimum 8 characters
   - Must match confirmation

8. **Submit the form**

9. **You should see "Password Reset Successful!"**

10. **Login with your new password**

## For Production Deployment

When deploying to production, update:

1. **Supabase Site URL:**
   ```
   https://yourdomain.com
   ```

2. **Supabase Redirect URLs:**
   ```
   https://yourdomain.com/**
   https://www.yourdomain.com/**
   ```

3. **Environment Variables:**
   ```env
   VITE_SUPABASE_URL=https://vhvxfnxtyrgiydztsonz.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

## Troubleshooting

### Issue: Still getting localhost:3000 in email
**Solution:** Clear Supabase cache by:
1. Go to Supabase Dashboard → Authentication
2. Disable and re-enable email provider
3. Save settings again
4. Request a new password reset

### Issue: Token expired immediately
**Solution:**
1. Ensure cookies are enabled
2. Use the same browser to click the email link
3. Don't use incognito mode
4. Request a new reset if link is >1 hour old

### Issue: "Session not found" error
**Solution:**
1. The link may have been opened in a different browser
2. Request a new password reset link
3. Click the link in the email within 5 minutes

## Additional Notes

- The frontend code in `ForgotPassword.tsx` already handles localhost detection correctly
- The `ResetPassword.tsx` page validates the session properly
- Both pages are styled with your theme and include proper error handling
- All validation is in place and working

## Status: Ready to Test

After updating the Supabase dashboard settings, the password reset flow should work perfectly.
