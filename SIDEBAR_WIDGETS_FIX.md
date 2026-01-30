# ✅ PC View Sidebar Widgets Fix

## Changes Made

### 1. **"Online Friends" Widget** 🟢
**File:** `src/components/Sidebar/RightSidebar.tsx`

**Problem:**
The widget was fetching accepted friends but had no way to know who was actually online in real-time, relying on static database data which doesn't track presence.

**Solution:**
- Imported `useMessages` hook to access the global `onlineUsers` state (which is kept up-to-date via WebSocket).
- Fetches the list of accepted friends once.
- **Dynamic Filtering:** Filters this friend list against the live `onlineUsers` array.
- **Result:** The list only displays friends who are *currently* connected.

### 2. **"Friend Requests" Widget** 👥
**File:** `src/components/Sidebar/RightSidebar.tsx`

**Status:**
- Logic uses Supabase Realtime subscription (`postgres_changes` on `friend_requests` table).
- This ensures that if someone sends you a friend request, it appears instantly without refreshing.

### 3. **"People You May Know" Widget** 🔍
**File:** `src/components/Sidebar/RightSidebar.tsx`

**Status:**
- Logic fetches suggestions from `/api/friends/suggestions`.
- Aligns with the main "Suggested Friends" page logic.

## Verification
- ✅ **Build:** Passed (`npm run build`).
- ✅ **Real-time:** Online status updates automatically as users connect/disconnect.

## How to Test
1. **Online Friends:**
   - Log in as User A on PC.
   - Log in as User B (friend of A) in Incognito/another browser.
   - User A should see User B appear in the "Online Friends" sidebar widget.
   - User B closes tab -> User A sees User B disappear.

2. **Friend Requests:**
   - Send a request to User A from User B.
   - User A should see the request appear in the sidebar immediately.

