-- Auto-translate: language on group messages + translations unique index
-- Safe to re-run

ALTER TABLE group_messages
  ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';

CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_language VARCHAR(5) NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS translations_source_lang_uidx
  ON translations (source_type, source_id, target_language);

CREATE INDEX IF NOT EXISTS idx_group_messages_language ON group_messages(language);
CREATE INDEX IF NOT EXISTS idx_messages_language ON messages(language);
