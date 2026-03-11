-- Database Function to efficienty get friend suggestions
-- Reduces bandwidth by filtering on the server side instead of fetching 50+ profiles to the client

CREATE OR REPLACE FUNCTION get_friend_suggestions(
  p_user_id UUID,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.username,
    p.avatar_url
  FROM profiles p
  WHERE 
    p.id != p_user_id -- Exclude self
    AND p.id NOT IN (
        -- Exclude existing friends (both directions from the friends table)
        SELECT user_id_2 FROM friends WHERE user_id_1 = p_user_id
        UNION
        SELECT user_id_1 FROM friends WHERE user_id_2 = p_user_id
    )
    AND p.id NOT IN (
        -- Exclude pending OR accepted requests (both directions from the friend_requests table)
        -- We include 'accepted' as a safety net in case the user relations are only in this table
        SELECT receiver_id FROM friend_requests WHERE sender_id = p_user_id AND status IN ('pending', 'accepted')
        UNION
        SELECT sender_id FROM friend_requests WHERE receiver_id = p_user_id AND status IN ('pending', 'accepted')
    )
  ORDER BY random() -- Randomize suggestions
  LIMIT p_limit;
END;
$$;
