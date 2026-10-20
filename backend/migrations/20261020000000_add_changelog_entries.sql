-- Changelog entries: every app change/fix posted by the owner becomes a row here
-- and is fanned out as a 'changelog' notification to every user.
-- The notification stays in the user's notification list until they click it.

CREATE TABLE IF NOT EXISTS changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind VARCHAR(20) NOT NULL DEFAULT 'changed',
  version VARCHAR(50),
  title VARCHAR(200) NOT NULL,
  message TEXT,
  route VARCHAR(255),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_changelog_entries_created_at ON changelog_entries (created_at DESC);
