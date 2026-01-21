# Password Recovery Feature Documentation

## Overview

This document details the complete implementation of the **Forgot Password** and **Reset Password** functionality using Supabase's built-in authentication system. The implementation is fully secure and follows industry best practices.

## Features

✅ **Secure Password Reset** - Uses Supabase's native email-based recovery  
✅ **Email Verification** - Confirmation links sent to registered email  
✅ **Password Validation** - Strong password requirements enforced  
✅ **Token Expiration** - Reset links expire after 24 hours  
✅ **Email Enumeration Protection** - Responses don't reveal if email exists  
✅ **Session Management** - Proper session handling and cleanup  
✅ **Error Handling** - User-friendly error messages  
✅ **Responsive Design** - Works seamlessly on all devices  

## Architecture

### Frontend Components

#### 1. **ForgotPassword.tsx** (`/src/pages/ForgotPassword.tsx`)
- Email input form
- Validation using Zod schema
- Calls `supabase.auth.resetPasswordForEmail()`
- Displays confirmation message with instructions
- Retry functionality

**Key Features:**
```typescript
// Email validation schema
const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Supabase password reset call
const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
  redirectTo: `${window.location.origin}/reset-password`,
});
```

**User Flow:**
1. User enters email address
2. Click "Send Reset Link"
3. Email is sent by Supabase
4. User sees confirmation screen
5. User clicks link in email
6. Redirected to reset-password page

#### 2. **ResetPassword.tsx** (`/src/pages/ResetPassword.tsx`)
- Password reset form with new and confirm password fields
- Real-time validation feedback
- Password visibility toggle
- Session validation
- Success confirmation with redirect to login

**Key Features:**
```typescript
// Password validation schema
const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 
      'Password must contain uppercase, lowercase, number and special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Update password using Supabase
const { error } = await supabase.auth.updateUser({
  password: password,
});
```

**User Flow:**
1. User clicks email link with reset token
2. Session is automatically established by Supabase
3. Validation checks if session is valid
4. User enters new password (must meet requirements)
5. User confirms password
6. Password is updated
7. Redirect to login with success message

### Backend Endpoints

#### 1. **POST /api/auth/forgot-password**
Request password reset email

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent"
}
```

**Status Codes:**
- `200`: Request processed successfully
- `400`: Invalid email format
- `500`: Server error

**Security:**
- Always returns success message (prevents email enumeration)
- Uses Supabase's secure email sending
- Rate limiting recommended (implement on reverse proxy)

#### 2. **POST /api/auth/reset-password**
Reset password with valid session

**Request:**
```json
{
  "password": "NewPassword123!@#"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

**Requirements:**
- Valid Supabase session (from email link click)
- Password must meet requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)

**Status Codes:**
- `200`: Password reset successfully
- `401`: No valid session
- `400`: Invalid password format
- `500`: Server error

#### 3. **POST /api/auth/verify-reset-token** (Optional)
Verify if a reset token is valid

**Request:**
```json
{
  "token": "token_hash"
}
```

**Response:**
```json
{
  "message": "Token is valid",
  "user_id": "uuid",
  "email": "user@example.com"
}
```

**Status Codes:**
- `200`: Token is valid
- `400`: Invalid or expired token
- `500`: Server error

## Routes

### Frontend Routes (React Router)

```
/login                    - Login page (has "Forgot password?" link)
/forgot-password         - Forgot password request form
/reset-password          - Reset password form (accessed via email link)
```

### Backend Routes (Express)

```
POST /api/auth/forgot-password     - Request password reset email
POST /api/auth/reset-password      - Reset password with valid session
POST /api/auth/verify-reset-token  - Verify reset token validity
```

## Environment Variables

Required Supabase configuration (already in `.env`):

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Backend environment variable (set in PM2/deployment):

```env
FRONTEND_URL=https://yourdomain.com  # Used for reset email redirect URL
```

## Email Configuration

Supabase automatically sends password reset emails using your project's email templates. The email includes:

1. **Reset Link** - Formatted as: `your-frontend-url/reset-password#token=xxxxx`
2. **Expiration Notice** - Link expires in 24 hours
3. **Security Warning** - User to ignore if they didn't request reset
4. **Support Link** - Help center or support contact

### Customizing Email Template

To customize the password reset email in Supabase:

1. Go to Supabase Dashboard
2. Navigate to **Authentication** > **Email Templates**
3. Edit the **Password Reset** template
4. Update the reset URL to match your frontend URL

Default template includes:
- Sender information
- Reset link with 24-hour expiration
- Security warnings
- Professional formatting

## Security Considerations

### 1. **Password Requirements**
- Minimum 8 characters
- Must contain uppercase, lowercase, number, and special character
- Same validation on frontend and backend

### 2. **Token Security**
- Tokens are generated by Supabase and tied to user sessions
- Tokens expire after 24 hours
- Tokens are one-time use
- Cannot be used across browser/device unless explicitly handled

### 3. **Email Verification**
- Only legitimate email addresses receive reset links
- Links are tamper-proof (signed by Supabase)
- Invalid tokens are rejected with appropriate errors

### 4. **Session Management**
- Frontend checks if session is valid before showing reset form
- Session is established via email link click
- Session is cleared after password update

### 5. **Rate Limiting**
**Recommended:** Implement on reverse proxy/load balancer
- Limit password reset requests per email: 3 per hour
- Limit password reset attempts per IP: 10 per hour
- Example nginx configuration:

```nginx
limit_req_zone $http_x_forwarded_for zone=auth_reset:10m rate=3r/h;

location /api/auth/forgot-password {
    limit_req zone=auth_reset burst=5 nodelay;
    proxy_pass http://backend;
}
```

### 6. **HTTPS Only**
- Always use HTTPS in production
- Supabase enforces this for email links
- Never send sensitive data over HTTP

## Password Requirements

All passwords must meet these criteria:

| Requirement | Details |
|------------|---------|
| Minimum Length | 8 characters |
| Uppercase | At least one A-Z |
| Lowercase | At least one a-z |
| Numbers | At least one 0-9 |
| Special Characters | At least one of: @$!%*?& |

**Examples:**
- ✅ `SecurePass123!` - Valid
- ✅ `MyPassword@2024` - Valid
- ✅ `Test#1234` - Valid
- ❌ `password123` - No uppercase or special char
- ❌ `Pass@1` - Too short
- ❌ `PASSWORD123!` - No lowercase

## User Experience Flow

### Scenario 1: User Forgot Password

```
1. User clicks "Forgot Password?" on login page
   ↓
2. Navigates to /forgot-password
   ↓
3. Enters email address
   ↓
4. Clicks "Send Reset Link"
   ↓
5. Frontend validates email format
   ↓
6. Backend sends email via Supabase
   ↓
7. User sees confirmation screen
   ↓
8. User checks email inbox
   ↓
9. User clicks reset link in email
   ↓
10. Redirected to /reset-password with session
    ↓
11. Frontend verifies session is valid
    ↓
12. User enters new password
    ↓
13. User confirms password
    ↓
14. Frontend validates password strength
    ↓
15. Backend updates password in Supabase
    ↓
16. User sees success message
    ↓
17. Auto-redirect to login after 2 seconds
    ↓
18. User logs in with new password ✓
```

### Scenario 2: Reset Link Expires

```
1. User requests password reset
   ↓
2. Receives email with reset link
   ↓
3. Waits more than 24 hours
   ↓
4. Clicks reset link
   ↓
5. Frontend detects expired/invalid session
   ↓
6. Shows "Invalid or expired reset link" message
   ↓
7. User clicks "Request New Link"
   ↓
8. Returns to /forgot-password
   ↓
9. Process starts over from step 3 (User Forgot Password flow)
```

### Scenario 3: User Didn't Request Reset

```
1. User receives password reset email they didn't request
   ↓
2. User ignores the email
   ↓
3. Email has security notice about this
   ↓
4. User can report as spam/phishing
   ↓
5. Consider enabling 2FA for added security
```

## Testing

### Manual Testing Checklist

- [ ] Navigate to login page
- [ ] Click "Forgot password?" link
- [ ] Enter valid email address
- [ ] Click "Send Reset Link"
- [ ] Verify success message is shown
- [ ] Check email (may be in spam)
- [ ] Click reset link in email
- [ ] Verify redirected to reset-password page
- [ ] Try submitting without passwords
- [ ] Try mismatched passwords
- [ ] Try password that doesn't meet requirements
- [ ] Enter valid password and confirm
- [ ] Click "Reset Password"
- [ ] Verify success message
- [ ] Verify auto-redirect to login
- [ ] Try logging in with new password
- [ ] Verify login succeeds

### Test Cases

**Test Case 1: Valid Password Reset**
```
1. Email: test@example.com
2. New Password: NewSecure123!
3. Result: Success message, redirect to login
```

**Test Case 2: Password Too Short**
```
1. Email: test@example.com
2. New Password: Short1!
3. Result: Error message, stay on form
```

**Test Case 3: Missing Special Character**
```
1. Email: test@example.com
2. New Password: NoSpecialChar123
3. Result: Error message, stay on form
```

**Test Case 4: Expired Link**
```
1. Request reset
2. Wait 24+ hours
3. Click link
4. Result: Invalid link message, redirect to forgot-password
```

## Troubleshooting

### Issue: "Email not found" error

**Solution:**
- User entered wrong email
- Typo in email address
- Account doesn't exist

**Fix:** Double-check email address, consider registering new account

### Issue: Reset email not arriving

**Causes:**
- Email in spam/junk folder
- Email bounced (invalid address)
- Supabase email service issue

**Solutions:**
1. Check spam/junk folder
2. Check email address for typos
3. Try sending again
4. Contact support if persistent

### Issue: "Invalid or expired reset link"

**Causes:**
- More than 24 hours have passed
- Link was already used
- Browser cookies were cleared
- Private/incognito mode without proper session

**Solutions:**
1. Request new password reset
2. Don't clear browser cookies between clicking link and resetting
3. Use regular browser mode (not private/incognito)

### Issue: Password update fails

**Causes:**
- Password doesn't meet requirements
- Session has expired
- Network connectivity issue

**Solutions:**
1. Ensure password meets all requirements
2. Request new reset link if >24 hours
3. Check internet connection
4. Try again after ensuring proper password

## Best Practices

1. **Educate Users**
   - Include password requirements in UI
   - Show real-time validation feedback
   - Display helpful error messages

2. **Email Security**
   - Emphasize never clicking links from unsolicited emails
   - Show security warnings for suspicious activity
   - Consider adding 2FA for extra security

3. **Monitoring**
   - Log password reset attempts
   - Monitor for unusual activity patterns
   - Set up alerts for multiple failed attempts

4. **Performance**
   - Cache validation results to reduce database hits
   - Implement request debouncing on frontend
   - Use proper indexes on auth tables

5. **Compliance**
   - Ensure GDPR compliance for EU users
   - Document data retention policies
   - Honor "right to be forgotten" requests

## Related Features

- **Two-Factor Authentication (2FA)** - Recommended addition for extra security
- **Email Verification** - Implement for new registrations
- **Account Recovery Questions** - Alternative recovery method
- **Security Audit Logs** - Track all authentication events
- **Suspicious Activity Detection** - Alert users of unusual access patterns

## Support & Debugging

For debugging authentication issues:

1. **Check Browser Console**
   ```javascript
   // Log auth state
   supabase.auth.onAuthStateChange((event, session) => {
     console.log('Auth event:', event);
     console.log('Session:', session);
   });
   ```

2. **Supabase Dashboard**
   - Navigate to Authentication > Users
   - View user details and auth logs
   - Check email logs in Email > Logs

3. **Backend Logs**
   ```bash
   # Check PM2 logs
   pm2 logs puurga-backend
   
   # View error logs
   tail -f /var/www/Puurga/backend/puurga-error.log
   ```

4. **Network Tab**
   - Monitor API requests in browser DevTools
   - Check request/response headers
   - Verify auth tokens are being sent

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-21 | Initial implementation with Supabase integration |

## Credits

- **Supabase** - Email authentication & password recovery
- **React** - Frontend framework
- **Zod** - Schema validation
- **React Router** - Page routing
- **React Hot Toast** - Toast notifications
