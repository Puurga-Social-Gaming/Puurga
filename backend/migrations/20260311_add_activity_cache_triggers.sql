-- Migration: Activity Cache Triggers
-- Description: Keeps profiles.posts_count and profiles.purges_count in sync for high-performance filtering and sorting

-- 1. Sync triggers for activity counts in profiles (Posts)
CREATE OR REPLACE FUNCTION sync_profile_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET posts_count = GREATEST(0, posts_count - 1) WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_profile_post_count ON public.posts;
CREATE TRIGGER trigger_sync_profile_post_count
  AFTER INSERT OR DELETE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_post_count();

-- 2. Sync triggers for activity counts in profiles (Purges)
CREATE OR REPLACE FUNCTION sync_profile_purge_count()
RETURNS TRIGGER AS $$
DECLARE
  v_streak INTEGER;
  v_reward INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get current streak
    SELECT COALESCE(purge_streak, 0) INTO v_streak FROM public.profiles WHERE id = NEW.user_id;
    
    -- Increment streak and determine reward
    v_streak := v_streak + 1;
    v_reward := 1; -- Base reward
    
    IF v_streak >= 5 THEN
      v_reward := v_reward + 6; -- +6 bonus credits at 5th streak
      v_streak := 0; -- Reset streak
    END IF;

    UPDATE public.profiles 
    SET 
      purges_count = purges_count + 1,
      purge_streak = v_streak,
      credits = COALESCE(credits, 0) + v_reward,
      purga_points = COALESCE(purga_points, 0) + v_reward,
      updated_at = NOW()
    WHERE id = NEW.user_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles 
    SET 
      purges_count = GREATEST(0, purges_count - 1),
      updated_at = NOW()
    WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_profile_purge_count ON public.post_purges;
CREATE TRIGGER trigger_sync_profile_purge_count
  AFTER INSERT OR DELETE ON public.post_purges
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_purge_count();

-- 3. Initial sync of existing data
UPDATE public.profiles p 
SET 
  posts_count = (SELECT count(*) FROM public.posts WHERE posts.user_id = p.id),
  purges_count = (SELECT count(*) FROM public.post_purges WHERE post_purges.user_id = p.id);
