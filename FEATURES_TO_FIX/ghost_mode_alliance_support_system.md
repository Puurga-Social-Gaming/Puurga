# Ghost Mode - Alliance Support System

## Status: Partially Implemented
## Priority: Medium

## Current State
- Backend exists in `/backend/routes/alliances.ts`
- Support types implemented: ENDORSEMENT, REPUTATION_SACRIFICE, VISIBILITY_SACRIFICE
- Frontend integration appears incomplete

## What Needs to Be Fixed
- Complete frontend integration for alliance support system
- Create UI components for alliance support actions
- Implement support type selection interface
- Add alliance support to user profiles or ghost mode overlay
- Integrate with redemption system

## Technical Notes
- Backend route: `/backend/routes/alliances.ts`
- Support types: ENDORSEMENT, REPUTATION_SACRIFICE, VISIBILITY_SACRIFICE
- Database tables: alliances, alliance_support
- Integration with ghost redemption system

## Acceptance Criteria
- Users can view their alliances
- Users can support ghosted allies via different support types
- Support actions properly update backend
- UI displays alliance status and loyalty indicators
- Integration with credit system for support costs

