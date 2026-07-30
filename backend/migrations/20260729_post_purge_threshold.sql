-- Migration: Add is_hidden_from_feed column for post purge threshold (250)
-- Posts with 250+ purges are hidden from the public feed but remain on owner's profile

ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_hidden_from_feed BOOLEAN DEFAULT false;

-- Index for efficient feed queries (exclude hidden posts)
CREATE INDEX IF NOT EXISTS idx_posts_hidden_from_feed ON posts(is_hidden_from_feed) WHERE is_hidden_from_feed = false;

-- Retroactively hide posts that already have 250+ purges
UPDATE posts SET is_hidden_from_feed = true WHERE purge_count >= 250;
