-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Modify users table
ALTER TABLE users
  ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
  ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4()),
  ALTER COLUMN id SET NOT NULL;

-- Add any missing columns with proper defaults
DO $$ 
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_private') THEN
    ALTER TABLE users ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'hide_from_suggestions') THEN
    ALTER TABLE users ADD COLUMN hide_from_suggestions BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'message_requests') THEN
    ALTER TABLE users ADD COLUMN message_requests VARCHAR(255) NOT NULL DEFAULT 'everyone';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'show_read_receipts') THEN
    ALTER TABLE users ADD COLUMN show_read_receipts BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'show_online_status') THEN
    ALTER TABLE users ADD COLUMN show_online_status BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'comment_privacy') THEN
    ALTER TABLE users ADD COLUMN comment_privacy VARCHAR(255) NOT NULL DEFAULT 'everyone';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'story_privacy') THEN
    ALTER TABLE users ADD COLUMN story_privacy VARCHAR(255) NOT NULL DEFAULT 'everyone';
  END IF;
END $$;

-- Create ENUM types if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_requests_enum') THEN
        CREATE TYPE message_requests_enum AS ENUM ('everyone', 'followers', 'none');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'privacy_enum') THEN
        CREATE TYPE privacy_enum AS ENUM ('everyone', 'followers', 'none');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'story_privacy_enum') THEN
        CREATE TYPE story_privacy_enum AS ENUM ('everyone', 'followers', 'close_friends');
    END IF;
END $$; 