import sequelize from '../config/database';

/**
 * Puurga Complete Baseline Migration (V1.0)
 *
 * Initializes a brand new PostgreSQL database from zero with all 43 required tables,
 * indexes, foreign keys, constraints, triggers, functions, and auto-sync triggers between
 * `users` and `profiles`.
 */
export async function up() {
  await sequelize.query(`
    -- Enable PostgreSQL Extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- 1. USERS TABLE
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      avatar VARCHAR(500),
      bio TEXT,
      role VARCHAR(50) DEFAULT 'user',
      is_private BOOLEAN DEFAULT false,
      hide_from_suggestions BOOLEAN DEFAULT false,
      message_requests VARCHAR(50) DEFAULT 'everyone',
      show_read_receipts BOOLEAN DEFAULT true,
      show_online_status BOOLEAN DEFAULT true,
      comment_privacy VARCHAR(50) DEFAULT 'everyone',
      story_privacy VARCHAR(50) DEFAULT 'everyone',
      is_blocked BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 2. PROFILES TABLE
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      full_name VARCHAR(255),
      username VARCHAR(255),
      email VARCHAR(255),
      avatar_url VARCHAR(500),
      cover_photo VARCHAR(500),
      bio TEXT,
      location VARCHAR(255),
      website VARCHAR(255),
      occupation VARCHAR(255),
      education VARCHAR(255),
      relationship VARCHAR(255),
      role VARCHAR(50) DEFAULT 'user',
      is_private BOOLEAN DEFAULT false,
      hide_from_suggestions BOOLEAN DEFAULT false,
      message_requests VARCHAR(50) DEFAULT 'everyone',
      show_read_receipts BOOLEAN DEFAULT true,
      show_online_status BOOLEAN DEFAULT true,
      comment_privacy VARCHAR(50) DEFAULT 'everyone',
      story_privacy VARCHAR(50) DEFAULT 'everyone',
      is_blocked BOOLEAN DEFAULT false,
      purga_points NUMERIC(12,2) DEFAULT 0,
      credits NUMERIC(12,2) DEFAULT 0,
      posts_count INTEGER DEFAULT 0,
      purge_count INTEGER DEFAULT 0,
      purges_count INTEGER DEFAULT 0,
      purge_streak INTEGER DEFAULT 0,
      is_ghost BOOLEAN DEFAULT false,
      ghosted_at TIMESTAMPTZ,
      is_ghost_mode BOOLEAN DEFAULT false,
      ghost_mode_activated_at TIMESTAMPTZ,
      language VARCHAR(5) DEFAULT 'en',
      e2e_public_key TEXT,
      last_active_at TIMESTAMPTZ,
      inactivity_level INTEGER DEFAULT 0,
      account_status TEXT DEFAULT 'active',
      daily_likes_count INTEGER DEFAULT 0,
      daily_comments_count INTEGER DEFAULT 0,
      daily_likes_reset_at TIMESTAMPTZ,
      daily_comments_reset_at TIMESTAMPTZ,
      last_daily_login_at TIMESTAMPTZ,
      certification_slug VARCHAR(255),
      logo_certified BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Trigger for users -> profiles automatic synchronization
    CREATE OR REPLACE FUNCTION sync_user_to_profile()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO profiles (
        id, full_name, username, email, avatar_url, bio, role,
        is_private, hide_from_suggestions, message_requests,
        show_read_receipts, show_online_status, comment_privacy, story_privacy,
        is_blocked, created_at, updated_at
      ) VALUES (
        NEW.id, NEW.name, NEW.username, NEW.email, NEW.avatar, NEW.bio, NEW.role,
        NEW.is_private, NEW.hide_from_suggestions, NEW.message_requests,
        NEW.show_read_receipts, NEW.show_online_status, NEW.comment_privacy, NEW.story_privacy,
        NEW.is_blocked, COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW())
      )
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        avatar_url = EXCLUDED.avatar_url,
        bio = EXCLUDED.bio,
        role = EXCLUDED.role,
        is_private = EXCLUDED.is_private,
        hide_from_suggestions = EXCLUDED.hide_from_suggestions,
        message_requests = EXCLUDED.message_requests,
        show_read_receipts = EXCLUDED.show_read_receipts,
        show_online_status = EXCLUDED.show_online_status,
        comment_privacy = EXCLUDED.comment_privacy,
        story_privacy = EXCLUDED.story_privacy,
        is_blocked = EXCLUDED.is_blocked,
        updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_sync_user_to_profile ON users;
    CREATE TRIGGER trigger_sync_user_to_profile
      AFTER INSERT OR UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION sync_user_to_profile();

    -- 3. CONVERSATIONS TABLE
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255),
      is_group BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 4. POSTS TABLE
    CREATE TABLE IF NOT EXISTS posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      media_url VARCHAR(500),
      last_edited TIMESTAMPTZ,
      purge_count INTEGER DEFAULT 0,
      visibility VARCHAR(20) DEFAULT 'public',
      background_color VARCHAR(100),
      background_type VARCHAR(20) DEFAULT 'none',
      background_index INTEGER,
      language VARCHAR(5) DEFAULT 'en',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 5. COMMENTS TABLE
    CREATE TABLE IF NOT EXISTS comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_purged BOOLEAN DEFAULT false,
      language VARCHAR(5) DEFAULT 'en',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 6. LIKES TABLE
    CREATE TABLE IF NOT EXISTS likes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (post_id, user_id)
    );

    -- 7. REACTIONS TABLE
    CREATE TABLE IF NOT EXISTS reactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (post_id, user_id, type)
    );

    -- 8. FOLLOWERS TABLE
    CREATE TABLE IF NOT EXISTS followers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (follower_id, following_id)
    );

    -- 9. FRIEND REQUESTS TABLE
    CREATE TABLE IF NOT EXISTS friend_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 10. FRIENDSHIPS TABLE
    CREATE TABLE IF NOT EXISTS friendships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, friend_id)
    );

    -- 11. MESSAGES TABLE
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      read BOOLEAN DEFAULT false,
      images JSONB DEFAULT '[]'::jsonb,
      language VARCHAR(5) DEFAULT 'en',
      is_edited BOOLEAN DEFAULT false,
      edited_at TIMESTAMPTZ,
      is_deleted BOOLEAN DEFAULT false,
      deleted_at TIMESTAMPTZ,
      read_at TIMESTAMPTZ,
      is_encrypted BOOLEAN DEFAULT false,
      ciphertext TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE OR REPLACE FUNCTION sync_message_sender()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.sender_id IS NOT NULL AND NEW.from_user_id IS NULL THEN
        NEW.from_user_id := NEW.sender_id;
      ELSIF NEW.from_user_id IS NOT NULL AND NEW.sender_id IS NULL THEN
        NEW.sender_id := NEW.from_user_id;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_sync_message_sender ON messages;
    CREATE TRIGGER trigger_sync_message_sender
      BEFORE INSERT OR UPDATE ON messages
      FOR EACH ROW
      EXECUTE FUNCTION sync_message_sender();

    -- 12. CONVERSATION PARTICIPANTS TABLE
    CREATE TABLE IF NOT EXISTS conversation_participants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (conversation_id, user_id)
    );

    -- 13. SHARES TABLE
    CREATE TABLE IF NOT EXISTS shares (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 14. GROUPS TABLE
    CREATE TABLE IF NOT EXISTS groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      profile_image_url TEXT,
      cover_image_url TEXT,
      is_private BOOLEAN DEFAULT false,
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credits INTEGER DEFAULT 0,
      invite_code TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 15. NOTIFICATIONS TABLE
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      content TEXT,
      title TEXT,
      message TEXT,
      read BOOLEAN DEFAULT false,
      is_read BOOLEAN DEFAULT false,
      post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
      comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
      share_id UUID REFERENCES shares(id) ON DELETE SET NULL,
      group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
      game_id TEXT,
      friend_request_id UUID,
      reaction_type VARCHAR(50),
      language VARCHAR(5) DEFAULT 'en',
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE OR REPLACE FUNCTION sync_notification_users()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.receiver_id IS NOT NULL AND NEW.user_id IS NULL THEN
        NEW.user_id := NEW.receiver_id;
      ELSIF NEW.user_id IS NOT NULL AND NEW.receiver_id IS NULL THEN
        NEW.receiver_id := NEW.user_id;
      END IF;

      IF NEW.sender_id IS NOT NULL AND NEW.from_user_id IS NULL THEN
        NEW.from_user_id := NEW.sender_id;
      ELSIF NEW.from_user_id IS NOT NULL AND NEW.sender_id IS NULL THEN
        NEW.sender_id := NEW.from_user_id;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_sync_notification_users ON notifications;
    CREATE TRIGGER trigger_sync_notification_users
      BEFORE INSERT OR UPDATE ON notifications
      FOR EACH ROW
      EXECUTE FUNCTION sync_notification_users();

    -- 16. STATUSES TABLE
    CREATE TABLE IF NOT EXISTS statuses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT,
      media_url VARCHAR(500),
      type VARCHAR(20) NOT NULL DEFAULT 'text',
      gradient_index INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 17. STORY VIEWS TABLE
    CREATE TABLE IF NOT EXISTS story_views (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
      viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (status_id, viewer_id)
    );

    -- 18. POST PURGES TABLE
    CREATE TABLE IF NOT EXISTS post_purges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (post_id, user_id)
    );

    -- Trigger to update purge count on posts
    CREATE OR REPLACE FUNCTION update_post_purge_count()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE posts 
        SET purge_count = (SELECT COUNT(*) FROM post_purges WHERE post_id = NEW.post_id)
        WHERE id = NEW.post_id;
        RETURN NEW;
      ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts 
        SET purge_count = (SELECT COUNT(*) FROM post_purges WHERE post_id = OLD.post_id)
        WHERE id = OLD.post_id;
        RETURN OLD;
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_update_post_purge_count ON post_purges;
    CREATE TRIGGER trigger_update_post_purge_count
      AFTER INSERT OR DELETE ON post_purges
      FOR EACH ROW
      EXECUTE FUNCTION update_post_purge_count();

    -- 19. USER SURVIVAL STATE TABLE
    CREATE TABLE IF NOT EXISTS user_survival_state (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      visibility_score INTEGER DEFAULT 100,
      reputation_score INTEGER DEFAULT 100,
      survival_score INTEGER DEFAULT 100,
      threat_level INTEGER DEFAULT 0,
      tier VARCHAR(50) DEFAULT 'STABLE',
      ghost_mode BOOLEAN DEFAULT false,
      ghost_status BOOLEAN DEFAULT false,
      purge_count INTEGER DEFAULT 0,
      survived_purges INTEGER DEFAULT 0,
      redemption_count INTEGER DEFAULT 0,
      inactivity_level INTEGER DEFAULT 0,
      warning_level INTEGER DEFAULT 0,
      social_rank TEXT DEFAULT 'UNKNOWN',
      current_survival_state TEXT DEFAULT 'SAFE',
      last_active_at TIMESTAMPTZ,
      last_state_change_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Trigger for updated_at on user_survival_state
    CREATE OR REPLACE FUNCTION update_survival_state_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_survival_state_updated_at ON user_survival_state;
    CREATE TRIGGER trigger_survival_state_updated_at
      BEFORE UPDATE ON user_survival_state
      FOR EACH ROW
      EXECUTE FUNCTION update_survival_state_updated_at();

    -- Auto-create survival_state row for new users/profiles
    CREATE OR REPLACE FUNCTION create_initial_survival_state()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO user_survival_state (user_id, current_survival_state)
      VALUES (NEW.id, 'SAFE')
      ON CONFLICT (user_id) DO NOTHING;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_create_survival_state ON profiles;
    CREATE TRIGGER trigger_create_survival_state
      AFTER INSERT ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION create_initial_survival_state();

    -- 20. SURVIVAL EVENTS TABLE
    CREATE TABLE IF NOT EXISTS survival_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      event_value INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 21. SURVIVAL HISTORY TABLE
    CREATE TABLE IF NOT EXISTS survival_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reputation_score INTEGER NOT NULL,
      survival_score INTEGER NOT NULL,
      threat_level INTEGER NOT NULL,
      purge_count INTEGER NOT NULL,
      survival_state TEXT NOT NULL,
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 22. GLOBAL SETTINGS TABLE
    CREATE TABLE IF NOT EXISTS global_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 23. USER SETTINGS TABLE
    CREATE TABLE IF NOT EXISTS user_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 24. CREDIT TRANSACTIONS TABLE
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC(12,2) NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('earn', 'penalty')),
      source TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Credit update SQL function
    CREATE OR REPLACE FUNCTION update_credit_balance(
      p_user_id UUID,
      p_amount NUMERIC(12,2),
      p_source TEXT,
      p_description TEXT
    ) RETURNS NUMERIC(12,2) AS $$
    DECLARE
      v_current NUMERIC(12,2);
      v_new NUMERIC(12,2);
    BEGIN
      SELECT COALESCE(purga_points, 0) INTO v_current
      FROM profiles
      WHERE id = p_user_id;

      v_new := GREATEST(0, v_current + p_amount);

      UPDATE profiles
      SET purga_points = v_new,
          updated_at = NOW()
      WHERE id = p_user_id;

      INSERT INTO credit_transactions (user_id, amount, type, source, description)
      VALUES (
        p_user_id,
        p_amount,
        CASE WHEN p_amount >= 0 THEN 'earn' ELSE 'penalty' END,
        p_source,
        p_description
      );

      RETURN v_new;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- 25. REDEMPTION ACTIVITIES TABLE
    CREATE TABLE IF NOT EXISTS redemption_activities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ghost_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      helper_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('game_play', 'group_chat', 'post', 'purge')),
      points_earned INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 26. GROUP MEMBERS TABLE
    CREATE TABLE IF NOT EXISTS group_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
      muted BOOLEAN DEFAULT false,
      muted_until TIMESTAMPTZ,
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (group_id, user_id)
    );

    -- 27. GROUP MESSAGES TABLE
    CREATE TABLE IF NOT EXISTS group_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT,
      images JSONB DEFAULT '[]'::jsonb,
      language VARCHAR(5) DEFAULT 'en',
      is_edited BOOLEAN DEFAULT false,
      edited_at TIMESTAMPTZ,
      is_deleted BOOLEAN DEFAULT false,
      deleted_at TIMESTAMPTZ,
      is_encrypted BOOLEAN DEFAULT false,
      ciphertext TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 28. GROUP MESSAGE REACTIONS TABLE
    CREATE TABLE IF NOT EXISTS group_message_reactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (message_id, user_id, emoji)
    );

    -- 29. MESSAGE TRASH TABLE
    CREATE TABLE IF NOT EXISTS message_trash (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      content_snapshot TEXT,
      images_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at_snapshot TIMESTAMPTZ,
      scope TEXT NOT NULL CHECK (scope IN ('me', 'everyone')),
      deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (message_id, user_id)
    );

    -- 30. MESSAGE REACTIONS TABLE
    CREATE TABLE IF NOT EXISTS message_reactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (message_id, user_id, emoji)
    );

    -- 31. USER BLOCKS TABLE
    CREATE TABLE IF NOT EXISTS user_blocks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (blocker_id, blocked_id),
      CHECK (blocker_id <> blocked_id)
    );

    -- 32. USER MUTES TABLE
    CREATE TABLE IF NOT EXISTS user_mutes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      muter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      muted_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (muter_id, muted_id),
      CHECK (muter_id <> muted_id)
    );

    -- 33. TRANSLATIONS TABLE
    CREATE TABLE IF NOT EXISTS translations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_type VARCHAR(20) NOT NULL,
      source_id UUID NOT NULL,
      target_language VARCHAR(5) NOT NULL,
      translated_text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT translations_unique_constraint UNIQUE (source_type, source_id, target_language)
    );

    -- 34. USER CRYPTO KEYS TABLE
    CREATE TABLE IF NOT EXISTS user_crypto_keys (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      public_key TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 35. PUSH SUBSCRIPTIONS TABLE
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, endpoint)
    );

    -- 36. SUPERADMIN AUDIT LOGS TABLE
    CREATE TABLE IF NOT EXISTS superadmin_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      superadmin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action VARCHAR(255) NOT NULL,
      target_id UUID,
      target_type VARCHAR(50),
      details JSONB DEFAULT '{}'::jsonb,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 37. SYSTEM ERROR LOGS TABLE
    CREATE TABLE IF NOT EXISTS system_error_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      level VARCHAR(20) NOT NULL,
      message TEXT NOT NULL,
      stack_trace TEXT,
      route VARCHAR(255),
      user_id UUID,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 38. CREDIT TRANSFERS TABLE
    CREATE TABLE IF NOT EXISTS credit_transfers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC(12,2) NOT NULL,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 39. CREDIT PACKAGES TABLE
    CREATE TABLE IF NOT EXISTS credit_packages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      cost NUMERIC(12,2) NOT NULL,
      reward_label TEXT,
      active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 40. CERTIFICATIONS TABLE
    CREATE TABLE IF NOT EXISTS certifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      price NUMERIC(12,2) NOT NULL,
      description TEXT
    );

    -- 41. USER CERTIFICATIONS TABLE
    CREATE TABLE IF NOT EXISTS user_certifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      certification_slug TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 42. ANALYTICS EVENTS TABLE
    CREATE TABLE IF NOT EXISTS analytics_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 43. GAME CHALLENGES TABLE
    CREATE TABLE IF NOT EXISTS game_challenges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      challenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      opponent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      game_id TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      challenger_score INTEGER DEFAULT 0,
      opponent_score INTEGER DEFAULT 0,
      winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- PERFORMANCE INDEXES
    CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
    CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
    CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
    CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
    CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
    CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_receiver_id ON notifications(receiver_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON notifications(sender_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_conversation_id ON notifications(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv ON conversation_participants(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_profiles_credits ON profiles(credits);
    CREATE INDEX IF NOT EXISTS idx_profiles_purga_points ON profiles(purga_points);
  `);
}

export async function down() {
  await sequelize.query(`
    DROP TABLE IF EXISTS game_challenges CASCADE;
    DROP TABLE IF EXISTS analytics_events CASCADE;
    DROP TABLE IF EXISTS user_certifications CASCADE;
    DROP TABLE IF EXISTS certifications CASCADE;
    DROP TABLE IF EXISTS credit_packages CASCADE;
    DROP TABLE IF EXISTS credit_transfers CASCADE;
    DROP TABLE IF EXISTS system_error_logs CASCADE;
    DROP TABLE IF EXISTS superadmin_audit_logs CASCADE;
    DROP TABLE IF EXISTS push_subscriptions CASCADE;
    DROP TABLE IF EXISTS user_crypto_keys CASCADE;
    DROP TABLE IF EXISTS translations CASCADE;
    DROP TABLE IF EXISTS user_mutes CASCADE;
    DROP TABLE IF EXISTS user_blocks CASCADE;
    DROP TABLE IF EXISTS message_reactions CASCADE;
    DROP TABLE IF EXISTS message_trash CASCADE;
    DROP TABLE IF EXISTS group_message_reactions CASCADE;
    DROP TABLE IF EXISTS group_messages CASCADE;
    DROP TABLE IF EXISTS group_members CASCADE;
    DROP TABLE IF EXISTS redemption_activities CASCADE;
    DROP TABLE IF EXISTS credit_transactions CASCADE;
    DROP TABLE IF EXISTS user_settings CASCADE;
    DROP TABLE IF EXISTS global_settings CASCADE;
    DROP TABLE IF EXISTS survival_history CASCADE;
    DROP TABLE IF EXISTS survival_events CASCADE;
    DROP TABLE IF EXISTS user_survival_state CASCADE;
    DROP TABLE IF EXISTS post_purges CASCADE;
    DROP TABLE IF EXISTS story_views CASCADE;
    DROP TABLE IF EXISTS statuses CASCADE;
    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS groups CASCADE;
    DROP TABLE IF EXISTS shares CASCADE;
    DROP TABLE IF EXISTS conversation_participants CASCADE;
    DROP TABLE IF EXISTS messages CASCADE;
    DROP TABLE IF EXISTS friendships CASCADE;
    DROP TABLE IF EXISTS friend_requests CASCADE;
    DROP TABLE IF EXISTS followers CASCADE;
    DROP TABLE IF EXISTS reactions CASCADE;
    DROP TABLE IF EXISTS likes CASCADE;
    DROP TABLE IF EXISTS comments CASCADE;
    DROP TABLE IF EXISTS posts CASCADE;
    DROP TABLE IF EXISTS conversations CASCADE;
    DROP TABLE IF EXISTS profiles CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);
}
