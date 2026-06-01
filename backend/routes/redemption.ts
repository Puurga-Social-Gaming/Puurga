import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { normalizeImageUrl } from '../utils/url';
import { wsManager } from '../websocketManager';
import { createNotification } from './createNotification';

const router = express.Router();

// POST /api/redeem/:userId - Redeem a user from ghost mode using credits
router.post('/:userId', auth, async (req: AuthRequest, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const redeemerUserId = req.user?.id;

    if (!redeemerUserId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Cannot redeem yourself
    if (redeemerUserId === targetUserId) {
      return res.status(400).json({ error: 'You cannot redeem yourself' });
    }

    // Check if target user is in ghost mode
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('is_ghost, purge_count, full_name')
      .eq('id', targetUserId)
      .single();

    if (targetError || !targetProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!targetProfile.is_ghost) {
      return res.status(400).json({ error: 'User is not in ghost mode' });
    }

    // Check if redeemer has enough credits
    const { data: redeemerProfile, error: redeemerError } = await supabase
      .from('profiles')
      .select('purga_points')
      .eq('id', redeemerUserId)
      .single();

    if (redeemerError || !redeemerProfile) {
      return res.status(404).json({ error: 'Redeemer profile not found' });
    }

    const redemptionCost = 100;
    const currentCredits = Number(redeemerProfile.purga_points || 0);

    if (currentCredits < redemptionCost) {
      return res.status(400).json({
        error: 'Insufficient credits',
        required: redemptionCost,
        current: currentCredits
      });
    }

    // Deduct credits from redeemer
    const { error: deductError } = await supabase
      .from('profiles')
      .update({
        purga_points: currentCredits - redemptionCost,
        updated_at: new Date().toISOString()
      })
      .eq('id', redeemerUserId);

    if (deductError) {
      throw deductError;
    }

    // Emit credit update via WebSocket
    wsManager.sendToUser(redeemerUserId, {
      type: 'credit_update',
      payload: { userId: redeemerUserId, credits: currentCredits - redemptionCost }
    });

    // Remove ghost mode from target user
    const { error: restoreError } = await supabase
      .from('profiles')
      .update({
        is_ghost: false,
        purge_count: 0,
        ghosted_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUserId);

    if (restoreError) {
      // Rollback credit deduction
      await supabase
        .from('profiles')
        .update({ purga_points: currentCredits })
        .eq('id', redeemerUserId);

      // Emit rollback credit update
      wsManager.sendToUser(redeemerUserId, {
        type: 'credit_update',
        payload: { userId: redeemerUserId, credits: currentCredits }
      });
      throw restoreError;
    }

    // Emit profile update via WebSocket for the redeemed user
    wsManager.sendToUser(targetUserId, {
      type: 'profile_update',
      payload: { userId: targetUserId, isGhost: false, purgeCount: 0 }
    });

    // Also notify friends that this user is now redeemed (so their dashboards update)
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        supabase
          .from('friends')
          .select('user_id_1, user_id_2')
          .or(`user_id_1.eq.${targetUserId},user_id_2.eq.${targetUserId}`),
        supabase
          .from('friend_requests')
          .select('sender_id, receiver_id')
          .eq('status', 'accepted')
          .or(`sender_id.eq.${targetUserId},receiver_id.eq.${targetUserId}`)
      ]);

      const friendIdsFromTable = (friendsRes.data || [])
        .map((f: any) => f.user_id_1 === targetUserId ? f.user_id_2 : f.user_id_1);

      const friendIdsFromRequests = (requestsRes.data || [])
        .map((r: any) => r.sender_id === targetUserId ? r.receiver_id : r.sender_id);

      const friendIds = Array.from(new Set([...friendIdsFromTable, ...friendIdsFromRequests]))
        .filter((id: string) => id !== targetUserId);

      if (friendIds.length > 0) {
        for (const friendId of friendIds) {
          wsManager.sendToUser(friendId, {
            type: 'profile_update',
            payload: { userId: targetUserId, isGhost: false, purgeCount: 0 }
          });
        }
      }
    } catch (notifError) {
      console.error('Error broadcasting redemption update to friends:', notifError);
    }

    // Clear all purges for the target user
    await supabase
      .from('purges')
      .delete()
      .eq('target_user_id', targetUserId);

    // Log the redemption
    await supabase
      .from('redemptions')
      .insert({
        redeemer_id: redeemerUserId,
        redeemed_user_id: targetUserId,
        credits_spent: redemptionCost,
        created_at: new Date().toISOString()
      });

    // Create notification for the redeemed user
    await createNotification({
      type: 'redemption',
      senderId: redeemerUserId,
      receiverId: targetUserId
    });

    res.json({
      success: true,
      message: `Successfully redeemed ${targetProfile.full_name || 'user'} from ghost mode`,
      creditsSpent: redemptionCost,
      remainingCredits: currentCredits - redemptionCost
    });

  } catch (error) {
    console.error('Error redeeming user:', error);
    res.status(500).json({ error: 'Failed to redeem user' });
  }
});

// GET /api/redeem/ghosted-friends - Get list of user's friends who are in ghost mode
router.get('/ghosted-friends', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

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

    if (friendIds.length === 0) {
      return res.json([]);
    }

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

    // Filter in memory to be extra safe
    const validGhosts = (ghostedFriends || []).filter(f => f.is_ghost === true);
    console.log(`[Ghosted Friends] Found ${validGhosts.length} valid ghosts for user ${userId}`);

    const formattedFriends = validGhosts.map(friend => ({
      id: friend.id,
      fullName: friend.full_name,
      username: friend.username,
      avatarUrl: normalizeImageUrl(friend.avatar_url),
      isGhost: friend.is_ghost,
      purgeCount: friend.purge_count || 0,
      ghostedAt: friend.ghosted_at,
      redemptionCost: 100
    }));

    res.json(formattedFriends);

  } catch (error) {
    console.error('Error fetching ghosted friends:', error);
    res.json([]); // Return empty array instead of error to prevent UI crashes
  }
});

// GET /api/redeem/friend-stats - Get all friends with purge counts and ghost status
router.get('/friend-stats', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    // Get user's friends
    const [friendsRes, requestsRes] = await Promise.all([
      supabase.from('friends').select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`),
      supabase.from('friend_requests').select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    ]);

    const friendIdsFromTable = (friendsRes.data || [])
      .map((f: any) => f.user_id_1 === userId ? f.user_id_2 : f.user_id_1);
    const friendIdsFromRequests = (requestsRes.data || [])
      .map((r: any) => r.sender_id === userId ? r.receiver_id : r.sender_id);

    const friendIds = Array.from(new Set([...friendIdsFromTable, ...friendIdsFromRequests]))
      .filter((id: string) => id !== userId);

    if (friendIds.length === 0) return res.json({ friends: [], stats: { totalFriends: 0, ghosted: 0, atRisk: 0 } });

    // Get profiles of all friends with purge data
    const { data: friendProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, is_ghost, purge_count, ghosted_at')
      .in('id', friendIds);

    if (profilesError) {
      console.error('Error fetching friend profiles:', profilesError);
      return res.json({ friends: [], stats: { totalFriends: 0, ghosted: 0, atRisk: 0 } });
    }

    const ghosted: any[] = [];
    const atRisk: any[] = [];
    const safe: any[] = [];

    (friendProfiles || []).forEach((f: any) => {
      const friend = {
        id: f.id,
        fullName: f.full_name,
        username: f.username,
        avatarUrl: normalizeImageUrl(f.avatar_url),
        isGhost: f.is_ghost || false,
        purgeCount: f.purge_count || 0,
        ghostedAt: f.ghosted_at,
        dangerLevel: f.is_ghost ? 'ghosted' : (f.purge_count || 0) >= 15 ? 'critical' : (f.purge_count || 0) >= 10 ? 'high' : (f.purge_count || 0) >= 5 ? 'medium' : 'low',
        redemptionCost: 100
      };
      if (f.is_ghost) ghosted.push(friend);
      else if ((f.purge_count || 0) >= 10) atRisk.push(friend);
      else safe.push(friend);
    });

    ghosted.sort((a, b) => b.purgeCount - a.purgeCount);
    atRisk.sort((a, b) => b.purgeCount - a.purgeCount);

    res.json({
      friends: [...ghosted, ...atRisk, ...safe],
      stats: {
        totalFriends: friendIds.length,
        ghosted: ghosted.length,
        atRisk: atRisk.length,
        safe: safe.length
      }
    });

  } catch (error) {
    console.error('Error fetching friend stats:', error);
    res.json({ friends: [], stats: { totalFriends: 0, ghosted: 0, atRisk: 0, safe: 0 } });
  }
});

// GET /api/redeem/status/:userId - Check if a user is in ghost mode
router.get('/status/:userId', auth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_ghost, purge_count, ghosted_at, full_name')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      isGhost: profile.is_ghost || false,
      purgeCount: profile.purge_count || 0,
      ghostedAt: profile.ghosted_at,
      userName: profile.full_name,
      redemptionCost: 100
    });

  } catch (error) {
    console.error('Error checking ghost status:', error);
    res.status(500).json({ error: 'Failed to check ghost status' });
  }
});

// GET /api/redeem/contributors/:userId - Get list of users who helped redeem this user
router.get('/contributors/:userId', auth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    // Fetch from redemptions (direct full redemption)
    const { data: directRedemptions } = await supabase
      .from('redemptions')
      .select('redeemer_id, credits_spent, created_at')
      .eq('redeemed_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    // Fetch from redemption_activities (partial contributions)
    const { data: partialActivities } = await supabase
      .from('redemption_activities')
      .select('helper_user_id, points_earned')
      .eq('ghost_user_id', userId);

    // Collect all contributors
    const contributorsMap = new Map<string, number>();

    // Add direct redeemer
    if (directRedemptions && directRedemptions.length > 0) {
      const red = directRedemptions[0];
      contributorsMap.set(red.redeemer_id, (contributorsMap.get(red.redeemer_id) || 0) + Number(red.credits_spent));
    }

    // Add partial contributors
    if (partialActivities) {
      partialActivities.forEach((act: any) => {
        contributorsMap.set(act.helper_user_id, (contributorsMap.get(act.helper_user_id) || 0) + Number(act.points_earned));
      });
    }

    const contributorIds = Array.from(contributorsMap.keys());
    if (contributorIds.length === 0) {
      return res.json([]);
    }

    // Get profiles for all contributors
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', contributorIds);

    const result = (profiles || []).map((p: any) => ({
      userId: p.id,
      name: p.full_name || p.username,
      username: p.username,
      avatar: normalizeImageUrl(p.avatar_url),
      contribution: contributorsMap.get(p.id) || 0
    })).sort((a, b) => b.contribution - a.contribution);

    res.json(result);
  } catch (error) {
    console.error('Error fetching contributors:', error);
    res.status(500).json({ error: 'Failed to fetch contributors' });
  }
});

export default router;
