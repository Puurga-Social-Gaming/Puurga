# Video Calls - Configuration and Setup

## Status: Completed
## Priority: High

## What Was Done
- Server-only ZEGO_* in production (no VITE secret fallback in prod)
- `POST /api/calls/end` for invite lifecycle
- CallRoom ends invite on leave; audio-only disables camera UI
- Invite timeout 45s → missed
