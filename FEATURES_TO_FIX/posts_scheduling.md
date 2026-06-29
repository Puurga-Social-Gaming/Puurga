# Posts - Post Scheduling

## Status: Not Implemented
## Priority: Low

## Current State
- Post scheduling functionality does not exist
- Users cannot schedule posts for future publication
- All posts are published immediately

## What Needs to Be Fixed
- Implement post scheduling functionality
- Add date/time picker to post creation
- Create scheduled posts management UI
- Add backend processing for scheduled posts
- Implement scheduled post queue and worker
- Add cancel/edit scheduled posts functionality

## Technical Notes
- Database: posts table needs scheduled_at, status fields (draft, scheduled, published)
- Backend: Need scheduled job processor (cron, bull, or similar)
- UI: Add scheduling option to CreatePost component
- API: Endpoints for creating, updating, canceling scheduled posts
- Timezone: Handle user timezone conversions

## Acceptance Criteria
- Users can schedule posts for future dates/times
- Scheduled posts appear in "Scheduled" section
- Posts automatically publish at scheduled time
- Users can cancel or reschedule posts
- Timezone handling is correct
- UI clearly shows scheduled vs published posts

