-- Add visibility, background_color, and background_type columns to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'public';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS background_color VARCHAR(100);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS background_type VARCHAR(20) NOT NULL DEFAULT 'none';

-- Add index on visibility for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
