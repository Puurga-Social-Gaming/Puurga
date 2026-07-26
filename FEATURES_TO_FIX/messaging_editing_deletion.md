# Messaging - Message Editing and Deletion

## Status: Completed
## Priority: High

## Current State
- Message editing and soft-deletion are implemented end-to-end
- Users can edit their own messages within 15 minutes
- Soft-deleted messages show a placeholder for all participants
- Real-time updates via WebSocket (`message_edited` / `message_deleted`)

## What Was Done
- Migration: `backend/migrations/20260716_message_edit_delete.sql`
- API: `PATCH` / `DELETE` on `/conversations/:conversationId/messages/:messageId`
- UI: overflow menu on own bubbles in Messages.tsx
- WebSocket broadcast to conversation participants

## Acceptance Criteria
- [x] Users can edit their own messages within a time limit
- [x] Users can delete their own messages
- [x] Edited messages show "edited" indicator
- [x] Deleted messages show placeholder
- [x] Real-time updates for conversation participants
- [x] Proper permissions (only own messages)
