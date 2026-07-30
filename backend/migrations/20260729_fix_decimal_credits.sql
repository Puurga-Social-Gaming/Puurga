-- Fix credit system to support decimal values (e.g., 0.20 per post)
-- The update_credit_balance function and credit_transactions.amount were INTEGER,
-- causing fractional credits like 0.20 to be truncated to 0.

-- 1. Fix the SQL function to use NUMERIC instead of INTEGER
CREATE OR REPLACE FUNCTION update_credit_balance(
  p_user_id UUID,
  p_amount NUMERIC(12,2),
  p_source TEXT,
  p_description TEXT
) RETURNS NUMERIC(12,2) AS $$
DECLARE
  v_current NUMERIC(12,2);
  v_new NUMERIC(12,2);
BEGIN
  SELECT COALESCE(purga_points, 0) INTO v_current
  FROM profiles
  WHERE id = p_user_id;

  v_new := GREATEST(0, v_current + p_amount);

  UPDATE profiles
  SET purga_points = v_new,
      updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO credit_transactions (user_id, amount, type, source, description)
  VALUES (
    p_user_id,
    p_amount,
    CASE WHEN p_amount >= 0 THEN 'earn' ELSE 'penalty' END,
    p_source,
    p_description
  );

  RETURN v_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix the RPC wrapper
CREATE OR REPLACE FUNCTION rpc_update_credit_balance(
  p_amount NUMERIC(12,2),
  p_source TEXT,
  p_description TEXT
) RETURNS NUMERIC(12,2) AS $$
BEGIN
  RETURN update_credit_balance(
    auth.uid(),
    p_amount,
    p_source,
    p_description
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix credit_transactions.amount and profiles.purga_points to NUMERIC if they're INTEGER
-- Drop view temporarily if it depends on amount column
DO $$
BEGIN
  -- Drop view if it exists (it blocks ALTER COLUMN)
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'user_credit_summary') THEN
    DROP VIEW user_credit_summary;
  END IF;

  -- Alter credit_transactions.amount
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_transactions' AND column_name = 'amount'
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE credit_transactions ALTER COLUMN amount TYPE NUMERIC(12,2);
  END IF;

  -- Alter profiles.purga_points
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'purga_points'
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN purga_points TYPE NUMERIC(12,2);
  END IF;
END $$;
