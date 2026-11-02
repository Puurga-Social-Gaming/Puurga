-- Reports: users flag posts, comments, messages, or profiles for review.
-- Open reports are unique per (reporter, target) so nobody spams duplicates.

CREATE TABLE IF NOT EXISTS reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL,
  target_type   TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'message', 'user')),
  target_id     UUID NOT NULL,
  reason        TEXT NOT NULL,
  details       TEXT,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolved_by   UUID,
  resolution_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reports_open_idx ON reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_target_idx ON reports (target_type, target_id);

CREATE UNIQUE INDEX IF NOT EXISTS reports_unique_open
  ON reports (reporter_id, target_type, target_id)
  WHERE status = 'open';
