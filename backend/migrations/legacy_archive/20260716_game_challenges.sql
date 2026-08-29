-- Player Challenges — scalable schema (tournaments, ranked, sessions, audit, Elo)
-- Safe to re-run: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

-- ── Seasons ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_game_seasons_one_active
  ON game_seasons ((1))
  WHERE is_active = true;

INSERT INTO game_seasons (id, name, starts_at, is_active)
VALUES ('00000000-0000-4000-8000-000000000001', 'Season 1', NOW(), true)
ON CONFLICT (id) DO NOTHING;

-- ── Live presence ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_presence (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  game_title TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_presence_heartbeat ON game_presence(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_game_presence_game ON game_presence(game_id);

-- ── Challenges (invitation / wager contract) ────────────────
CREATE TABLE IF NOT EXISTS game_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  game_title TEXT,
  stake INTEGER NOT NULL CHECK (stake > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','starting','playing','finished','declined','cancelled','expired')),
  match_type TEXT NOT NULL DEFAULT 'friendly'
    CHECK (match_type IN ('friendly','ranked','tournament')),
  tournament_id UUID,
  season_id UUID REFERENCES game_seasons(id) ON DELETE SET NULL,
  stakes_locked BOOLEAN DEFAULT false,
  challenger_score INTEGER,
  opponent_score INTEGER,
  winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reward_distributed BOOLEAN DEFAULT false,
  replay_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes'),
  CHECK (challenger_id <> opponent_id)
);

-- Upgrade path if table already existed without new columns
ALTER TABLE game_challenges ADD COLUMN IF NOT EXISTS match_type TEXT DEFAULT 'friendly';
ALTER TABLE game_challenges ADD COLUMN IF NOT EXISTS tournament_id UUID;
ALTER TABLE game_challenges ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES game_seasons(id) ON DELETE SET NULL;
ALTER TABLE game_challenges ADD COLUMN IF NOT EXISTS replay_url TEXT;

CREATE INDEX IF NOT EXISTS idx_game_challenges_challenger ON game_challenges(challenger_id, status);
CREATE INDEX IF NOT EXISTS idx_game_challenges_opponent ON game_challenges(opponent_id, status);
CREATE INDEX IF NOT EXISTS idx_game_challenges_status ON game_challenges(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_challenges_match_type ON game_challenges(match_type, status);
CREATE INDEX IF NOT EXISTS idx_game_challenges_tournament ON game_challenges(tournament_id) WHERE tournament_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_game_challenges_season ON game_challenges(season_id);

-- ── Sessions (actual play instance ≠ challenge) ───────────
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL,
  challenge_id UUID REFERENCES game_challenges(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','active','finished','cancelled','abandoned')),
  server_seed TEXT,
  client_seed TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  loser_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ended_reason TEXT
    CHECK (ended_reason IS NULL OR ended_reason IN ('victory','draw','disconnect','timeout','abandon','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_challenge ON game_sessions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status, started_at DESC);

-- ── Results (anti-cheat validation) ─────────────────────────
CREATE TABLE IF NOT EXISTS game_challenge_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL UNIQUE REFERENCES game_challenges(id) ON DELETE CASCADE,
  session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
  winner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  loser_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stake INTEGER NOT NULL,
  points_won INTEGER NOT NULL,
  points_lost INTEGER NOT NULL,
  challenger_score INTEGER,
  opponent_score INTEGER,
  duration_seconds INTEGER,
  validated BOOLEAN DEFAULT false,
  validation_source TEXT
    CHECK (validation_source IS NULL OR validation_source IN ('SERVER','AI','ADMIN','PENDING')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE game_challenge_results ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL;
ALTER TABLE game_challenge_results ADD COLUMN IF NOT EXISTS validated BOOLEAN DEFAULT false;
ALTER TABLE game_challenge_results ADD COLUMN IF NOT EXISTS validation_source TEXT;

-- ── Rankings (+ Elo + season) ───────────────────────────────
CREATE TABLE IF NOT EXISTS game_rankings (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES game_seasons(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-4000-8000-000000000001',
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  total_points_won INTEGER DEFAULT 0,
  total_points_lost INTEGER DEFAULT 0,
  biggest_win INTEGER DEFAULT 0,
  elo_rating INTEGER DEFAULT 1000,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, season_id)
);

ALTER TABLE game_rankings ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1000;
ALTER TABLE game_rankings ADD COLUMN IF NOT EXISTS season_id UUID;

CREATE INDEX IF NOT EXISTS idx_game_rankings_elo ON game_rankings(season_id, elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_game_rankings_wins ON game_rankings(season_id, wins DESC);

-- ── Match history (player perspective) ──────────────────────
CREATE TABLE IF NOT EXISTS game_match_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES game_challenges(id) ON DELETE SET NULL,
  session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  game_title TEXT,
  match_type TEXT DEFAULT 'friendly',
  result TEXT NOT NULL CHECK (result IN ('win','loss','draw')),
  stake INTEGER NOT NULL,
  points_delta INTEGER NOT NULL,
  score INTEGER,
  opponent_score INTEGER,
  duration_seconds INTEGER,
  ended_reason TEXT
    CHECK (ended_reason IS NULL OR ended_reason IN ('victory','draw','disconnect','timeout','abandon','cancelled')),
  elo_before INTEGER,
  elo_after INTEGER,
  season_id UUID REFERENCES game_seasons(id) ON DELETE SET NULL,
  played_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE game_match_history ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE game_match_history ADD COLUMN IF NOT EXISTS match_type TEXT DEFAULT 'friendly';
ALTER TABLE game_match_history ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE game_match_history ADD COLUMN IF NOT EXISTS ended_reason TEXT;
ALTER TABLE game_match_history ADD COLUMN IF NOT EXISTS elo_before INTEGER;
ALTER TABLE game_match_history ADD COLUMN IF NOT EXISTS elo_after INTEGER;
ALTER TABLE game_match_history ADD COLUMN IF NOT EXISTS season_id UUID;

CREATE INDEX IF NOT EXISTS idx_game_match_history_user ON game_match_history(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_match_history_season ON game_match_history(season_id, played_at DESC);

-- ── Gaming purge events (Survival Engine owns profile state) ─
CREATE TABLE IF NOT EXISTS game_purge_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES game_challenges(id) ON DELETE SET NULL,
  reason TEXT NOT NULL DEFAULT 'Lost all points through game challenges',
  balance_at_event INTEGER DEFAULT 0,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_purge_events_user ON game_purge_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_purge_events_unprocessed ON game_purge_events(processed) WHERE processed = false;

-- ── Audit log ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  challenge_id UUID REFERENCES game_challenges(id) ON DELETE SET NULL,
  session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  -- e.g. challenge_created | challenge_accepted | challenge_declined | challenge_cancelled
  -- | challenge_expired | reward_sent | points_transferred | player_bankrupt | suspect_activity
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_audit_logs_action ON game_audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_audit_logs_challenge ON game_audit_logs(challenge_id);
CREATE INDEX IF NOT EXISTS idx_game_audit_logs_actor ON game_audit_logs(actor_id, created_at DESC);

-- ── Gaming notifications (optional rich gaming inbox) ───────
CREATE TABLE IF NOT EXISTS game_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN (
      'challenge_received','challenge_accepted','challenge_declined',
      'victory','defeat','draw','ranking','season','suspect'
    )),
  title TEXT,
  body TEXT,
  challenge_id UUID REFERENCES game_challenges(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_notifications_user ON game_notifications(user_id, read, created_at DESC);
