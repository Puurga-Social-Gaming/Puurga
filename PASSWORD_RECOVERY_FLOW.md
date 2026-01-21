# Password Recovery Flow Diagram

## Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FORGOT PASSWORD FLOW                         │
└─────────────────────────────────────────────────────────────────────┘

User Interface                  Frontend Logic              Supabase
──────────────────────────────────────────────────────────────────────

1. User on Login Page
   │
   ├─ Clicks "Forgot Password?"
   │
   └─→ Navigate to /forgot-password
       │
       └─→ ForgotPassword.tsx renders
           ├─ Email input form
           ├─ "Send Reset Link" button
           └─ Submit handler awaits


2. User Submits Email
   │
   ├─ Frontend validates email format (Zod)
   │  └─ If invalid: Show error message
   │
   └─→ Call supabase.auth.resetPasswordForEmail()
       │
       └─→ Send to Supabase
           ├─ Verify email exists
           ├─ Generate secure token (valid 24hrs)
           ├─ Send email with reset link
           │  └─ Link format: /reset-password#token=xxx&type=recovery
           └─→ Return response


3. Email Sent Confirmation
   │
   ├─ Show confirmation page
   │  ├─ "Check your email" message
   │  ├─ Instructions on next steps
   │  └─ Links to try again or return to login
   │
   └─ User checks email
       ├─ Open inbox (check spam if not found)
       └─ Click reset link


4. User Clicks Email Link
   │
   ├─ Browser opens: /reset-password#access_token=xxx&type=recovery
   │
   ├─ Supabase detects URL params automatically
   │
   └─→ Supabase exchanges token for session
       ├─ Token validated
       ├─ Session created
       └─ Browser cookie set (for auth)


┌─────────────────────────────────────────────────────────────────────┐
│                        RESET PASSWORD FLOW                          │
└─────────────────────────────────────────────────────────────────────┘


5. User on Reset Password Page
   │
   ├─ ResetPassword.tsx renders
   │
   ├─ Check for valid session
   │  ├─ Call supabase.auth.getSession()
   │  ├─ If no session: Show "Invalid link" error
   │  └─ If session exists: Continue
   │
   ├─ Display reset form
   │  ├─ New Password input
   │  ├─ Confirm Password input
   │  ├─ Show password requirements
   │  └─ Password strength indicator (optional)
   │
   └─ User enters passwords


6. User Submits New Password
   │
   ├─ Frontend validation (Zod)
   │  ├─ Check password length (8+ chars)
   │  ├─ Check uppercase (A-Z)
   │  ├─ Check lowercase (a-z)
   │  ├─ Check number (0-9)
   │  ├─ Check special char (@$!%*?&)
   │  └─ Check passwords match
   │
   └─→ If all valid:
       │
       ├─ Call supabase.auth.updateUser({ password })
       │
       └─→ Send to Supabase with session token
           ├─ Verify session is still valid
           ├─ Validate password requirements
           ├─ Hash password securely
           ├─ Update user record
           ├─ Invalidate old sessions (optional)
           └─→ Return success response


7. Password Reset Success
   │
   ├─ Show success message
   │  ├─ "Password reset successfully!"
   │  └─ "You can now log in with your new password"
   │
   ├─ Auto-redirect to login after 2 seconds
   │
   └─ User logs in with new password
       ├─ Enter email
       ├─ Enter new password
       └─ Click login
           └─ Authentication succeeds ✓


┌─────────────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING PATHS                             │
└─────────────────────────────────────────────────────────────────────┘


ERROR 1: Invalid Email
─────────────────────
User enters invalid email format
  │
  └─→ Frontend validation catches
      ├─ Show error: "Invalid email address"
      └─ Prevent form submission


ERROR 2: Email Not Found
───────────────────────
User enters email that doesn't exist
  │
  └─→ Supabase handles gracefully
      ├─ Still returns success message (for security)
      ├─ User sees: "If account exists, email was sent"
      └─ Prevents email enumeration attacks


ERROR 3: Expired Reset Link (>24 hours)
───────────────────────────────────────
User clicks reset link after 24 hours
  │
  └─→ Supabase token expires
      ├─ ResetPassword.tsx checks session
      ├─ No valid session found
      ├─ Show error: "Invalid or expired reset link"
      └─ Link to "Request New Link"


ERROR 4: Invalid Password
──────────────────────────
User enters password that doesn't meet requirements
  │
  ├─→ Frontend validation catches
  │   ├─ Show specific error for missing requirement
  │   │  (e.g., "Must contain uppercase letter")
  │   └─ Prevent form submission
  │
  └─→ Backend validation (secondary check)
      ├─ If frontend validation bypassed
      ├─ Return 400 error with details
      └─ Frontend shows error


ERROR 5: Session Invalid
────────────────────────
Session expires or user logs out before completing reset
  │
  └─→ ResetPassword component detects
      ├─ getSession() returns null
      ├─ Show: "Session expired, request new reset link"
      └─ Redirect to forgot-password


ERROR 6: Network Error
──────────────────────
Network fails during reset request
  │
  └─→ Frontend catches error
      ├─ Show: "Network error, please try again"
      └─ Allow retry


┌─────────────────────────────────────────────────────────────────────┐
│                    DATA FLOW SUMMARY                                │
└─────────────────────────────────────────────────────────────────────┘


Frontend State Management:
───────────────────────────
ForgotPassword Component:
  ├─ email: string
  ├─ loading: boolean
  ├─ submitted: boolean
  ├─ error: string
  └─ Conditional rendering based on submitted state

ResetPassword Component:
  ├─ password: string
  ├─ confirmPassword: string
  ├─ showPassword: boolean
  ├─ showConfirmPassword: boolean
  ├─ loading: boolean
  ├─ error: string
  ├─ success: boolean
  ├─ isValidToken: boolean
  ├─ checkingToken: boolean
  └─ Conditional rendering based on validation states


Backend Database:
──────────────────
Supabase Auth:
  ├─ auth.users table (Supabase managed)
  │  ├─ id (uuid)
  │  ├─ email (string)
  │  ├─ encrypted_password (string)
  │  ├─ email_confirmed_at (timestamp)
  │  ├─ recovery_sent_at (timestamp)
  │  └─ last_sign_in_at (timestamp)
  │
  └─ password_reset_tokens (Supabase managed)
     ├─ token_hash (string)
     ├─ user_id (uuid)
     ├─ created_at (timestamp)
     └─ expires_at (timestamp) [24 hours]


Email Service:
──────────────
Supabase Email:
  ├─ Triggered on resetPasswordForEmail()
  ├─ Uses default email template (customizable)
  ├─ Contains reset link with token
  ├─ Expires 24 hours
  └─ Can be configured in dashboard


┌─────────────────────────────────────────────────────────────────────┐
│                    SECURITY FLOW                                    │
└─────────────────────────────────────────────────────────────────────┘


Authentication & Authorization:
────────────────────────────────
1. Email Link Contains Token
   └─ Token signed by Supabase (tamper-proof)

2. Token Exchange
   ├─ Browser receives link with token
   ├─ Supabase automatically validates
   ├─ Secure session created if valid
   └─ Session stored in browser cookie

3. Session Validation
   ├─ ResetPassword component checks session
   ├─ Must have valid session to reset password
   ├─ Session expires after 24 hours
   └─ One-time use (session consumed on reset)

4. Password Update
   ├─ Requires valid session (user authenticated)
   ├─ Password hashed with bcrypt (Supabase)
   ├─ Old password NOT required (already authenticated)
   └─ All old sessions invalidated


Password Validation:
────────────────────
Frontend (Zod Schema):
  ├─ Minimum 8 characters
  ├─ At least one uppercase (A-Z)
  ├─ At least one lowercase (a-z)
  ├─ At least one digit (0-9)
  ├─ At least one special (@$!%*?&)
  └─ Regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

Backend (Express Validation):
  └─ Same regex validation (defense in depth)


Email Security:
────────────────
Supabase Measures:
  ├─ SMTP encryption (TLS/SSL)
  ├─ Email authentication (SPF/DKIM/DMARC)
  ├─ Rate limiting on sends
  ├─ Token signing (tamper-proof)
  ├─ 24-hour expiration
  └─ One-time use tokens


Environment Security:
──────────────────────
Frontend:
  ├─ Uses public API key (VITE_SUPABASE_ANON_KEY)
  ├─ Row Level Security (RLS) enforces permissions
  └─ No secrets in frontend

Backend:
  ├─ Uses service role key (SUPABASE_SERVICE_ROLE_KEY)
  ├─ Never exposed to frontend
  ├─ Has elevated permissions for admin ops
  └─ Store in environment variables only


┌─────────────────────────────────────────────────────────────────────┐
│                    SEQUENCE DIAGRAM                                 │
└─────────────────────────────────────────────────────────────────────┘


User              Browser               Frontend              Supabase
  │                  │                     │                     │
  ├─ Clicks link────→│                     │                     │
  │                  ├─ Navigate────────→│                     │
  │                  │                     ├─ resetPasswordForEmail()
  │                  │                     │────────────────────→│
  │                  │                     │                     ├─ Validate email
  │                  │                     │                     ├─ Generate token
  │                  │                     │                     ├─ Send email
  │                  │                     │←────────────────────┤
  │                  │←────────────────────┤                     │
  │                  ├─ Show confirm message                      │
  │                  │
  │ (User opens email and clicks link)
  │
  │                  ├─ /reset-password#token=xxx
  │                  │
  │                  ├─ detectSessionInUrl()
  │                  ├─ Token exchanged for session
  │                  ├─ Cookie set
  │                  │
  │                  ├─ getSession()────→│
  │                  │                     ├─ Check browser cookies
  │                  │                     │←────────────────────┤ Valid
  │                  │←────────────────────┤
  │                  ├─ Show reset form
  │                  │
  ├─ Enter password─→│
  │                  ├─ Validate locally
  │                  ├─ updateUser()
  │                  │────────────────────→│
  │                  │                     ├─ Verify session
  │                  │                     ├─ Hash password
  │                  │                     ├─ Update database
  │                  │←────────────────────┤
  │                  ├─ Show success
  │                  ├─ Redirect to login
  │
  ├─ Log in (new password)
  │                  ├─ Login request
  │                  │────────────────────→│
  │                  │                     ├─ Verify password
  │                  │                     ├─ Create session
  │                  │←────────────────────┤
  │                  ├─ Set cookie
  │                  ├─ Redirect to home
  ├─ Logged in ✓────│

```

## Component Hierarchy

```
App
├── Router (/forgot-password)
│   └── ForgotPassword
│       ├── Form
│       │   ├── Email Input
│       │   └── Submit Button
│       └── Confirmation Screen
│           ├── Message
│           └── Action Buttons
│
├── Router (/reset-password)
│   └── ResetPassword
│       ├── Token Validation
│       │   ├── Checking State
│       │   └── Invalid Token State
│       ├── Reset Form
│       │   ├── Password Input
│       │   ├── Confirm Input
│       │   └── Submit Button
│       └── Success State
│           └── Auto-redirect
│
└── Router (/login)
    └── Login
        └── "Forgot password?" Link
```

## State Transitions

```
ForgotPassword Component:
────────────────────────
┌─────────────────────┐
│   Initial State     │
│  - email: ""        │
│  - loading: false   │
│  - submitted: false │
│  - error: ""        │
└──────────┬──────────┘
           │
           ├─ User enters email
           │  └─→ Update state
           │
           ├─ User clicks submit
           │  └─→ loading: true
           │
           ├─ Success response
           │  ├─→ loading: false
           │  ├─→ submitted: true
           │  └─→ Show confirmation screen
           │
           └─ Error response
              ├─→ loading: false
              ├─→ error: "message"
              └─→ Show error message


ResetPassword Component:
────────────────────────
┌──────────────────────────┐
│   Initial State          │
│  - checkingToken: true   │
│  - password: ""          │
│  - loading: false        │
│  - error: ""             │
│  - success: false        │
└──────────┬───────────────┘
           │
           ├─ useEffect: check session
           │  │
           │  ├─ Valid session
           │  │  └─→ checkingToken: false
           │  │  └─→ isValidToken: true
           │  │  └─→ Show form
           │  │
           │  └─ Invalid/expired session
           │     ├─→ checkingToken: false
           │     ├─→ isValidToken: false
           │     └─→ Show error screen
           │
           ├─ User enters password
           │  └─→ Update state
           │
           ├─ User submits
           │  └─→ loading: true
           │
           ├─ Success
           │  ├─→ loading: false
           │  ├─→ success: true
           │  └─→ Auto-redirect after 2s
           │
           └─ Error
              ├─→ loading: false
              ├─→ error: "message"
              └─→ Show error on form
```

---

## Integration Points

### Supabase Integration:
```
Frontend                Backend                Database
│                      │                       │
├─ supabase.auth.*     ├─ Supabase SDK        │
│  ├─ resetPassword    │  ├─ auth.resetPassword
│  ├─ updateUser       │  ├─ auth.updateUser
│  ├─ getSession       │  └─ verify tokens
│  └─ onAuthState      │
│                      └─→ Supabase Managed Tables
│                          ├─ auth.users
│                          ├─ password_reset_tokens
│                          └─ audit logs
```

This comprehensive flow ensures secure, user-friendly password recovery with proper error handling and validation at every step.
