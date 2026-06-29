# Posts - Post Analytics

## Status: Not Implemented
## Priority: Medium

## Current State
- No view count tracking per post
- No engagement metrics per post
- No analytics dashboard for posts

## What Needs to Be Fixed
- Implement post view tracking
- Add engagement metrics (likes, comments, shares, views)
- Create post analytics UI
- Add backend analytics endpoints
- Implement analytics aggregation and storage
- Add time-based analytics (daily, weekly, monthly)

## Technical Notes
- Database: Need post_analytics table or fields in posts table
- Tracking: Increment view count on post view
- API: Endpoints for fetching post analytics
- UI: Analytics section in post details or separate analytics page
- Aggregation: Background jobs for calculating metrics

## Acceptance Criteria
- Post views are tracked accurately
- Engagement metrics display on posts
- Analytics dashboard shows post performance
- Time-based analytics (daily/weekly/monthly)
- Data aggregation is efficient
- UI is clear and informative

