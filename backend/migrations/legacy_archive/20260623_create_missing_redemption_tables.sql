-- Create redemptions table to track full ghost mode redemptions
CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redeemer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  redeemed_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credits_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for redemptions
CREATE INDEX IF NOT EXISTS idx_redemptions_redeemer ON redemptions(redeemer_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_redeemed ON redemptions(redeemed_user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_created_at ON redemptions(created_at);

-- Add comment for documentation
COMMENT ON TABLE redemptions IS 'Tracks full redemptions of ghosted users using credits';
