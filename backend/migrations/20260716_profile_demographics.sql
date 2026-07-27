-- Demographics for Super Admin analytics
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender) WHERE gender IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country) WHERE country IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_language ON profiles(language) WHERE language IS NOT NULL;
