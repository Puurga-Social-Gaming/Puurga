-- P2P credit transfers + in-app packages (no Stripe)
CREATE TABLE IF NOT EXISTS credit_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (from_user_id <> to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_credit_transfers_from ON credit_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transfers_to ON credit_transfers(to_user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transfers_created ON credit_transfers(created_at DESC);

CREATE TABLE IF NOT EXISTS credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cost INTEGER NOT NULL CHECK (cost > 0),
  reward_label TEXT,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO credit_packages (slug, title, description, cost, reward_label, sort_order)
VALUES
  ('boost_streak', 'Streak Shield', 'Spend points to protect your purge streak for 24h (cosmetic unlock).', 50, '24h streak badge', 1),
  ('profile_flare', 'Profile Flare', 'Highlight your profile in suggestions for a day.', 100, 'Profile highlight', 2),
  ('arena_pass', 'Arena Pass', 'Unlock a featured game banner placement.', 200, 'Featured game slot', 3)
ON CONFLICT (slug) DO NOTHING;

-- Allow transfer source on credit_transactions if constrained
DO $$
BEGIN
  ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_source_check;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

ALTER TABLE credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_source_check;

-- Soften source to text (already TEXT in many envs); no-op if already free
COMMENT ON TABLE credit_transfers IS 'P2P Purga Points transfers between users';
