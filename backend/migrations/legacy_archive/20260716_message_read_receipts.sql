-- Unread counts + read receipts (WhatsApp-style)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Historical messages: treat as already read so the inbox isn't flooded
UPDATE messages
SET read = true,
    read_at = COALESCE(read_at, created_at)
WHERE read IS NOT TRUE;

CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages (conversation_id, from_user_id)
  WHERE read = false;
