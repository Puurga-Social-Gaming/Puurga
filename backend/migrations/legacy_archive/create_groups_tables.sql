-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS group_messages CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;

-- 1. Create groups table
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  profile_image_url TEXT,
  cover_image_url TEXT,
  is_private BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credits INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create group_members table
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  muted BOOLEAN DEFAULT false,
  muted_until TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 3. Create group_messages table
CREATE TABLE group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_groups_created_at ON groups(created_at DESC);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_messages_group ON group_messages(group_id);
CREATE INDEX idx_group_messages_created_at ON group_messages(created_at DESC);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for groups
CREATE POLICY "Anyone can view public groups" ON groups
  FOR SELECT USING (is_private = false OR created_by = auth.uid());

CREATE POLICY "Members can view private groups" ON groups
  FOR SELECT USING (
    is_private = false OR 
    created_by = auth.uid() OR
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create groups" ON groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update groups" ON groups
  FOR UPDATE USING (
    id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete groups" ON groups
  FOR DELETE USING (
    id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 7. RLS Policies for group_members
CREATE POLICY "Anyone can view members of public groups" ON group_members
  FOR SELECT USING (
    group_id IN (SELECT id FROM groups WHERE is_private = false)
  );

CREATE POLICY "Members can view group members" ON group_members
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can add members" ON group_members
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    ) OR
    user_id = auth.uid()
  );

CREATE POLICY "Users can leave groups" ON group_members
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Admins can remove members" ON group_members
  FOR DELETE USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 8. RLS Policies for group_messages
CREATE POLICY "Members can view group messages" ON group_messages
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can send messages" ON group_messages
  FOR INSERT WITH CHECK (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) AND
    sender_id = auth.uid()
  );

-- 9. Create function to update group updated_at timestamp
CREATE OR REPLACE FUNCTION update_group_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE groups 
  SET updated_at = NOW() 
  WHERE id = NEW.group_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to update group timestamp on new message
CREATE TRIGGER update_group_on_message
  AFTER INSERT ON group_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_group_timestamp();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Groups tables created successfully!';
END $$;
