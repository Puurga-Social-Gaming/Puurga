# Authentication - Two-Factor and OAuth

## Status: Partially Implemented
## Priority: Medium

## Current State
- Only Supabase email/password authentication
- No Two-Factor Authentication (2FA)
- No OAuth providers (Google, GitHub, etc.)
- No configurable session timeout
- No device/session management UI

## What Needs to Be Fixed
- Implement Two-Factor Authentication
- Add OAuth providers (Google, GitHub, etc.)
- Create session management UI
- Add configurable session timeout
- Implement device management
- Add email verification for registration

## Technical Notes
- Auth: Supabase auth supports 2FA and OAuth
- OAuth: Configure providers in Supabase dashboard
- 2FA: Use TOTP (Time-based One-Time Password)
- Sessions: Enhance existing session management
- UI: Add 2FA setup, OAuth buttons, session management

## Acceptance Criteria
- Users can enable 2FA on their accounts
- OAuth login works (Google, GitHub)
- Users can view and manage active sessions
- Session timeout is configurable
- Email verification required for registration
- Device management shows all logged-in devices

