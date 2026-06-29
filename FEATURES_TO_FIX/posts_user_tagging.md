# Posts - User Tagging

## Status: Partially Implemented
## Priority: Medium

## Current State
- User tagging placeholder exists
- UI shows "Tagging feature coming soon!" toast
- @mention support exists but full tagging incomplete

## What Needs to Be Fixed
- Complete user tagging functionality
- Implement user search in post creation
- Add @mention autocomplete/selection
- Tag users in posts and notify them
- Display tagged users on posts
- Add tagging permissions and privacy

## Technical Notes
- Component: Tagging placeholder in CreatePost
- Database: posts table may need tagged_users field or separate table
- API: Need user search endpoint for tagging
- Mentions: @mention support exists, extend for full tagging
- Notifications: Integrate with notification system for tagged users

## Acceptance Criteria
- Users can search and select other users to tag
- @mention autocomplete works in post editor
- Tagged users receive notifications
- Tagged users display on posts
- Tagging permissions respected (privacy settings)
- UI is intuitive and responsive

