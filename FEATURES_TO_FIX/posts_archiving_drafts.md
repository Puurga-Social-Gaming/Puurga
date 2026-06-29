# Posts - Post Archiving and Drafts

## Status: Not Implemented
## Priority: Low

## Current State
- No post archiving feature
- No draft saving functionality
- Users lose work if they don't publish immediately

## What Needs to Be Fixed
- Implement post draft saving
- Add auto-save functionality for drafts
- Create drafts management UI
- Implement post archiving
- Add archived posts management
- Restore archived posts functionality

## Technical Notes
- Database: posts table needs status field (draft, published, archived)
- Storage: Auto-save drafts to localStorage and database
- UI: Drafts section in user profile or separate page
- API: Endpoints for saving, loading, deleting drafts
- Archiving: Soft delete or move to archive status

## Acceptance Criteria
- Posts auto-save as drafts while editing
- Users can view and manage their drafts
- Users can archive published posts
- Archived posts can be restored
- Drafts persist across sessions
- UI clearly separates drafts, published, archived

