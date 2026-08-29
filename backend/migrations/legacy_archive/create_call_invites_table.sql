-- Create call_invites table for managing video/audio call invitations
CREATE TABLE IF NOT EXISTS call_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
  room_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'missed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for efficient querying
CREATE INDEX idx_call_invites_callee ON call_invites(callee_id) WHERE status = 'pending';
CREATE INDEX idx_call_invites_caller ON call_invites(caller_id);
CREATE INDEX idx_call_invites_conversation ON call_invites(conversation_id);
CREATE INDEX idx_call_invites_status ON call_invites(status);
CREATE INDEX idx_call_invites_created_at ON call_invites(created_at DESC);

-- Enable RLS
ALTER TABLE call_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their call invites (as caller or callee)" ON call_invites
  FOR SELECT USING (
    caller_id = auth.uid() OR callee_id = auth.uid()
  );

CREATE POLICY "Users can create call invites" ON call_invites
  FOR INSERT WITH CHECK (
    caller_id = auth.uid()
  );

CREATE POLICY "Users can update their call invites (accept/decline)" ON call_invites
  FOR UPDATE USING (
    callee_id = auth.uid() OR caller_id = auth.uid()
  );

-- Trigger to update timestamp
CREATE OR REPLACE FUNCTION update_call_invite_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_call_invite_on_change
  BEFORE UPDATE ON call_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_call_invite_timestamp();

-- Enable realtime for call_invites
ALTER PUBLICATION supabase_realtime ADD TABLE call_invites;
