# ✅ Fixed Missing `/ghosted-friends` Endpoint

## Issue
Frontend was calling `/api/redeem/ghosted-friends` but this route didn't exist, causing 404 errors:
```
Failed to load resource: the server responded with a status of 404 (Not Found)
api/redeem/ghosted-friends:1
```

## Solution
Added new endpoint in `backend/routes/redemption.ts`:

### Route: `GET /api/redeem/ghosted-friends`
**Purpose:** Get list of authenticated user's friends who are currently in ghost mode (can be redeemed)

**How it works:**
1. Get all friendships for the current user from `friends` table
2. Extract friend IDs  
3. Query `profiles` table for friends where `is_ghost = true`
4. Return formatted list with redemption cost (100 credits)

**Response Format:**
```typescript
[
  {
    id: string,
    fullName: string,
    username: string,
    avatarUrl: string | null,
    isGhost: boolean,
    purgeCount: number,
    ghostedAt: string | null,
    redemptionCost: 100
  }
]
```

**Error Handling:**
- Returns empty array `[]` instead of errors to prevent UI crashes
- Handles missing friendships gracefully
- Handles database errors gracefully

## Other 404s Explained
- **Image 404s** (`uploads/xxxx.jpg`): These are expected if images were deleted or never uploaded. The UI should handle missing images gracefully by using placeholders.
- **Messages conversation errors**: These were happening when backend was down. Should be resolved now.

## Files Modified
- ✅ `backend/routes/redemption.ts` - Added `/ghosted-friends` endpoint

## Testing
1. Login as a user who has friends
2. Have one of those friends enter ghost mode  
3. Visit Home page
4. The ghosted friends section should now load without 404 errors

