# Ghost Mode - Ghosted Friends List

## Status: Partially Implemented
## Priority: Medium

## Current State
- API endpoint exists but UI integration is unclear
- Backend functionality appears to be in place
- Frontend integration needs to be completed

## What Needs to Be Fixed
- Integrate ghosted friends list API into the frontend UI
- Create UI component to display ghosted friends
- Add ghosted friends to the Ghost Mode overlay or settings
- Ensure proper data fetching and display

## Technical Notes
- API endpoint location: Check backend routes for ghosted friends
- Database fields: `is_ghost`, `purge_count`, `ghosted_at` in profiles table
- Integration point: Likely in GhostModeOverlay component or Settings

## Acceptance Criteria
- Users can view list of ghosted friends
- Ghosted friends are properly displayed in UI
- Data loads correctly from API
- UI is responsive and styled consistently

