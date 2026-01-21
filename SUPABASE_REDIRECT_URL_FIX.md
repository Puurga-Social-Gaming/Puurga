# Supabase Configuration - Redirect URLs Fix

## Problem

When clicking the password reset link in the email, you're being redirected to:
```
https://vhvxfnxtyrgiydztsonz.supabase.co/auth/v1/verify?token=...&redirect_to=http://localhost:3000
```

But your frontend is actually running on:
```
http://localhost:5174
```

This causes the page to fail with `ERR_CONNECTION_REFUSED`.

## Solution

You need to configure Supabase to trust your frontend URL as a valid redirect destination.

### Step 1: Add Redirect URL to Supabase

1. **Go to Supabase Dashboard**
   - URL: https://app.supabase.com
   - Select your project

2. **Navigate to Authentication Settings**
   - Left sidebar → **Authentication** (or **Auth**)
   - Click **Providers** tab
   - Scroll down to **Redirect URLs**

3. **Add Your Frontend URL**
   - Click **Add URL** (or similar button)
   - Enter: `http://localhost:5174`
   - For production, also add: `https://yourdomain.com`
   - Click **Save**

### Step 2: Set Correct Environment Variable (Frontend)

In your `.env` or `.env.local` file, ensure:

```env
VITE_SUPABASE_URL=https://vhvxfnxtyrgiydztsonz.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

These should already be set correctly.

### Step 3: Verify Frontend Port

Your `vite.config.ts` shows:
```typescript
server: {
  port: 5174,
  ...
}
```

This is correct. Your frontend should be accessible at: `http://localhost:5174`

### Step 4: Test the Flow

1. **Start your frontend:**
   ```bash
   cd /var/www/Puurga
   npm run dev
   ```
   You should see: `VITE v5.x.x ready in xxx ms`
   Access at: `http://localhost:5174`

2. **Start your backend:**
   ```bash
   cd /var/www/Puurga/backend
   npm run dev
   ```
   Or via PM2: `pm2 start "npm run dev" --name puurga-backend`

3. **Go to forgot password:**
   - Navigate to `http://localhost:5174/forgot-password`
   - Enter your email
   - Submit

4. **Check your email:**
   - Open the password reset email
   - Click the reset link

5. **Verify redirect:**
   - Should redirect to `http://localhost:5174/reset-password`
   - Should NOT redirect to `localhost:3000`

## Production Configuration

When deploying to production, also add your production URL:

**In Supabase Dashboard:**
1. Go to Authentication → Providers → Redirect URLs
2. Add: `https://yourdomain.com`
3. Also add: `https://yourdomain.com/reset-password` (optional but recommended)
4. Save

**Update Frontend Code:**

Update `/src/pages/ForgotPassword.tsx` to support both development and production:

```typescript
const getRedirectUrl = () => {
  if (window.location.origin.includes('localhost')) {
    return 'http://localhost:5174/reset-password';
  }
  return `${window.location.origin}/reset-password`;
};

// In handleSubmit:
const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(
  trimmedEmail,
  {
    redirectTo: getRedirectUrl(),
  }
);
```

## Complete Redirect URLs List

Add these to your Supabase Authentication → Redirect URLs:

**Development:**
- `http://localhost:5174`
- `http://localhost:5174/reset-password`

**Production:**
- `https://yourdomain.com`
- `https://yourdomain.com/reset-password`

**Additional (if using different domains):**
- `https://www.yourdomain.com`
- `https://app.yourdomain.com`
- etc.

## Email Template Verification

You can also verify that Supabase is using the correct reset URL in the email template:

1. Go to Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Find **Password Reset** template
4. Check the reset link URL in the template
5. It should contain your configured redirect URL

## Troubleshooting

### Issue: Still redirecting to localhost:3000

**Solution:**
1. Clear browser cache (Ctrl+Shift+Del or Cmd+Shift+Del)
2. Clear localStorage (Open DevTools Console, type: `localStorage.clear()`)
3. Try in incognito/private window
4. Verify Supabase URL in `.env` is correct
5. Check that redirect URL is saved in Supabase dashboard

### Issue: "Invalid redirect_to parameter"

**Solution:**
1. Verify the URL is added in Supabase dashboard
2. Use exact URL (including protocol `http://` or `https://`)
3. No trailing slashes (use `http://localhost:5174` not `http://localhost:5174/`)
4. Wait a few minutes for Supabase to apply changes
5. Restart frontend dev server

### Issue: Email not being sent

**Solution:**
1. Check Supabase email service is enabled
2. Verify email address is correct
3. Check spam/junk folder
4. View Supabase logs: Dashboard → Logs
5. Verify VITE_SUPABASE_URL is correct

## Verifying Configuration

Run this in browser console while on your app:

```javascript
// Check if Supabase client is properly initialized
import { supabase } from './lib/supabaseClient';

console.log('Supabase URL:', supabase.supabaseUrl);
console.log('Current origin:', window.location.origin);
console.log('Expected redirect:', window.location.origin + '/reset-password');
```

## Quick Checklist

- [ ] Frontend running on `http://localhost:5174`
- [ ] `http://localhost:5174` added to Supabase redirect URLs
- [ ] `http://localhost:5174/reset-password` added (recommended)
- [ ] Environment variables set correctly
- [ ] Browser cache cleared
- [ ] LocalStorage cleared
- [ ] Restarted dev server
- [ ] Production URL added to Supabase (if deploying)

## Next Steps

1. ✅ Add redirect URL to Supabase dashboard
2. ✅ Clear browser cache
3. ✅ Restart frontend dev server
4. ✅ Request password reset again
5. ✅ Click link in email
6. ✅ Should now see reset password form at `http://localhost:5174/reset-password`

---

**Need Help?**
- Supabase Docs: https://supabase.com/docs/guides/auth/password-reset
- Supabase Support: https://app.supabase.com/support
