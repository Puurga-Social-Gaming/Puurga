import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { normalizeImageUrl } from '../utils/url';

const router = express.Router();

// GET /api/purging/activity - Get purging activity from post_purges table
router.get('/activity', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 20;

    // Get user's friends first (graceful failure)
    let friendIds: string[] = [];
    try {
      const { data: friends } = await supabase
        .from('friends')
        .select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

      friendIds = (friends || [])
        .map((f: any) => f.user_id_1 === userId ? f.user_id_2 : f.user_id_1)
        .filter((id: string) => id !== userId);
    } catch (_) {
      // proceed with empty friendIds
    }

    // Fetch from post_purges
    const { data: purgeRows, error: purgeError } = await supabase
      .from('post_purges')
      .select('id, post_id, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Fetch from redemptions
    const { data: redemptionRows } = await supabase
      .from('redemptions')
      .select('id, redeemer_id, redeemed_user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (purgeError) {
      console.warn('Warning fetching post_purges:', purgeError.message);
    }

    const safePurgeRows = purgeRows || [];
    const safeRedemptionRows = redemptionRows || [];

    // Get profile data for all involved users
    const allUserIds = new Set<string>();
    safePurgeRows.forEach((p: any) => p.user_id && allUserIds.add(p.user_id));
    safeRedemptionRows.forEach((r: any) => {
      r.redeemer_id && allUserIds.add(r.redeemer_id);
      r.redeemed_user_id && allUserIds.add(r.redeemed_user_id);
    });

    // Get post details to find the target user for purges
    const postIds = Array.from(new Set(safePurgeRows.map((p: any) => p.post_id).filter(Boolean)));
    const postMap = new Map<string, any>();
    if (postIds.length > 0) {
      const { data: posts } = await supabase
        .from('posts')
        .select('id, user_id, content')
        .in('id', postIds);
      (posts || []).forEach((p: any) => {
        postMap.set(p.id, p);
        if (p.user_id) allUserIds.add(p.user_id);
      });
    }

    const userIdArray = Array.from(allUserIds);
    const profileMap = new Map<string, any>();
    if (userIdArray.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, credits, purga_points')
        .in('id', userIdArray);
      (profiles || []).forEach((p: any) => profileMap.set(p.id, p));
    }

    const purgeItems = safePurgeRows.map((row: any) => {
      const post = postMap.get(row.post_id);
      const targetProfile = post ? profileMap.get(post.user_id) : null;
      const purgerProfile = profileMap.get(row.user_id);

      const profile = targetProfile || purgerProfile;
      if (!profile) return null;

      const currentCredits = Number(profile.purga_points ?? profile.credits ?? 0);
      const creditsNeeded = Math.max(0, 100 - currentCredits);

      return {
        id: row.id,
        userId: profile.id,
        username: profile.username,
        name: profile.full_name || profile.username,
        avatar: normalizeImageUrl(profile.avatar_url),
        purgedBy: purgerProfile ? {
          id: row.user_id,
          username: purgerProfile.username,
          name: purgerProfile.full_name || purgerProfile.username,
        } : null,
        action: 'purged' as const,
        timestamp: row.created_at,
        creditsNeeded: creditsNeeded,
        isFriend: friendIds.includes(profile.id)
      };
    }).filter(Boolean);

    const redemptionItems = safeRedemptionRows.map((row: any) => {
      const targetProfile = profileMap.get(row.redeemed_user_id);
      const redeemerProfile = profileMap.get(row.redeemer_id);

      if (!targetProfile) return null;

      return {
        id: row.id,
        userId: targetProfile.id,
        username: targetProfile.username,
        name: targetProfile.full_name || targetProfile.username,
        avatar: normalizeImageUrl(targetProfile.avatar_url),
        purgedBy: redeemerProfile ? {
          id: row.redeemer_id,
          username: redeemerProfile.username,
          name: redeemerProfile.full_name || redeemerProfile.username,
        } : null,
        action: 'redeemed' as const,
        timestamp: row.created_at,
        isFriend: friendIds.includes(targetProfile.id)
      };
    }).filter(Boolean);

    const activity = [...purgeItems, ...redemptionItems]
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    res.json(activity);
  } catch (error) {
    console.error('Error fetching purging activity:', error);
    res.status(500).json({ error: 'Failed to fetch purging activity' });
  }
});

// GET /api/purging/redemption-needed - Get friends who need redemption
router.get('/redemption-needed', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    // Get user's friends from both friends table and accepted friend requests
    const [friendsRes, requestsRes] = await Promise.all([
      supabase
        .from('friends')
        .select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`),
      supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    ]);

    const friendIdsFromTable = (friendsRes.data || [])
      .map((f: any) => f.user_id_1 === userId ? f.user_id_2 : f.user_id_1);

    const friendIdsFromRequests = (requestsRes.data || [])
      .map((r: any) => r.sender_id === userId ? r.receiver_id : r.sender_id);

    const friendIds = Array.from(new Set([...friendIdsFromTable, ...friendIdsFromRequests]))
      .filter((id: string) => id !== userId);

    if (friendIds.length === 0) return res.json([]);

    // Get profiles of friends who are in ghost mode
    const { data: ghostedFriends, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, is_ghost, purge_count, ghosted_at')
      .in('id', friendIds)
      .eq('is_ghost', true);

    if (profilesError) {
      console.error('Error fetching ghosted profiles:', profilesError);
      return res.json([]);
    }

    // Filter again in memory to be absolutely sure
    const validGhosts = (ghostedFriends || []).filter(f => f.is_ghost === true);
    console.log(`[Redemption Needed] Found ${validGhosts.length} valid ghosts for user ${userId}`);

    const formattedFriends = validGhosts.map(friend => ({
      id: `redemption-${friend.id}`,
      userId: friend.id,
      username: friend.username,
      name: friend.full_name || friend.username,
      avatar: normalizeImageUrl(friend.avatar_url),
      creditsNeeded: 100, // Fixed cost for redemption
      daysPurged: friend.ghosted_at ? Math.floor((Date.now() - new Date(friend.ghosted_at).getTime()) / (1000 * 60 * 60 * 24)) : 0
    }));

    res.json(formattedFriends);
  } catch (error) {
    console.error('Error fetching redemption needed:', error);
    res.status(500).json({ error: 'Failed to fetch redemption needed' });
  }
});

export default router;
