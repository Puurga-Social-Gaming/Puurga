import express from 'express';
import { requireSupabase, requireSupabaseAdmin } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { NotificationService } from '../services/notificationService';
import { CreditService } from '../services/creditService';

const router = express.Router();

function formatCompact(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(n));
}

/**
 * GET /api/dashboard/stats
 * Aggregated real stats for the user dashboard.
 */
router.get('/stats', auth, async (req: AuthRequest, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Friends (mutual) — used as "followers/friends" in this product
    const friendsPromise = supabaseClient
      .from('friends')
      .select('id', { count: 'exact', head: true })
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

    // User posts
    const postsPromise = supabaseClient
      .from('posts')
      .select('id')
      .eq('user_id', userId);

    // Conversations the user participates in
    const conversationsPromise = supabaseClient
      .from('conversation_participants')
      .select('conversation_id', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Credits
    const creditsPromise = CreditService.getCredits(userId).catch(() => null);

    const [friendsRes, postsRes, convRes, unreadCount, creditBalance] = await Promise.all([
      friendsPromise,
      postsPromise,
      conversationsPromise,
      NotificationService.getUnreadCount(userId).catch(() => 0),
      creditsPromise,
    ]);

    // Soft-fail missing tables
    const softCount = (err: { code?: string } | null, count: number | null) => {
      if (err && (err.code === '42P01' || err.code === '42703')) return 0;
      return count || 0;
    };

    const friendsCount = softCount(friendsRes.error as any, friendsRes.count);
    const conversationCount = softCount(convRes.error as any, convRes.count);

    let postIds: string[] = [];
    if (postsRes.error) {
      const code = (postsRes.error as any).code;
      if (code !== '42P01' && code !== '42703') {
        console.warn('dashboard posts error:', postsRes.error.message);
      }
    } else {
      postIds = (postsRes.data || []).map((p: { id: string }) => p.id);
    }

    let likesCount = 0;
    let commentsCount = 0;
    let purgesReceived = 0;

    if (postIds.length > 0) {
      const [likesRes, commentsRes, purgesRes] = await Promise.all([
        supabaseClient.from('likes').select('id', { count: 'exact', head: true }).in('post_id', postIds),
        supabaseClient.from('comments').select('id', { count: 'exact', head: true }).in('post_id', postIds),
        supabaseClient.from('post_purges').select('id', { count: 'exact', head: true }).in('post_id', postIds),
      ]);

      likesCount = softCount(likesRes.error as any, likesRes.count);
      commentsCount = softCount(commentsRes.error as any, commentsRes.count);
      // post_purges may not exist — also try purges table naming variants
      if (purgesRes.error && ((purgesRes.error as any).code === '42P01' || (purgesRes.error as any).code === '42703')) {
        const alt = await supabaseClient
          .from('purges')
          .select('id', { count: 'exact', head: true })
          .in('post_id', postIds);
        purgesReceived = softCount(alt.error as any, alt.count);
      } else {
        purgesReceived = softCount(purgesRes.error as any, purgesRes.count);
      }
    }

    const postCount = postIds.length;
    const totalEngagements = likesCount + commentsCount + purgesReceived;
    // Engagement rate: average interactions per post, as a percentage (capped for UI)
    const engagementRateRaw = postCount === 0 ? 0 : (totalEngagements / postCount) * 10;
    const engagementRate = Math.min(100, Math.round(engagementRateRaw * 10) / 10);

    // Credits fallback from profiles
    let credits = typeof creditBalance === 'number' ? creditBalance : null;
    if (credits === null) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('purga_points, credits')
        .eq('id', userId)
        .maybeSingle();
      credits = Number(profile?.purga_points ?? profile?.credits ?? 0) || 0;
    }

    res.set('Cache-Control', 'no-store');
    return res.json({
      credits,
      friends: friendsCount,
      followers: friendsCount, // alias — app uses friends graph
      following: friendsCount,
      posts: postCount,
      engagementRate,
      engagementRateLabel: `${engagementRate}%`,
      totalEngagements,
      activeConversations: conversationCount,
      unreadNotifications: unreadCount || 0,
      // Compact display helpers for UI
      display: {
        credits: formatCompact(credits),
        friends: formatCompact(friendsCount),
        engagement: `${engagementRate}%`,
        conversations: formatCompact(conversationCount),
        notifications: formatCompact(unreadCount || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

/**
 * GET /api/dashboard/analytics?range=7d|30d
 * Daily series for credits, engagement proxies, messages, purges.
 */
router.get('/analytics', auth, async (req: AuthRequest, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const range = req.query.range === '30d' ? 30 : 7;
    const since = new Date();
    since.setDate(since.getDate() - (range - 1));
    since.setHours(0, 0, 0, 0);
    const sinceIso = since.toISOString();

    const dayKeys: string[] = [];
    for (let i = 0; i < range; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      dayKeys.push(d.toISOString().slice(0, 10));
    }

    const emptySeries = () =>
      Object.fromEntries(dayKeys.map((k) => [k, 0])) as Record<string, number>;

    const creditsSeries = emptySeries();
    const engagementSeries = emptySeries();
    const messagesSeries = emptySeries();
    const purgesSeries = emptySeries();

    const [{ data: txs }, { data: posts }, { data: msgs }, { data: purges }] =
      await Promise.all([
        supabaseClient
          .from('credit_transactions')
          .select('amount, created_at')
          .eq('user_id', userId)
          .gte('created_at', sinceIso),
        supabaseClient
          .from('posts')
          .select('id, created_at')
          .eq('user_id', userId)
          .gte('created_at', sinceIso),
        supabaseClient
          .from('messages')
          .select('id, created_at')
          .eq('from_user_id', userId)
          .gte('created_at', sinceIso),
        supabaseClient
          .from('post_purges')
          .select('id, created_at')
          .eq('purged_by', userId)
          .gte('created_at', sinceIso),
      ]);

    const bump = (map: Record<string, number>, iso: string, n = 1) => {
      const key = iso.slice(0, 10);
      if (key in map) map[key] += n;
    };

    (txs || []).forEach((t: any) => bump(creditsSeries, t.created_at, Number(t.amount) || 0));
    (posts || []).forEach((p: any) => bump(engagementSeries, p.created_at, 1));
    (msgs || []).forEach((m: any) => bump(messagesSeries, m.created_at, 1));
    if (Array.isArray(purges)) {
      purges.forEach((p: any) => bump(purgesSeries, p.created_at, 1));
    }

    const series = dayKeys.map((date) => ({
      date,
      label: date.slice(5),
      credits: creditsSeries[date],
      posts: engagementSeries[date],
      messages: messagesSeries[date],
      purges: purgesSeries[date],
    }));

    res.set('Cache-Control', 'no-store');
    res.json({ range: `${range}d`, series });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
