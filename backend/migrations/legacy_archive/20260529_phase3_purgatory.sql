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
