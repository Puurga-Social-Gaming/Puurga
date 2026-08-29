-- Mutual follow graph (friends auto-follow both directions)
CREATE TABLE IF NOT EXISTS followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id);

-- Backfill mutual follows from existing friendships (user_id_1 / user_id_2 layout)
INSERT INTO followers (follower_id, following_id, created_at)
SELECT f.user_id_1, f.user_id_2, COALESCE(f.created_at, NOW())
FROM friends f
WHERE f.user_id_1 IS NOT NULL AND f.user_id_2 IS NOT NULL
ON CONFLICT (follower_id, following_id) DO NOTHING;

INSERT INTO followers (follower_id, following_id, created_at)
SELECT f.user_id_2, f.user_id_1, COALESCE(f.created_at, NOW())
FROM friends f
WHERE f.user_id_1 IS NOT NULL AND f.user_id_2 IS NOT NULL
ON CONFLICT (follower_id, following_id) DO NOTHING;
