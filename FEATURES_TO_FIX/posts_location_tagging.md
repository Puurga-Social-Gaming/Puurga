# Posts - Location Tagging

## Status: Partially Implemented
## Priority: Medium

## Current State
- Location picker component exists
- UI shows "Location feature coming soon!" toast
- Backend integration incomplete

## What Needs to Be Fixed
- Complete location tagging functionality
- Integrate with location picker component
- Add backend API for location data
- Store location data with posts
- Display location on posts
- Add location privacy settings

## Technical Notes
- Component: Location picker exists in CreatePost
- Database: posts table may need location fields (lat, lng, location_name)
- API: Need endpoint for location search/validation
- UI: Remove "coming soon" toast and enable functionality
- Privacy: Add location visibility settings

## Acceptance Criteria
- Users can add location to posts
- Location search and selection works
- Location displays on post feed
- Location privacy settings respected
- Location data persists correctly
- UI is responsive and user-friendly

