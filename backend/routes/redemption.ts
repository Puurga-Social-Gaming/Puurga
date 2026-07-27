import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { normalizeImageUrl } from '../utils/url';
import { wsManager } from '../websocketManager';
import { createNotification } from './createNotification';
import { PurgatoryEngine } from '../services/survival/purgatory-engine';
import { CreditService } from '../services/creditService';
import { isTransientError } from '../utils/transientError';

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

    // Check if target user is in purgatory (new system) or ghost mode (old system)
    const { data: targetSurvival, error: survivalError } = await supabase
      .from('user_survival_state')
      .select('purgatory_status, purge_count')
      .eq('user_id', targetUserId)
      .single();

    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('is_ghost, purge_count, full_name')
      .eq('id', targetUserId)
      .single();

    if (profileError || !targetProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPurgatory = targetSurvival?.purgatory_status === true;
    const isGhost = targetProfile.is_ghost === true;

    if (!isPurgatory && !isGhost) {
      return res.status(400).json({ error: 'User is not in ghost mode or purgatory' });
    }

    // Calculate credits required
    const purgeCount = targetSurvival?.purge_count || targetProfile.purge_count || 0;
    const redemptionCost = 100 + (purgeCount * 10);

    // Check if redeemer has enough credits
    const { data: redeemerProfile, error: redeemerError } = await supabase
      .from('profiles')
      .select('purga_points, credits')
      .eq('id', redeemerUserId)
      .single();

    if (redeemerError || !redeemerProfile) {
      return res.status(404).json({ error: 'Redeemer profile not found' });
    }

    const currentCredits = Number(redeemerProfile.purga_points ?? redeemerProfile.credits ?? 0);

    if (currentCredits < redemptionCost) {
      return res.status(400).json({
        error: 'Insufficient credits',
        required: redemptionCost,
        current: currentCredits
      });
    }

    // Deduct credits from redeemer
    await CreditService.deductCredits(redeemerUserId, redemptionCost, 'redeem_user', `Redeemed user from ghost mode`);

    // Emit credit update via WebSocket
    wsManager.sendToUser(redeemerUserId, {
      type: 'credit_update',
      payload: { userId: redeemerUserId, credits: currentCredits - redemptionCost }
    });

    // Use PurgatoryEngine to exit purgatory if in new system
    if (isPurgatory) {
      await PurgatoryEngine.exitPurgatory(targetUserId, redeemerUserId);
    } else {
      // Fallback to old system: remove ghost mode from target user
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
        await CreditService.awardCredits(redeemerUserId, redemptionCost, 'refund', 'Redemption refund');
        throw restoreError;
      }

      // Emit profile update via WebSocket for the redeemed user
      wsManager.sendToUser(targetUserId, {
        type: 'profile_update',
        payload: { userId: targetUserId, isGhost: false, purgeCount: 0 }
      });
    }

    // Also notify friends that this user is now redeemed
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

    // Get new credit balance
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('purga_points, credits')
      .eq('id', redeemerUserId)
      .single();

    const newCredits = Number(updatedProfile?.purga_points ?? updatedProfile?.credits ?? 0);

    res.json({
      success: true,
      message: `Successfully redeemed ${targetProfile.full_name || 'user'} from ghost mode`,
      creditsSpent: redemptionCost,
      remainingCredits: newCredits
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

    if (friendsRes.error && isTransientError(friendsRes.error)) {
      console.warn('ghosted-friends: friends lookup transient — returning []');
      return res.json([]);
    }
    if (requestsRes.error && isTransientError(requestsRes.error)) {
      console.warn('ghosted-friends: friend_requests lookup transient — returning []');
      return res.json([]);
    }

    const friendIdsFromTable = (friendsRes.data || [])
      .map((f: any) => f.user_id_1 === userId ? f.user_id_2 : f.user_id_1);

    const friendIdsFromRequests = (requestsRes.data || [])
      .map((r: any) => r.sender_id === userId ? r.receiver_id : r.sender_id);

    const friendIds = Array.from(new Set([...friendIdsFromTable, ...friendIdsFromRequests]))
      .filter((id: string) => id !== userId);

    if (friendIds.length === 0) {
      return res.json([]);
    }

    // Profiles: prefer ghost columns; fall back if schema incomplete / network blip
    let friendProfiles: Array<{
      id: string;
      full_name?: string | null;
      username?: string | null;
      avatar_url?: string | null;
      is_ghost?: boolean | null;
      purge_count?: number | null;
      ghosted_at?: string | null;
    }> = [];

    const fullProfiles = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, is_ghost, purge_count, ghosted_at')
      .in('id', friendIds);

    if (fullProfiles.error) {
      const msg = fullProfiles.error.message || '';
      const missingCol =
        fullProfiles.error.code === '42703' || /column .* does not exist/i.test(msg);
      if (missingCol) {
        const basic = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', friendIds);
        friendProfiles = (basic.data as typeof friendProfiles) || [];
      } else if (isTransientError(fullProfiles.error)) {
        console.warn('ghosted-friends: profiles transient — returning []');
        return res.json([]);
      } else {
        console.error('Error fetching friend profiles:', fullProfiles.error);
        return res.json([]);
      }
    } else {
      friendProfiles = (fullProfiles.data as typeof friendProfiles) || [];
    }

    // Get survival states to check purgatory status (new system)
    const { data: survivalStates, error: survivalError } = await supabase
      .from('user_survival_state')
      .select('user_id, purgatory_status, purgatory_entered_at, purge_count')
      .in('user_id', friendIds);

    if (survivalError && survivalError.code !== '42P01' && !isTransientError(survivalError)) {
      console.error('Error fetching survival states:', survivalError);
    }

    // Create maps for quick lookup
    const profileMap = new Map(friendProfiles.map(p => [p.id, p]));
    const survivalMap = new Map((survivalStates || []).map(s => [s.user_id, s]));

    // Filter ghosted friends (either old is_ghost or new purgatory_status)
    const ghostedFriends = friendIds.filter(friendId => {
      const profile = profileMap.get(friendId);
      const survival = survivalMap.get(friendId);
      
      // Check old system (is_ghost) or new system (purgatory_status)
      const isGhostedOld = profile?.is_ghost === true;
      const isGhostedNew = survival?.purgatory_status === true;
      
      return isGhostedOld || isGhostedNew;
    });

    console.log(`[Ghosted Friends] Found ${ghostedFriends.length} valid ghosts for user ${userId}`);

    const formattedFriends = ghostedFriends.map(friendId => {
      const profile = profileMap.get(friendId);
      const survival = survivalMap.get(friendId);
      
      // Use survival system data if available, otherwise fall back to old system
      const purgeCount = survival?.purge_count || profile?.purge_count || 0;
      const ghostedAt = survival?.purgatory_entered_at || profile?.ghosted_at;
      
      // Calculate credits required based on purge count and days ghosted
      const daysGhosted = ghostedAt
        ? Math.floor((Date.now() - new Date(ghostedAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const creditsRequired = 50 + (Number(purgeCount) * 10) + (daysGhosted * 5);

      return {
        id: friendId,
        fullName: profile?.full_name || profile?.username || 'Unknown',
        username: profile?.username || 'unknown',
        avatarUrl: normalizeImageUrl(profile?.avatar_url),
        isGhost: true,
        purgeCount,
        ghostedAt,
        redemptionCost: creditsRequired,
      };
    });

    return res.json(formattedFriends);

  } catch (error) {
    console.error('Error fetching ghosted friends:', error);
    return res.json([]); // Never 500 — keep Home / PurgeDashboard calm
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

    // Get survival states to check purgatory status (new system)
    const { data: survivalStates, error: survivalError } = await supabase
      .from('user_survival_state')
      .select('user_id, purgatory_status, purgatory_entered_at, purge_count')
      .in('user_id', friendIds);

    if (profilesError) {
      console.error('Error fetching friend profiles:', profilesError);
      return res.json({ friends: [], stats: { totalFriends: 0, ghosted: 0, atRisk: 0 } });
    }

    // Create maps for quick lookup
    const profileMap = new Map((friendProfiles || []).map(p => [p.id, p]));
    const survivalMap = new Map((survivalStates || []).map(s => [s.user_id, s]));

    const ghosted: any[] = [];
    const atRisk: any[] = [];
    const safe: any[] = [];

    friendIds.forEach(friendId => {
      const profile = profileMap.get(friendId);
      const survival = survivalMap.get(friendId);
      
      if (!profile) return;

      // Check old system (is_ghost) or new system (purgatory_status)
      const isGhostedOld = profile?.is_ghost === true;
      const isGhostedNew = survival?.purgatory_status === true;
      const isGhosted = isGhostedOld || isGhostedNew;

      const purgeCount = survival?.purge_count || profile?.purge_count || 0;
      const ghostedAt = survival?.purgatory_entered_at || profile?.ghosted_at;

      // Calculate credits required
      const daysGhosted = ghostedAt
        ? Math.floor((Date.now() - new Date(ghostedAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const creditsRequired = 50 + (purgeCount * 10) + (daysGhosted * 5);

      const friend = {
        id: friendId,
        fullName: profile.full_name,
        username: profile.username,
        avatarUrl: normalizeImageUrl(profile.avatar_url),
        isGhost: isGhosted,
        purgeCount,
        ghostedAt,
        dangerLevel: isGhosted ? 'ghosted' : purgeCount >= 15 ? 'critical' : purgeCount >= 10 ? 'high' : purgeCount >= 5 ? 'medium' : 'low',
        redemptionCost: creditsRequired
      };

      if (isGhosted) ghosted.push(friend);
      else if (purgeCount >= 10) atRisk.push(friend);
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
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Profiles: prefer ghost columns; fall back if schema is incomplete
    let profile: {
      full_name?: string | null;
      is_ghost?: boolean | null;
      purge_count?: number | null;
      ghosted_at?: string | null;
    } | null = null;

    const fullProfile = await supabase
      .from('profiles')
      .select('is_ghost, purge_count, ghosted_at, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (fullProfile.error) {
      const code = (fullProfile.error as { code?: string }).code;
      const msg = fullProfile.error.message || '';
      // Missing column(s) — retry with minimal select
      if (code === '42703' || msg.includes('does not exist')) {
        const basic = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .maybeSingle();
        if (basic.error || !basic.data) {
          // Soft defaults — never break Home shell
          return res.json({
            isGhost: false,
            purgeCount: 0,
            ghostedAt: null,
            userName: null,
            redemptionCost: 50,
          });
        }
        profile = basic.data;
      } else if (code === 'PGRST116') {
        return res.json({
          isGhost: false,
          purgeCount: 0,
          ghostedAt: null,
          userName: null,
          redemptionCost: 50,
        });
      } else {
        console.warn('Error checking ghost status (profile):', fullProfile.error);
        return res.json({
          isGhost: false,
          purgeCount: 0,
          ghostedAt: null,
          userName: null,
          redemptionCost: 50,
        });
      }
    } else if (!fullProfile.data) {
      return res.json({
        isGhost: false,
        purgeCount: 0,
        ghostedAt: null,
        userName: null,
        redemptionCost: 50,
      });
    } else {
      profile = fullProfile.data;
    }

    // Survival table may be missing — treat as soft optional
    let survival: {
      purgatory_status?: boolean | null;
      purgatory_entered_at?: string | null;
      purge_count?: number | null;
    } | null = null;

    const survivalRes = await supabase
      .from('user_survival_state')
      .select('purgatory_status, purgatory_entered_at, purge_count')
      .eq('user_id', userId)
      .maybeSingle();

    if (!survivalRes.error) {
      survival = survivalRes.data;
    } else {
      const code = (survivalRes.error as { code?: string }).code;
      const msg = survivalRes.error.message || '';
      if (code !== '42P01' && code !== 'PGRST116' && !msg.includes('does not exist')) {
        console.warn('Ghost status survival lookup warning:', survivalRes.error.message);
      }
    }

    const isGhostedOld = profile.is_ghost === true;
    const isGhostedNew = survival?.purgatory_status === true;
    const isGhost = isGhostedOld || isGhostedNew;

    const purgeCount = survival?.purge_count || profile.purge_count || 0;
    const ghostedAt = survival?.purgatory_entered_at || profile.ghosted_at || null;

    const daysGhosted = ghostedAt
      ? Math.floor((Date.now() - new Date(ghostedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const creditsRequired = 50 + (Number(purgeCount) * 10) + (daysGhosted * 5);

    return res.json({
      isGhost,
      purgeCount: Number(purgeCount) || 0,
      ghostedAt,
      userName: profile.full_name,
      redemptionCost: creditsRequired,
    });
  } catch (error) {
    console.error('Error checking ghost status:', error);
    // Never break the app shell — return safe defaults
    return res.json({
      isGhost: false,
      purgeCount: 0,
      ghostedAt: null,
      userName: null,
      redemptionCost: 50,
    });
  }
});

// POST /api/friends/:friendId/redeem - Redeem a ghosted friend using credits (for PurgeDashboard)
router.post('/friends/:friendId/redeem', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const friendId = req.params.friendId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if they are friends
    const { data: friendship, error: friendError } = await supabase
      .from('friends')
      .select('id')
      .or(`and(user_id_1.eq.${userId},user_id_2.eq.${friendId}),and(user_id_1.eq.${friendId},user_id_2.eq.${userId})`)
      .maybeSingle();

    if (friendError && friendError.code !== 'PGRST116') {
      if (friendError.code === '42P01' || friendError.code === '42703') {
        return res.status(400).json({ error: 'Friend system not available' });
      }
      throw friendError;
    }

    if (!friendship) {
      return res.status(400).json({ error: 'You can only redeem friends' });
    }

    // Check if friend is in purgatory (new system) or ghost mode (old system)
    const { data: friendSurvival, error: survivalError } = await supabase
      .from('user_survival_state')
      .select('purgatory_status, purge_count, purgatory_entered_at')
      .eq('user_id', friendId)
      .single();

    const { data: friendProfile, error: profileError } = await supabase
      .from('profiles')
      .select('is_ghost, purge_count, ghosted_at, full_name')
      .eq('id', friendId)
      .single();

    if (profileError || !friendProfile) {
      return res.status(404).json({ error: 'Friend not found' });
    }

    const isPurgatory = friendSurvival?.purgatory_status === true;
    const isGhost = friendProfile.is_ghost === true;

    if (!isPurgatory && !isGhost) {
      return res.status(400).json({ error: 'Friend is not ghosted' });
    }

    // Calculate credits required
    const purgeCount = friendSurvival?.purge_count || friendProfile.purge_count || 0;
    const ghostedAt = friendSurvival?.purgatory_entered_at || friendProfile.ghosted_at;
    const daysGhosted = ghostedAt
      ? Math.floor((Date.now() - new Date(ghostedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const creditsRequired = 50 + (purgeCount * 10) + (daysGhosted * 5);

    // Check user's credits
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('purga_points, credits')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userCredits = Number(userProfile.purga_points ?? userProfile.credits ?? 0);

    if (userCredits < creditsRequired) {
      return res.status(400).json({
        error: 'Insufficient credits',
        creditsRequired,
        creditsNeeded: creditsRequired - userCredits,
      });
    }

    // Deduct credits from user
    await CreditService.deductCredits(userId, creditsRequired, 'redeem_friend', `Redeemed ghosted friend`);

    // Emit credit update via WebSocket
    wsManager.sendToUser(userId, {
      type: 'credit_update',
      payload: { userId, credits: userCredits - creditsRequired }
    });

    // Use PurgatoryEngine to exit purgatory if in new system
    if (isPurgatory) {
      await PurgatoryEngine.exitPurgatory(friendId, userId);
    } else {
      // Fallback to old system: remove ghost mode from friend
      const { error: restoreError } = await supabase
        .from('profiles')
        .update({
          is_ghost: false,
          purge_count: 0,
          ghosted_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', friendId);

      if (restoreError) {
        // Rollback credit deduction
        await CreditService.awardCredits(userId, creditsRequired, 'refund', 'Redemption refund');
        throw restoreError;
      }

      // Emit profile update via WebSocket for the redeemed user
      wsManager.sendToUser(friendId, {
        type: 'profile_update',
        payload: { userId: friendId, isGhost: false, purgeCount: 0 }
      });
    }

    // Log the redemption
    await supabase
      .from('redemptions')
      .insert({
        redeemer_id: userId,
        redeemed_user_id: friendId,
        credits_spent: creditsRequired,
        created_at: new Date().toISOString()
      });

    // Create notification for the redeemed user
    await createNotification({
      type: 'redemption',
      senderId: userId,
      receiverId: friendId
    });

    // Get new credit balance
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('purga_points, credits')
      .eq('id', userId)
      .single();

    const newCredits = Number(updatedProfile?.purga_points ?? updatedProfile?.credits ?? 0);

    res.json({
      success: true,
      newCredits,
      creditsDeducted: creditsRequired,
    });
  } catch (error) {
    console.error('Error redeeming friend:', error);
    res.status(500).json({ error: 'Failed to redeem friend' });
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
