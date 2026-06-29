# Social Features - Blocked and Muted Users

## Status: Partially Implemented
## Priority: High

## Current State
- `is_blocked` field exists in database
- Blocking UI not found/implemented
- No mute functionality exists
- Users cannot block or mute other users

## What Needs to Be Fixed
- Implement user blocking functionality
- Create blocking UI
- Implement user muting functionality
- Create muting UI
- Add blocked/muted users management
- Ensure blocked users cannot interact

## Technical Notes
- Database: is_blocked field exists, may need is_muted
- API: Endpoints for block/unblock, mute/unmute
- UI: Add to user profiles, settings
- Enforcement: Middleware to prevent blocked user interactions
- Storage: Track blocked/muted relationships

## Acceptance Criteria
- Users can block other users
- Users can mute other users
- Blocked users cannot message or interact
- Muted users' content is hidden
- Blocked/muted lists are manageable
- UI is clear and accessible

