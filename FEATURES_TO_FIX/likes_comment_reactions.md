# Likes/Reactions - Comment Reactions

## Status: Not Implemented
## Priority: Low

## Current State
- Post reactions are fully implemented
- Comment reactions are not implemented
- Can use post reactions as reference implementation

## What Needs to Be Fixed
- Implement comment reaction system
- Create UI component for comment reactions
- Add backend API endpoints for comment reactions
- Integrate with WebSocket for real-time updates
- Add reaction emoji picker for comments

## Technical Notes
- Reference: PostReactions component for implementation pattern
- Database: May need comment_reactions table
- API: Endpoints similar to /api/comments/:commentId/react
- WebSocket: Real-time reaction updates
- UI: Add reaction button to comment components

## Acceptance Criteria
- Users can react to comments with emojis
- Reaction counts display in real-time
- Users can see who reacted to comments
- Reactions persist correctly in database
- UI is consistent with post reactions
- Performance is good with many comments

