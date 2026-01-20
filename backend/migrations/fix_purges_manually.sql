
-- 1. Create post_purges table
CREATE TABLE IF NOT EXISTS post_purges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS idx_post_purges_post_id ON post_purges(post_id);
CREATE INDEX IF NOT EXISTS idx_post_purges_user_id ON post_purges(user_id);
CREATE INDEX IF NOT EXISTS idx_post_purges_created_at ON post_purges(created_at);

-- 3. Add purge_count to posts if missing
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS purge_count INTEGER DEFAULT 0;

-- 4. Ensure profiles has ghost-related columns (using standard names)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_ghost BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ghosted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS purges_given INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS purges_received INTEGER DEFAULT 0;
