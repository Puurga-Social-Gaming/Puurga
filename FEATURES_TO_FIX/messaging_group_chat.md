# Messaging - Group Chat

## Status: Completed
## Priority: High

## What Was Done
- Migration: images, soft-delete flags, `group_message_reads`, `group_message_reactions`
- POST accepts media/images; WS `group_message` / reaction / typing
- Mark-read + react endpoints
- GroupDetail: WebSocket instead of 3s polling; reactions + read counts
