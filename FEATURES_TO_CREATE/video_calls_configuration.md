# Video Calls - Configuration and Setup

## Status: Broken/Not Configured
## Priority: High

## Current State
- Zego Cloud integration is implemented
- Call components and database tables exist
- Requires Zego Cloud credentials to function
- Environment variables not configured: VITE_ZEGO_APP_ID, VITE_ZEGO_SERVER_SECRET

## What Needs to Be Created
- Configure Zego Cloud credentials
- Set up environment variables
- Test video call functionality
- Add error handling for missing credentials
- Create fallback or alternative solution
- Add configuration UI for admins

## Technical Notes
- Provider: Zego Cloud (@zegocloud/zego-uikit-prebuilt)
- Required: VITE_ZEGO_APP_ID, VITE_ZEGO_SERVER_SECRET
- Components: Call notification, call room components exist
- Database: call_invites table exists
- Alternative: Consider other providers (Twilio, Agora) if Zego not suitable

## Acceptance Criteria
- Zego Cloud credentials are configured
- Video calls work end-to-end
- Error handling for credential issues
- Admin can configure video call settings
- Fallback behavior if service unavailable
- Calls are reliable and performant

