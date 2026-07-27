# Social Features - Blocked and Muted Users

## Status: Completed
## Priority: High

## Current State
- Peer block/mute tables, APIs, and UI are implemented
- Block auto-unfriends and blocks messaging / friend requests / comments / calls
- Mute hides author posts & stories from feed/search (friendship kept; DMs allowed)
- Bidirectional block filtering across feed, search, notifications, conversations

## What Was Done
- Migration: `backend/migrations/20260716_user_blocks_mutes.sql` (**apply in Supabase SQL Editor**)
- Routes: `backend/routes/social.ts` → `/api/social`
- Helpers: `backend/utils/friendRelations.ts` (`areBlocked`, `getBidirectionalBlockedIds`, `getMutedIds`, …)
- Enforcement:
  - Messages (send + DM create + conversation list hide)
  - Friend requests
  - Posts feed (muted + blocked authors)
  - Comments (create + list)
  - Notifications (create skip + list filter)
  - Search (people + posts)
  - Stories feed
  - Calls token (`targetUserId` optional check)
- WebSocket notify on block (`profile_update` with `blockAction`)
- UI: Block/Mute + confirm on UserProfile; lists in Settings

## Acceptance Criteria
- [x] Users can block other users
- [x] Users can mute other users
- [x] Blocked users cannot message or interact (DM + friend request + comments)
- [x] Muted users' content is hidden from feed/stories/search
- [x] Blocked/muted lists are manageable in Settings
- [x] UI is clear and accessible
- [x] Notifications between blocked users are suppressed
- [x] Conversations with blocked peers are hidden from the inbox list
