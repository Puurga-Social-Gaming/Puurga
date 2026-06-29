# Messaging - Message Editing and Deletion

## Status: Not Implemented
## Priority: High

## Current State
- Message editing is not implemented
- Message deletion is not implemented (only read receipts and status updates exist)
- Users cannot modify or remove sent messages

## What Needs to Be Fixed
- Implement message editing functionality
- Implement message deletion functionality
- Create UI components for edit/delete actions
- Add backend API endpoints for edit/delete operations
- Add edit history tracking for edited messages
- Implement "message deleted" placeholder for removed messages

## Technical Notes
- Backend routes: /backend/routes/messages.ts
- Database: messages table may need is_edited, edited_at, is_deleted fields
- UI: Add edit/delete buttons to message options
- WebSocket: Broadcast edit/delete events to conversation participants

## Acceptance Criteria
- Users can edit their own messages within a time limit
- Users can delete their own messages
- Edited messages show "edited" indicator
- Deleted messages show placeholder or are removed
- Real-time updates for all conversation participants
- Proper permissions (only own messages)

