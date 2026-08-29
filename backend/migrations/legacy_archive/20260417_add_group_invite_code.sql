-- Add invite_code column to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS invite_code VARCHAR(20) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(invite_code);

-- Update RLS policy to allow reading invite_code for members
-- (Public read is fine since it's a shareable link)