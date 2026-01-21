# Live User Status & Message Notifications - Fixes Documentation

## Overview
This document outlines the fixes implemented to address two critical issues:
1. **Online Status Bug**: Users showing as online in the Messages section when they weren't actually online
2. **Missing Message Notifications**: No notifications sent when users receive messages

---

## Issue 1: Online Status Bug - ROOT CAUSE & FIX

### Problem
When users opened the Messages page, all users were showing with green online indicators even though they weren't actually online. The issue was:
- Initial WebSocket connection didn't broadcast the current online user list to the new client
- Only the connecting user's online status was broadcast to others, not all currently online users sent to the new client

### Solution Implemented

#### Backend Change: `/var/www/Puurga/backend/websocketManager.ts`

**Location**: User connection handler (around line 125)

**Before**:
```typescript
// Broadcast user online status to all connected users
this.broadcastUserStatus(userId, true);
```

**After**:
```typescript
// Send all currently online users to the new client
const onlineUserIds = this.getOnlineUsers();
for (const onlineUserId of onlineUserIds) {
  if (onlineUserId !== userId) {
    const statusMessage: WebSocketMessage = {
      type: 'user_online',
      payload: { userId: onlineUserId, isOnline: true } as OnlineStatusPayload
    };
    this.sendToUser(userId, statusMessage);
  }
}

// Broadcast this user's online status to all connected users
this.broadcastUserStatus(userId, true);
```

**What it does**:
1. When a new user connects, the server sends them a list of ALL currently online users
2. This ensures the client's online user state is immediately populated with accurate data
3. Then broadcasts the new user's online status to all other connected clients

---

## Issue 2: Missing Message Notifications - FIX

### Problem
When a message was sent, it was only stored in the database. No:
- Database notification record was created
- WebSocket notification was sent to recipients
- Toast/browser notification appeared for recipients

### Solution Implemented

#### Backend Changes: `/var/www/Puurga/backend/routes/messages.ts`

**Location**: POST `/api/messages/conversations/:conversationId/messages` endpoint

**Added after message is created**:
```typescript
// Get all other participants in this conversation
const { data: otherParticipants } = await supabase
  .from('conversation_participants')
  .select('user_id')
  .eq('conversation_id', conversationId)
  .neq('user_id', user.id);

// Send message notification to other participants
if (otherParticipants && otherParticipants.length > 0) {
  const senderProfile = (message as any).profiles;
  
  // Format message for WebSocket
  const wsMessage = {
    id: message.id,
    content: message.content,
    fromUserId: message.from_user_id,
    createdAt: new Date(message.created_at),
    fromUser: {
      id: senderProfile?.id || message.from_user_id,
      name: senderProfile?.full_name || 'Unknown User',
      username: senderProfile?.username || 'unknown',
      avatar: senderProfile?.avatar_url || undefined
    }
  };
  
  for (const participant of otherParticipants) {
    // 1. Send WebSocket notification for real-time delivery
    wsManager.sendToUser(participant.user_id, {
      type: 'new_message',
      payload: {
        conversationId,
        message: wsMessage
      } as any
    });

    // 2. Create a notification in the database
    try {
      const notificationData: any = {
        sender_id: user.id,
        receiver_id: participant.user_id,
        type: 'message',
        message: `${senderProfile?.full_name || 'Someone'} sent you a message`,
        read: false,
        created_at: new Date().toISOString(),
        data: JSON.stringify({
          conversationId,
          messageId: message.id
        })
      };

      await supabase
        .from('notifications')
        .insert(notificationData);
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }
  }
}
```

**What it does**:
1. **Gets conversation participants**: Finds all other users in the conversation
2. **Sends WebSocket notification**: Immediately notifies online users of the new message
3. **Creates database notification**: Stores notification for all users (whether online or not)
4. **Graceful error handling**: If notification creation fails, the message is still sent

#### Frontend Changes: `/var/www/Puurga/src/context/MessagesContext.tsx`

**Added WebSocket listener for new messages**:
```typescript
const handleNewMessage = (messageData: any) => {
  const { conversationId, message } = messageData;
  
  // Update messages if we're viewing this conversation
  if (currentConversation?.id === conversationId) {
    setMessages(prev => [...prev, message]);
  }
  
  // Reload conversations to show the latest message
  loadConversations();
};

const unsubscribeMessage = websocketService.on('new_message', handleNewMessage);
```

**What it does**:
1. Listens for `new_message` WebSocket events from the backend
2. Updates the messages list if the user is viewing that conversation
3. Reloads conversations list to show the latest message

#### Type Updates

**Backend**: `/var/www/Puurga/backend/websocketManager.ts`
- Updated `NotificationPayload` type to include `'message'` type and `conversationId`/`messageId` in data

**Frontend**: 
- `/var/www/Puurga/src/services/websocketService.ts` - Updated notification payload types
- `/var/www/Puurga/src/context/NotificationsContext.tsx` - Updated notification interface to include `conversationId`
- `/var/www/Puurga/src/components/Notifications/NotificationsDropdown.tsx` - Added handling for message notification navigation

---

## User Experience Improvements

### Online Status Indicator
✅ **Before**: All users showed as online regardless of actual status
✅ **After**: 
- New users connecting see accurate online status of all connected users
- Green dots appear only for actually online users
- Status updates in real-time as users come online/offline

### Message Notifications
✅ **Before**: No notifications when messages were received
✅ **After**:
1. **Real-time notification**: Recipients get instant notification if online
2. **Database notification**: Notification stored for offline users
3. **Notification dropdown**: Shows message notifications in the notifications panel
4. **Notification links**: Clicking message notification takes user to Messages page
5. **Toast notification**: Optional toast notification on message receipt

---

## Testing Checklist

- [ ] Open messages page - verify only truly online users show green dots
- [ ] Send a message from one user to another
- [ ] Verify online recipient gets real-time notification
- [ ] Verify offline user gets database notification when they log in
- [ ] Verify notification click navigates to Messages page
- [ ] Test with multiple conversations
- [ ] Verify no errors in browser console
- [ ] Verify no errors in server logs

---

## Technical Details

### WebSocket Flow
```
User A connects → WebSocket Manager sends all online users to User A
              ↓
         User A gets current online users list
              ↓
User B sends message → Message saved to DB
                   ↓
              WebSocket message sent to all recipients
                   ↓
              Database notification created
                   ↓
              Frontend updates messages list + shows notification
```

### Database Notifications
- **Type**: 'message'
- **Columns Used**:
  - `sender_id`: User who sent the message
  - `receiver_id`: User who receives the notification
  - `type`: 'message'
  - `message`: Readable notification text
  - `read`: false (initially)
  - `created_at`: Timestamp
  - `data`: JSON with `conversationId` and `messageId`

### Error Handling
- Message send succeeds even if notification creation fails
- WebSocket delivery and database storage are independent
- Graceful degradation if optional features fail

---

## Files Modified

1. **Backend**:
   - `/var/www/Puurga/backend/websocketManager.ts` - Online user broadcast on connection
   - `/var/www/Puurga/backend/routes/messages.ts` - Message notifications on send

2. **Frontend**:
   - `/var/www/Puurga/src/context/MessagesContext.tsx` - WebSocket message listener
   - `/var/www/Puurga/src/services/websocketService.ts` - Type updates
   - `/var/www/Puurga/src/context/NotificationsContext.tsx` - Notification types
   - `/var/www/Puurga/src/components/Notifications/NotificationsDropdown.tsx` - Message notification handling

---

## Deployment Notes

✅ **No database migrations required** - Uses existing notification table columns
✅ **Backward compatible** - Doesn't break existing functionality
✅ **No new dependencies** - Uses existing libraries (ws, supabase, react-hot-toast)
✅ **Graceful error handling** - Failures don't crash the app

---

## Future Enhancements

- [ ] Add browser notification API for desktop notifications
- [ ] Add sound notification option
- [ ] Add notification preferences (which types to notify)
- [ ] Add message read receipts
- [ ] Add typing indicators
- [ ] Add last seen timestamp

