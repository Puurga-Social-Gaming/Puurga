-- Migration: Fix statuses table for Stories feature
-- Run this in Supabase SQL Editor

-- 1. Create statuses table if it doesn't exist
CREATE TABLE IF NOT EXISTS statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  type TEXT DEFAULT 'text',
  gradient_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  view_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_statuses_user_id ON statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_statuses_expires_at ON statuses(expires_at);
CREATE INDEX IF NOT EXISTS idx_statuses_created_at ON statuses(created_at);

-- 3. Create story_views table for tracking who viewed stories
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES statuses(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

-- 4. Create stories storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, file_extensions)
VALUES ('stories', 'stories', true, 10485760, 'jpg,jpeg,png,gif,webp')
ON CONFLICT (id) DO NOTHING;

-- 5. Enable RLS
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- 6. Create policies for authenticated users
DROP POLICY IF EXISTS "Users can view statuses" ON statuses;
CREATE POLICY "Users can view statuses" ON statuses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own statuses" ON statuses;
CREATE POLICY "Users can insert own statuses" ON statuses FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own statuses" ON statuses;
CREATE POLICY "Users can delete own statuses" ON statuses FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view story_views" ON story_views;
CREATE POLICY "Users can view story_views" ON story_views FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert story_views" ON story_views;  
CREATE POLICY "Users can insert story_views" ON story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- 7. Check if data exists
SELECT COUNT(*) as status_count FROM statuses;