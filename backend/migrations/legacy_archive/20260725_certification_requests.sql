-- User certification requests (review + paid paths)
-- Status: pending | paid_pending | approved | rejected | cancelled

CREATE TABLE IF NOT EXISTS certification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  certification_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid_pending', 'approved', 'rejected', 'cancelled')),
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  admin_note TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cert_requests_user
  ON certification_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cert_requests_status
  ON certification_requests(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cert_requests_active_unique
  ON certification_requests(user_id, certification_slug)
  WHERE status IN ('pending', 'paid_pending');

COMMENT ON TABLE certification_requests IS 'User requests for Puurga certifications (admin review and/or paid)';
