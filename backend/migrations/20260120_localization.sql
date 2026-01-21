-- Add language column to profiles table (mapped to users in application)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en';

-- Add language column to content tables
-- Note: Check if these tables exist in your schema. Usually they are: posts, comments, messages, notifications.

DO $$
BEGIN
    -- Posts
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'posts') THEN
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en';
    END IF;

    -- Comments
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'comments') THEN
        ALTER TABLE comments ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en';
    END IF;

    -- Messages
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'messages') THEN
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en';
    END IF;

    -- Notifications
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en';
    END IF;
END $$;

-- Create translations table
CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(20) NOT NULL, -- post, comment, message, notification
  source_id UUID NOT NULL,
  target_language VARCHAR(5) NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add unique constraint to prevent duplicate translations
  CONSTRAINT translations_unique_constraint UNIQUE (source_type, source_id, target_language)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS translations_lookup_idx ON translations (source_type, source_id, target_language);
