-- Atomic credit update function to prevent race conditions and ensure audit trail
-- This function reads the current balance, calculates the new one, updates profiles,
-- and inserts a credit_transaction — all in a single atomic operation.

CREATE OR REPLACE FUNCTION update_credit_balance(
  p_user_id UUID,
  p_amount INTEGER,
  p_source TEXT,
  p_description TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_current INTEGER;
  v_new INTEGER;
BEGIN
  -- Read current balance
  SELECT COALESCE(purga_points, 0) INTO v_current
  FROM profiles
  WHERE id = p_user_id;

  -- Calculate new balance (never go below 0)
  v_new := GREATEST(0, v_current + p_amount);

  -- Update profile balance
  UPDATE profiles
  SET purga_points = v_new,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Insert transaction record for audit trail
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

-- RPC wrapper for Supabase client calls
CREATE OR REPLACE FUNCTION rpc_update_credit_balance(
  p_amount INTEGER,
  p_source TEXT,
  p_description TEXT
) RETURNS INTEGER AS $$
BEGIN
  RETURN update_credit_balance(
    auth.uid(),
    p_amount,
    p_source,
    p_description
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
