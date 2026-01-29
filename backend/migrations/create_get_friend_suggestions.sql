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
        -- Exclude existing friends (both directions)
        SELECT friend_id FROM friends WHERE user_id = p_user_id
        UNION
        SELECT user_id FROM friends WHERE friend_id = p_user_id
    )
    AND p.id NOT IN (
        -- Exclude pending requests (optional, but good UX)
        SELECT receiver_id FROM friend_requests WHERE sender_id = p_user_id AND status = 'pending'
        UNION
        SELECT sender_id FROM friend_requests WHERE receiver_id = p_user_id AND status = 'pending'
    )
  ORDER BY random() -- Randomize suggestions
  LIMIT p_limit;
END;
$$;
