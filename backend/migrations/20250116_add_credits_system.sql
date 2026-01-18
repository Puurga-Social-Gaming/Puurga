-- Add credits column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;

-- Create index for faster credit lookups
CREATE INDEX IF NOT EXISTS idx_profiles_credits ON profiles(credits);

-- Add purge_streak column to track consecutive purges for rewards
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS purge_streak INTEGER DEFAULT 0;

-- Create redemption_activities table to track ghost mode redemption progress
CREATE TABLE IF NOT EXISTS redemption_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghost_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  helper_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('game_play', 'group_chat', 'post', 'purge')),
  points_earned INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for redemption activities
CREATE INDEX IF NOT EXISTS idx_redemption_ghost_user ON redemption_activities(ghost_user_id);
CREATE INDEX IF NOT EXISTS idx_redemption_helper_user ON redemption_activities(helper_user_id);
CREATE INDEX IF NOT EXISTS idx_redemption_created_at ON redemption_activities(created_at);

-- Add comment for documentation
COMMENT ON COLUMN profiles.credits IS 'User credits earned from purges and activities. Used for redeeming ghosted users.';
COMMENT ON COLUMN profiles.purge_streak IS 'Tracks consecutive purges to award bonus credits on 5th purge';
COMMENT ON TABLE redemption_activities IS 'Tracks activities that contribute to redeeming ghosted users';
