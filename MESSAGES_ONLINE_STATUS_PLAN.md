# Messages & Online Status Enhancement Plan

## Current Status ✅
- ✅ Real-time WebSocket infrastructure is in place
- ✅ Online status broadcasting exists in `websocketManager.ts`
- ✅ Message notifications are being created in the database (lines 268-283 in `messages.ts`)
- ✅ Toast notifications appear for new messages (lines 209-228 in `MessagesContext.tsx`)

## Issues to Fix 🔧

### 1. **Message Notifications Not Showing in Notifications Panel**
**Problem:** Messages create database notifications but they're not appearing in the Notifications panel.

**Root Cause:** The backend creates message notifications, but doesn't broadcast them via WebSocket to the NotificationsContext.

**Solution:**
- Update `backend/routes/messages.ts` to broadcast notification via WebSocket after inserting
- Ensure the notification format matches what `NotificationsContext` expects

### 2. **Real-time Online Status Updates**
**Problem:** Online status changes via WebSocket but may not be reflecting properly in all components.

**Current Implementation:**
- ✅ WebSocket broadcasts `user_online` and `user_offline` events
- ✅ MessagesContext handles status updates (lines 259-272)
- ⚠️ May need to verify status updates are reaching all components

**Improvements Needed:**
- Ensure online status updates propagate to conversation list
- Add periodic online status refresh for reliability

## Implementation Steps

### Step 1: Fix Message Notifications in Notifications Panel
1. Update `backend/routes/messages.ts` to send WebSocket notification
2. Test that notifications appear in the Notifications panel

### Step 2: Test and Verify Online Status
1. Verify online status indicators in Messages sidebar
2. Add real-time updates when users connect/disconnect
3. Test with multiple browser windows

### Step 3: Polish
1. Ensure notification badges update correctly
2. Test notification dismissal
3. Verify click-through from notification to message

## Files to Modify
- `backend/routes/messages.ts` - Add WebSocket notification broadcast
- Potentially `src/context/MessagesContext.tsx` - Verify status handling
- Potentially `src/pages/Messages.tsx` - Ensure UI reflects status

