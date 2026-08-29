-- Phase 4: Alliance System
-- Creates alliance relationships and support tracking tables

-- ============================================================
-- Table: user_alliances
-- Tracks mutual survival bonds between users
-- ============================================================
CREATE TABLE IF NOT EXISTS user_alliances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alliance_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (alliance_status IN ('PENDING', 'ACTIVE', 'BROKEN', 'BETRAYED')),
  loyalty_score INTEGER NOT NULL DEFAULT 100 CHECK (loyalty_score >= 0 AND loyalty_score <= 100),
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, target_id)
);

-- Index for looking up user's alliances
CREATE INDEX IF NOT EXISTS idx_user_alliances_requester ON user_alliances(requester_id);
CREATE INDEX IF NOT EXISTS idx_user_alliances_target ON user_alliances(target_id);
CREATE INDEX IF NOT EXISTS idx_user_alliances_status ON user_alliances(alliance_status);

-- ============================================================
-- Table: alliance_support_actions
-- Tracks redemption support actions between allies
-- ============================================================
CREATE TABLE IF NOT EXISTS alliance_support_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alliance_id UUID NOT NULL REFERENCES user_alliances(id) ON DELETE CASCADE,
  supporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  support_type TEXT NOT NULL CHECK (support_type IN ('ENDORSEMENT', 'REPUTATION_SACRIFICE', 'VISIBILITY_SACRIFICE')),
  support_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for looking up support actions
CREATE INDEX IF NOT EXISTS idx_alliance_support_alliance ON alliance_support_actions(alliance_id);
CREATE INDEX IF NOT EXISTS idx_alliance_support_supporter ON alliance_support_actions(supporter_id);
CREATE INDEX IF NOT EXISTS idx_alliance_support_type ON alliance_support_actions(support_type);

-- ============================================================
-- Table: alliance_cooldowns
-- Tracks cooldown periods for alliance operations
-- ============================================================
CREATE TABLE IF NOT EXISTS alliance_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cooldown_type TEXT NOT NULL CHECK (cooldown_type IN ('CREATE', 'BREAK', 'SUPPORT')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alliance_cooldowns_user ON alliance_cooldowns(user_id);
CREATE INDEX IF NOT EXISTS idx_alliance_cooldowns_expires ON alliance_cooldowns(expires_at);

-- Add alliance_count to user_survival_state for quick reference
ALTER TABLE user_survival_state ADD COLUMN IF NOT EXISTS alliance_count INTEGER DEFAULT 0;
