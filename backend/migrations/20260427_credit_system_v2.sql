-- Credit System & Inactivity Tracking Migration
-- Adds centralized credit management and inactivity penalty system

-- 1. Add new profile columns for credit system and inactivity tracking

-- Last active timestamp for inactivity tracking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;

-- Inactivity level: 0=active, 1=warned, 2=penalized, 3=restricted
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS inactivity_level INTEGER DEFAULT 0;

-- Account status for restriction enforcement
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';

-- Daily caps for anti-abuse (reset at midnight)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS daily_likes_count INTEGER DEFAULT 0;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS daily_comments_count INTEGER DEFAULT 0;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS daily_likes_reset_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS daily_comments_reset_at TIMESTAMP WITH TIME ZONE;

-- Daily login bonus tracking
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_daily_login_at TIMESTAMP WITH TIME ZONE;

-- 2. Create credit_transactions table for audit trail
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'penalty')),
  source TEXT NOT NULL CHECK (source IN ('post', 'like', 'comment', 'game', 'inactivity', 'login', 'daily_bonus', 'recovery_bonus')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_source ON credit_transactions(source);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON profiles(last_active_at);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_inactivity_level ON profiles(inactivity_level);

-- 4. Backfill existing users with default values
UPDATE profiles SET 
  last_active_at = COALESCE(last_active_at, NOW()),
  account_status = 'active',
  inactivity_level = 0
WHERE account_status IS NULL OR account_status = '';

-- 5. Add comments for documentation
COMMENT ON COLUMN profiles.last_active_at IS 'Timestamp of user last activity for inactivity tracking';
COMMENT ON COLUMN profiles.inactivity_level IS '0=active, 1=warned(5-7days), 2=penalized(7-14days), 3=restricted(14+days)';
COMMENT ON COLUMN profiles.account_status IS 'Current account status: active, warned, penalized, restricted';
COMMENT ON COLUMN profiles.daily_likes_count IS 'Daily like count, resets at midnight';
COMMENT ON COLUMN profiles.daily_comments_count IS 'Daily comment count, resets at midnight';
COMMENT ON COLUMN profiles.last_daily_login_at IS 'Last daily login for bonus tracking';
COMMENT ON TABLE credit_transactions IS 'Audit trail for all credit earnings and deductions';