-- Peer-to-peer block and mute relationships
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS user_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  muter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  muted_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (muter_id, muted_id),
  CHECK (muter_id <> muted_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_mutes_muter ON user_mutes(muter_id);
CREATE INDEX IF NOT EXISTS idx_user_mutes_muted ON user_mutes(muted_id);
