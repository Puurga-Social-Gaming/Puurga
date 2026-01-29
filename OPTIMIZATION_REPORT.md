# Supabase Egress Optimization & Caching Report

## 1. Backend: Aggressive Image Caching
**Code:** `backend/server.ts`
**Change:** Verified `Cache-Control: public, max-age=31557600`
**Impact:** Browsers will cache images for 1 year. They will NOT be re-downloaded on page refresh or navigation.
**Status:** ✅ Active

## 2. Backend: Friend Suggestions Optimization (Major Saver)
**Code:** `backend/routes/friends.ts` && `backend/migrations/create_get_friend_suggestions.sql`
**Before:** Fetched up to **50 full profiles** from DB on every page load to filter in JavaScript. (Huge bandwidth/egress).
**After:** 
  1. Uses SQL `rpc()` function to filter on DB server. Returns only ~5-10 rows.
  2. Adds `Cache-Control: public, max-age=300` (5 mins) header.
**Impact:** Reduces egress for this feature by ~95% and eliminates repeated requests.
**Action Required:** Run the SQL commands below in your Supabase SQL Editor.

## 3. Frontend: Home Feed Caching
**Code:** `src/pages/Home.tsx`
**Change:** Implemented `sessionStorage` caching for the main feed.
**Impact:** When you navigate from Home -> Profile -> Home, the feed loads INSTANTLY from local memory instead of hitting the API. Cache lasts 2 minutes or until you create a new post.
**Status:** ✅ Active

---

## 🛠️ ACTION REQUIRED: Run this SQL in Supabase

To enable the Friend Suggestions optimization, run this in your Supabase SQL Editor:

```sql
-- Database Function to efficiently get friend suggestions
CREATE OR REPLACE FUNCTION get_friend_suggestions(
  p_user_id UUID,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.username,
    p.avatar_url
  FROM profiles p
  WHERE 
    p.id != p_user_id -- Exclude self
    AND p.id NOT IN (
        SELECT friend_id FROM friends WHERE user_id = p_user_id
        UNION
        SELECT user_id FROM friends WHERE friend_id = p_user_id
    )
    AND p.id NOT IN (
        SELECT receiver_id FROM friend_requests WHERE sender_id = p_user_id AND status = 'pending'
        UNION
        SELECT sender_id FROM friend_requests WHERE receiver_id = p_user_id AND status = 'pending'
    )
  ORDER BY random()
  LIMIT p_limit;
END;
$$;
```

Also run this to ensure friend tables exist (fixes 500 error):

```sql
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_friend_request UNIQUE(sender_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_friendship UNIQUE(user_id, friend_id)
);

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
```
