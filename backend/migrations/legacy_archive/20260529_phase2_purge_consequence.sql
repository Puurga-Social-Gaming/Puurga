-- Phase 2: Purge Consequence Engine
-- Adds fields to user_survival_state and creates purge_cooldowns table

-- 1. Add new fields to user_survival_state
ALTER TABLE user_survival_state
ADD COLUMN IF NOT EXISTS visibility_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS purge_pressure INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS collapse_risk INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_purge_at TIMESTAMPTZ;

-- 2. Create purge_cooldowns table
CREATE TABLE IF NOT EXISTS purge_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  purged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_purge_cooldowns_user_id ON purge_cooldowns(user_id);
CREATE INDEX IF NOT EXISTS idx_purge_cooldowns_expires_at ON purge_cooldowns(expires_at);

-- 3. Add hourly_purge_count and daily_purge_count to profiles for rate limiting
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS hourly_purge_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hourly_purge_reset_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS daily_purge_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_purge_reset_at TIMESTAMPTZ;
