-- Story views tracking table
-- Tracks who viewed which story for WhatsApp-style viewer list

CREATE TABLE IF NOT EXISTS story_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, viewer_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON story_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_story_views_created_at ON story_views(created_at);

-- Enable Row Level Security
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for story_views
DROP POLICY IF EXISTS "Users can view their own story views" ON story_views;
DROP POLICY IF EXISTS "Users can insert their own views" ON story_views;

CREATE POLICY "Users can view their own story views" ON story_views
    FOR SELECT USING (
        viewer_id = auth.uid()
        OR story_id IN (
            SELECT id FROM statuses WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own views" ON story_views
    FOR INSERT WITH CHECK (viewer_id = auth.uid());

-- Add view_count to statuses table (denormalized for performance)
ALTER TABLE statuses ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Enable RLS on statuses if not already enabled
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for statuses to include story_privacy filtering
DROP POLICY IF EXISTS "Users can view all active statuses" ON statuses;

CREATE POLICY "Users can view active statuses based on privacy" ON statuses
    FOR SELECT USING (expires_at > NOW());