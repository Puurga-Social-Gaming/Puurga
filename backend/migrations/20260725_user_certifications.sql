-- User certifications (X-style badges + Puurga logo badge)
-- premium_cert: colored check (blue|gold|business|elite)
-- logo_certified: Puurga logo next to name (can stack with a check)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS certification_slug TEXT DEFAULT NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS logo_certified BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS certified_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS certified_by UUID DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_certification_slug
  ON profiles(certification_slug)
  WHERE certification_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_logo_certified
  ON profiles(logo_certified)
  WHERE logo_certified = TRUE;

COMMENT ON COLUMN profiles.certification_slug IS 'Premium check badge: blue|gold|business|elite';
COMMENT ON COLUMN profiles.logo_certified IS 'Puurga official logo badge next to display name';
