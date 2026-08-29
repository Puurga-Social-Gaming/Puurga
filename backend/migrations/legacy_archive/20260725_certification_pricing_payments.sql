-- Configurable certification money + points prices (Super Admin)
-- Money checkout: Visa / Mobile Money RDC (Airtel, M-Pesa, Orange, Africell)

CREATE TABLE IF NOT EXISTS certification_pricing (
  slug TEXT PRIMARY KEY,
  price_points INTEGER NOT NULL DEFAULT 0,
  price_cdf INTEGER NOT NULL DEFAULT 0,
  price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

INSERT INTO certification_pricing (slug, price_points, price_cdf, price_usd) VALUES
  ('blue', 500, 5000, 2.00),
  ('gold', 1500, 15000, 6.00),
  ('business', 2500, 25000, 10.00),
  ('elite', 4000, 40000, 15.00),
  ('official', 0, 0, 0.00)
ON CONFLICT (slug) DO NOTHING;

-- Official is loyalty-only: force free even if an older seed had prices
UPDATE certification_pricing
SET price_points = 0, price_cdf = 0, price_usd = 0, updated_at = NOW()
WHERE slug = 'official';

-- Extend certification_requests for money payments
ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'points';
  -- points | visa | mobile_money | review

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS payment_network TEXT DEFAULT NULL;
  -- airtel | vodacom | orange | africell (mobile money RDC)

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS payment_phone TEXT DEFAULT NULL;

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS amount_cdf INTEGER NOT NULL DEFAULT 0;

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CDF';

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS cardholder_name TEXT DEFAULT NULL;

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS card_last4 TEXT DEFAULT NULL;

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS card_brand TEXT DEFAULT NULL;

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS payment_reference TEXT DEFAULT NULL;

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT NULL;
  -- submitted | confirmed | failed | refunded

-- Allow payment_pending in status check: drop & recreate if needed is risky;
-- app treats payment_pending as active open request.

DO $$
BEGIN
  ALTER TABLE certification_requests DROP CONSTRAINT IF EXISTS certification_requests_status_check;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

ALTER TABLE certification_requests
  DROP CONSTRAINT IF EXISTS certification_requests_status_check;

ALTER TABLE certification_requests
  ADD CONSTRAINT certification_requests_status_check
  CHECK (status IN ('pending', 'paid_pending', 'payment_pending', 'approved', 'rejected', 'cancelled'));

COMMENT ON TABLE certification_pricing IS 'Super Admin configurable certification prices (points + money)';
COMMENT ON COLUMN certification_requests.payment_method IS 'points | visa | mobile_money | review';
COMMENT ON COLUMN certification_requests.payment_network IS 'RDC MM: airtel | vodacom | orange | africell';
