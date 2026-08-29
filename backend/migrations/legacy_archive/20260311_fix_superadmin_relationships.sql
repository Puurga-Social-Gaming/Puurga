-- Fix missing foreign key relationships for Supabase join discovery
-- This ensures the Super Admin dashboard can fetch statistics via joins

-- 1. Ensure 'posts' table has a foreign key to 'profiles'
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_posts_profiles'
    ) THEN
        -- Check if user_id column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'user_id') THEN
            ALTER TABLE posts 
            ADD CONSTRAINT fk_posts_profiles 
            FOREIGN KEY (user_id) 
            REFERENCES profiles(id) 
            ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 2. Ensure 'post_purges' table has foreign keys
DO $$ 
BEGIN
    -- user_id (the purger)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_post_purges_profiles_user'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'post_purges' AND column_name = 'user_id') THEN
            ALTER TABLE post_purges 
            ADD CONSTRAINT fk_post_purges_profiles_user
            FOREIGN KEY (user_id) 
            REFERENCES profiles(id) 
            ON DELETE CASCADE;
        END IF;
    END IF;

    -- post_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_post_purges_posts'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'post_purges' AND column_name = 'post_id') THEN
            ALTER TABLE post_purges 
            ADD CONSTRAINT fk_post_purges_posts
            FOREIGN KEY (post_id) 
            REFERENCES posts(id) 
            ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 3. Add any missing columns to profiles for caching if needed
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS purges_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;

-- 4. Create an alias/view for Supabase if relationships are complex
-- (Optional, but sometimes Supabase needs a reload to see new FKs)
