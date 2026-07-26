-- Survival System Schema (combined)
-- Apply once in Supabase Dashboard → SQL Editor → Run
-- Fixes: GET /api/survival/state 404 when user_survival_state is missing
--
-- Source migrations:
--   20260529_create_survival_system.sql
--   20260529_phase2_purge_consequence.sql
--   20260529_phase3_purgatory.sql

-- Survival System Migration
-- Creates the foundational survival-state and reputation system for Puurga

-- 1. user_survival_state table: tracks live survival state for each user
CREATE TABLE IF NOT EXISTS user_survival_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reputation_score INTEGER DEFAULT 100,
  survival_score INTEGER DEFAULT 100,
  threat_level INTEGER DEFAULT 0,
  purge_count INTEGER DEFAULT 0,
  survived_purges INTEGER DEFAULT 0,
  redemption_count INTEGER DEFAULT 0,
  ghost_status BOOLEAN DEFAULT FALSE,
  inactivity_level INTEGER DEFAULT 0,
  warning_level INTEGER DEFAULT 0,
  social_rank TEXT DEFAULT 'UNKNOWN',
  current_survival_state TEXT DEFAULT 'SAFE',
  last_active_at TIMESTAMP WITH TIME ZONE,
  last_state_change_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. survival_events table: audit trail of all survival-related actions
CREATE TABLE IF NOT EXISTS survival_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_value INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. survival_history table: snapshots for graphs and analytics
CREATE TABLE IF NOT EXISTS survival_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reputation_score INTEGER NOT NULL,
  survival_score INTEGER NOT NULL,
  threat_level INTEGER NOT NULL,
  purge_count INTEGER NOT NULL,
  survival_state TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_survival_state_user_id ON user_survival_state(user_id);
CREATE INDEX IF NOT EXISTS idx_survival_state_current_state ON user_survival_state(current_survival_state);
CREATE INDEX IF NOT EXISTS idx_survival_state_social_rank ON user_survival_state(social_rank);

CREATE INDEX IF NOT EXISTS idx_survival_events_user_id ON survival_events(user_id);
CREATE INDEX IF NOT EXISTS idx_survival_events_event_type ON survival_events(event_type);
CREATE INDEX IF NOT EXISTS idx_survival_events_created_at ON survival_events(created_at);
CREATE INDEX IF NOT EXISTS idx_survival_events_user_event ON survival_events(user_id, event_type);

CREATE INDEX IF NOT EXISTS idx_survival_history_user_id ON survival_history(user_id);
CREATE INDEX IF NOT EXISTS idx_survival_history_recorded_at ON survival_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_survival_history_user_records ON survival_history(user_id, recorded_at DESC);

-- Trigger to auto-update updated_at on user_survival_state
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

-- Auto-create survival_state row for new profiles
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

-- Backfill existing profiles that don't have survival state yet
INSERT INTO user_survival_state (user_id, current_survival_state, reputation_score, survival_score)
SELECT id, 'SAFE', 100, 100
FROM profiles
WHERE id NOT IN (SELECT user_id FROM user_survival_state)
ON CONFLICT (user_id) DO NOTHING;
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
-- Phase 3: Purgatory & Social Redemption System

-- 1. Add purgatory fields to user_survival_state
ALTER TABLE user_survival_state
ADD COLUMN IF NOT EXISTS purgatory_status BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS purgatory_entered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS redemption_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS redemption_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS redemption_request_at TIMESTAMPTZ;

-- 2. Create redemption_requests table
CREATE TABLE IF NOT EXISTS redemption_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')),
  progress_at_request INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redemption_requests_user_id ON redemption_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_status ON redemption_requests(status);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_supporter_id ON redemption_requests(supporter_id);

-- 3. Add login_streak to profiles for redemption progress tracking
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS login_streak INTEGER DEFAULT 0;
