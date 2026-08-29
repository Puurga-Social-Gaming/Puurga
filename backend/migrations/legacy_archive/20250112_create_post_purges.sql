-- Create post_purges table to track which users have purged which posts
CREATE TABLE IF NOT EXISTS post_purges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_purges_post_id ON post_purges(post_id);
CREATE INDEX IF NOT EXISTS idx_post_purges_user_id ON post_purges(user_id);
CREATE INDEX IF NOT EXISTS idx_post_purges_created_at ON post_purges(created_at);

-- Add ghost mode columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_ghost_mode BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ghost_mode_activated_at TIMESTAMP WITH TIME ZONE;

-- Add purge count columns to posts table for caching
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS purge_count INTEGER DEFAULT 0;

-- Create function to update purge count
CREATE OR REPLACE FUNCTION update_post_purge_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET purge_count = (
      SELECT COUNT(*) 
      FROM post_purges 
      WHERE post_id = NEW.post_id
    )
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET purge_count = (
      SELECT COUNT(*) 
      FROM post_purges 
      WHERE post_id = OLD.post_id
    )
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update purge count
DROP TRIGGER IF EXISTS trigger_update_post_purge_count ON post_purges;
CREATE TRIGGER trigger_update_post_purge_count
  AFTER INSERT OR DELETE ON post_purges
  FOR EACH ROW
  EXECUTE FUNCTION update_post_purge_count();
