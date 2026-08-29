CREATE OR REPLACE FUNCTION get_user_relations(p_user_id UUID)
RETURNS TABLE(related_user_id UUID)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Users who are already friends
  SELECT f.friend_id FROM friends f WHERE f.user_id = p_user_id
  UNION
  SELECT f.user_id FROM friends f WHERE f.friend_id = p_user_id
  UNION
  -- Users who have sent a request to the user
  SELECT fr.sender_id FROM friend_requests fr WHERE fr.receiver_id = p_user_id AND fr.status IN ('pending', 'rejected')
  UNION
  -- Users to whom the user has sent a request
  SELECT fr.receiver_id FROM friend_requests fr WHERE fr.sender_id = p_user_id AND fr.status IN ('pending', 'rejected');
END;
$$;
