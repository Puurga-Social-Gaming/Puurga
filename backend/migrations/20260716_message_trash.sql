-- Per-user message trash ("delete for me") + snapshots for "delete for everyone"
CREATE TABLE IF NOT EXISTS message_trash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content_snapshot TEXT,
  images_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at_snapshot TIMESTAMPTZ,
  scope TEXT NOT NULL CHECK (scope IN ('me', 'everyone')),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_trash_user_deleted
  ON message_trash (user_id, deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_trash_conversation
  ON message_trash (conversation_id, user_id);

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_scope TEXT;

COMMENT ON TABLE message_trash IS
  'User trash: delete-for-me hides from chat; delete-for-everyone keeps a private snapshot for the deleter.';
