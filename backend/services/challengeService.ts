import { requireSupabase, requireSupabaseAdmin } from '../config/supabase';
import { CreditService } from './creditService';
import { wsManager } from '../websocketManager';
import { NotificationService } from './notificationService';
import { getAcceptedFriendIds } from '../utils/friendRelations';
import { SurvivalEngine } from './survival/survival-engine';

export const CHALLENGE_STAKE_PRESETS = [10, 25, 50, 100, 250, 500, 1000] as const;

export type ChallengeStatus =
  | 'pending'
  | 'accepted'
  | 'starting'
  | 'playing'
  | 'finished'
  | 'declined'
  | 'cancelled'
  | 'expired';

const GAME_TITLES: Record<string, string> = {
  'purga-rift': 'Purga Rift',
  judgment: 'Judgment',
  watchman: 'The Watchman',
  redemption: 'Redemption',
  'puurga-slot-2': 'Cyber Runner',
};

export function resolveGameTitle(gameId: string, fallback?: string): string {
  return fallback || GAME_TITLES[gameId] || gameId;
}

async function getBalance(userId: string): Promise<number> {
  const supabaseAdminClient = requireSupabaseAdmin();
  const { data } = await supabaseAdminClient
    .from('profiles')
    .select('purga_points, credits')
    .eq('id', userId)
    .single();
  return Number((data as any)?.purga_points ?? (data as any)?.credits ?? 0);
}

const DEFAULT_SEASON_ID = '00000000-0000-4000-8000-000000000001';
const PURGE_REASON = 'Lost all points through game challenges';
const PURGE_MESSAGE =
  'This account has been purged after losing all points through competitive games.';

async function getActiveSeasonId(): Promise<string | null> {
  const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const { data, error } = await supabaseAdminClient
      .from('game_seasons')
      .select('id')
      .eq('is_active', true)
      .maybeSingle();
    if (error) return null;
    return data?.id || DEFAULT_SEASON_ID;
  } catch {
    return null;
  }
}

function isMissingRelation(error: any): boolean {
  const code = String(error?.code || '');
  const msg = String(error?.message || error?.details || '');
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    /does not exist|schema cache|Could not find the table/i.test(msg)
  );
}

function isMissingColumn(error: any): boolean {
  const code = String(error?.code || '');
  const msg = String(error?.message || '');
  return code === '42703' || /column .* does not exist/i.test(msg);
}

function isFkViolation(error: any): boolean {
  const code = String(error?.code || '');
  const msg = String(error?.message || '');
  return code === '23503' || /foreign key|violates foreign key/i.test(msg);
}

function challengeDbError(error: any, fallback = 'Failed to create challenge') {
  if (isMissingRelation(error)) {
    return Object.assign(
      new Error('Game challenges DB not ready — apply migration 20260716_game_challenges.sql in supabaseClient'),
      { status: 503, code: 'MIGRATION_REQUIRED', hint: error?.hint }
    );
  }
  return Object.assign(new Error(error?.message || fallback), {
    status: 500,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  });
}

async function auditLog(params: {
  action: string;
  actorId?: string | null;
  challengeId?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabaseClient = requireSupabase();
  const supabaseAdminClient = requireSupabaseAdmin();
  const { error } = await supabaseAdminClient.from('game_audit_logs').insert({
    actor_id: params.actorId || null,
    challenge_id: params.challengeId || null,
    session_id: params.sessionId || null,
    action: params.action,
    metadata: params.metadata || {},
  });
  if (error && !isMissingRelation(error)) console.warn('game_audit_logs:', error.message);
}

async function gameNotify(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  challengeId?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabaseClient = requireSupabase();
  const supabaseAdminClient = requireSupabaseAdmin();
  const { error } = await supabaseAdminClient.from('game_notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    challenge_id: params.challengeId || null,
    metadata: params.metadata || {},
  });
  if (error && !isMissingRelation(error)) console.warn('game_notifications:', error.message);
}

/** Gaming layer only emits an event — Survival Engine owns Ghost/Purgatory. */
async function handleBankruptcy(
  userId: string,
  balance: number,
  challengeId?: string
): Promise<void> {
  if (balance > 0) return;
  try {
    const supabaseAdminClient = requireSupabaseAdmin();
    await supabaseAdminClient.from('game_purge_events').insert({
      user_id: userId,
      challenge_id: challengeId || null,
      reason: PURGE_REASON,
      balance_at_event: balance,
      processed: false,
    });

    await auditLog({
      action: 'player_bankrupt',
      actorId: userId,
      challengeId,
      metadata: { reason: PURGE_REASON, balance },
    });

    await SurvivalEngine.recordEvent(userId, 'GAME_PLAYER_BANKRUPT', 0, {
      reason: PURGE_REASON,
      challengeId,
      message: PURGE_MESSAGE,
    });

    // Let Survival decide warning / ghost / purgatory — do NOT write profiles.is_ghost here
    await SurvivalEngine.handleGamePlayerBankrupt(userId, {
      reason: PURGE_REASON,
      challengeId,
      message: PURGE_MESSAGE,
    });

    await gameNotify({
      userId,
      type: 'suspect',
      title: 'Account at risk',
      body: PURGE_MESSAGE,
      challengeId,
      metadata: { event: 'GAME_PLAYER_BANKRUPT' },
    });

    await NotificationService.securityAlert(userId, PURGE_MESSAGE, {
      event: 'GAME_PLAYER_BANKRUPT',
      purge_reason: PURGE_REASON,
    });
  } catch (err) {
    console.warn('GAME_PLAYER_BANKRUPT handling failed:', err);
  }
}

export function challengeRankFromElo(elo: number): string {
  if (elo >= 2000) return 'Legend';
  if (elo >= 1800) return 'Diamond';
  if (elo >= 1600) return 'Gold';
  if (elo >= 1400) return 'Silver';
  if (elo >= 1200) return 'Bronze';
  return 'Unranked';
}

export function challengeRankFromStats(wins: number, pointsWon: number, elo?: number): string {
  if (typeof elo === 'number') return challengeRankFromElo(elo);
  const score = wins * 10 + pointsWon;
  if (score >= 5000) return 'Legend';
  if (score >= 2000) return 'Diamond';
  if (score >= 800) return 'Gold';
  if (score >= 300) return 'Silver';
  if (score >= 50) return 'Bronze';
  return 'Unranked';
}

function eloExpected(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

function eloUpdate(elo: number, expected: number, score: number, k = 32): number {
  return Math.round(elo + k * (score - expected));
}

async function upsertRanking(
  userId: string,
  opts: { won: boolean; stake: number; seasonId: string; eloDelta?: number; newElo?: number }
): Promise<{ eloBefore: number; eloAfter: number }> {
  const supabaseAdminClient = requireSupabaseAdmin();
  const { data: existing } = await supabaseAdminClient
    .from('game_rankings')
    .select('*')
    .eq('user_id', userId)
    .eq('season_id', opts.seasonId)
    .maybeSingle();

  const eloBefore = existing?.elo_rating ?? 1000;
  const eloAfter = opts.newElo ?? eloBefore;
  const wins = (existing?.wins || 0) + (opts.won ? 1 : 0);
  const losses = (existing?.losses || 0) + (opts.won ? 0 : 1);
  let streak = existing?.current_streak || 0;
  if (opts.won) streak = streak >= 0 ? streak + 1 : 1;
  else streak = streak <= 0 ? streak - 1 : -1;
  const best = Math.max(existing?.best_streak || 0, streak);

  const row = {
    user_id: userId,
    season_id: opts.seasonId,
    wins,
    losses,
    current_streak: streak,
    best_streak: best,
    total_points_won: (existing?.total_points_won || 0) + (opts.won ? opts.stake : 0),
    total_points_lost: (existing?.total_points_lost || 0) + (opts.won ? 0 : opts.stake),
    biggest_win: opts.won
      ? Math.max(existing?.biggest_win || 0, opts.stake)
      : existing?.biggest_win || 0,
    elo_rating: eloAfter,
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabaseAdminClient
    .from('game_rankings')
    .upsert(row, { onConflict: 'user_id,season_id' });

  // Fallback if season composite PK not migrated yet
  if (error && (error.code === '42P01' || error.message?.includes('season') || error.code === '42703')) {
    const { error: e2 } = await supabaseAdminClient
      .from('game_rankings')
      .upsert(
        {
          user_id: userId,
          wins: row.wins,
          losses: row.losses,
          current_streak: row.current_streak,
          best_streak: row.best_streak,
          total_points_won: row.total_points_won,
          total_points_lost: row.total_points_lost,
          biggest_win: row.biggest_win,
          elo_rating: eloAfter,
          updated_at: row.updated_at,
        } as any,
        { onConflict: 'user_id' }
      );
    error = e2;
  }

  if (error && error.code !== '42P01') console.warn('upsertRanking:', error.message);
  return { eloBefore, eloAfter };
}

function emitChallenge(userIds: string[], type: string, payload: Record<string, unknown>) {
  wsManager.broadcastToUsers(userIds, { type: type as any, payload });
}

export class ChallengeService {
  static async setPresence(userId: string, gameId: string, gameTitle?: string) {
    const supabaseAdminClient = requireSupabaseAdmin();
    const title = resolveGameTitle(gameId, gameTitle);
    const now = new Date().toISOString();
    const { error } = await supabaseAdminClient.from('game_presence').upsert(
      {
        user_id: userId,
        game_id: gameId,
        game_title: title,
        started_at: now,
        last_heartbeat: now,
      },
      { onConflict: 'user_id' }
    );
    if (error) {
      if (isMissingRelation(error)) throw challengeDbError(error);
      throw error;
    }

    const friendIds = await getAcceptedFriendIds(userId);
    if (friendIds.length) {
      emitChallenge(friendIds, 'friend_started_game', {
        userId,
        gameId,
        gameTitle: title,
        startedAt: now,
      });
    }
    return { gameId, gameTitle: title, startedAt: now };
  }

  static async clearPresence(userId: string) {
    const supabaseAdminClient = requireSupabaseAdmin();
    const { data: prev } = await supabaseAdminClient
      .from('game_presence')
      .select('game_id, game_title')
      .eq('user_id', userId)
      .maybeSingle();

    await supabaseAdminClient.from('game_presence').delete().eq('user_id', userId);

    const friendIds = await getAcceptedFriendIds(userId);
    if (friendIds.length) {
      emitChallenge(friendIds, 'friend_left_game', {
        userId,
        gameId: prev?.game_id,
        gameTitle: prev?.game_title,
      });
    }
  }

  static async heartbeat(userId: string) {
    const supabaseAdminClient = requireSupabaseAdmin();
    await supabaseAdminClient
      .from('game_presence')
      .update({ last_heartbeat: new Date().toISOString() })
      .eq('user_id', userId);
  }

  static async listPresence(viewerId: string, friendsOnly = true) {
    const supabaseAdminClient = requireSupabaseAdmin();
    const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    // Expire stale
    await supabaseAdminClient.from('game_presence').delete().lt('last_heartbeat', cutoff);

    let query = supabaseAdminClient
      .from('game_presence')
      .select('user_id, game_id, game_title, started_at, last_heartbeat')
      .gte('last_heartbeat', cutoff);

    if (friendsOnly) {
      const friendIds = await getAcceptedFriendIds(viewerId);
      if (!friendIds.length) return [];
      query = query.in('user_id', friendIds);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingRelation(error)) return [];
      throw error;
    }

    const ids = (data || []).map((r) => r.user_id);
    if (!ids.length) return [];

    const { data: profiles } = await supabaseAdminClient
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', ids);

    const byId = new Map((profiles || []).map((p) => [p.id, p]));
    return (data || []).map((row) => {
      const p = byId.get(row.user_id);
      return {
        id: row.user_id,
        name: p?.full_name || 'Player',
        username: p?.username || 'user',
        avatar: p?.avatar_url || null,
        gameId: row.game_id,
        gameTitle: row.game_title || resolveGameTitle(row.game_id),
        startedAt: row.started_at,
        status: 'playing' as const,
      };
    });
  }

  static async createChallenge(params: {
    challengerId: string;
    opponentId: string;
    gameId: string;
    stake: number;
    gameTitle?: string;
    matchType?: 'friendly' | 'ranked' | 'tournament';
    tournamentId?: string;
  }) {
    const supabaseAdminClient = requireSupabaseAdmin();
    const { challengerId, opponentId, gameId, stake } = params;
    if (challengerId === opponentId) throw Object.assign(new Error('Cannot challenge yourself'), { status: 400 });
    if (!Number.isFinite(stake) || stake < 1) throw Object.assign(new Error('Invalid stake'), { status: 400 });

    const balance = await getBalance(challengerId);
    if (balance < stake) {
      throw Object.assign(new Error('Insufficient Purga Points for this stake'), {
        status: 400,
        code: 'INSUFFICIENT_BALANCE',
        balance,
        stake,
      });
    }

    // Expire stale pending invites between the same pair (ignore if table missing)
    {
      const { error: expireErr } = await supabaseAdminClient
        .from('game_challenges')
        .update({ status: 'expired' })
        .eq('challenger_id', challengerId)
        .eq('opponent_id', opponentId)
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString());
      if (expireErr && isMissingRelation(expireErr)) throw challengeDbError(expireErr);
    }

    const seasonId = await getActiveSeasonId();
    const title = resolveGameTitle(gameId, params.gameTitle);
    const basePayload: Record<string, unknown> = {
      challenger_id: challengerId,
      opponent_id: opponentId,
      game_id: gameId,
      game_title: title,
      stake,
      status: 'pending',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    const richPayload: Record<string, unknown> = {
      ...basePayload,
      match_type: params.matchType || 'friendly',
      tournament_id: params.tournamentId || null,
      ...(seasonId ? { season_id: seasonId } : {}),
    };

    let { data, error } = await supabaseAdminClient
      .from('game_challenges')
      .insert(richPayload)
      .select('*')
      .single();

    if (
      error &&
      (isMissingColumn(error) ||
        isFkViolation(error) ||
        /match_type|season|tournament|expires_at/i.test(String(error.message || '')))
    ) {
      const retryPayload = { ...basePayload };
      if (isMissingColumn(error) && /expires_at/i.test(String(error.message || ''))) {
        delete retryPayload.expires_at;
      }
      const retry = await supabaseAdminClient.from('game_challenges').insert(retryPayload).select('*').single();
      data = retry.data;
      error = retry.error;
    }

    // Last resort: absolute minimum columns
    if (error && (isMissingColumn(error) || isFkViolation(error))) {
      const minimal = {
        challenger_id: challengerId,
        opponent_id: opponentId,
        game_id: gameId,
        game_title: title,
        stake,
        status: 'pending',
      };
      const retry = await supabaseAdminClient.from('game_challenges').insert(minimal).select('*').single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('create challenge db:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw challengeDbError(error);
    }

    await NotificationService.challenge(challengerId, opponentId, gameId, {
      stake,
      challengeId: data.id,
      gameTitle: title,
    }).catch(() => null);

    await gameNotify({
      userId: opponentId,
      type: 'challenge_received',
      title: 'Challenge received',
      body: `You were challenged to ${title} for ${stake} points`,
      challengeId: data.id,
      metadata: { stake, gameId },
    });

    await auditLog({
      action: 'challenge_created',
      actorId: challengerId,
      challengeId: data.id,
      metadata: { opponentId, stake, gameId, matchType: params.matchType || 'friendly' },
    });

    emitChallenge([opponentId], 'challenge_received', { challenge: data });
    emitChallenge([challengerId], 'challenge_sent', { challenge: data });

    return data;
  }

  static async decline(challengeId: string, userId: string) {
    const supabaseAdminClient = requireSupabaseAdmin();
    const challenge = await this.getChallenge(challengeId);
    if (challenge.opponent_id !== userId) throw Object.assign(new Error('Only opponent can decline'), { status: 403 });
    if (challenge.status !== 'pending') throw Object.assign(new Error('Challenge is not pending'), { status: 400 });

    const { data, error } = await supabaseAdminClient
      .from('game_challenges')
      .update({ status: 'declined' })
      .eq('id', challengeId)
      .select('*')
      .single();
    if (error) throw error;

    await auditLog({
      action: 'challenge_declined',
      actorId: userId,
      challengeId,
    });
    await gameNotify({
      userId: challenge.challenger_id,
      type: 'challenge_declined',
      title: 'Challenge declined',
      body: 'Your challenge was declined',
      challengeId,
    });

    emitChallenge([challenge.challenger_id, challenge.opponent_id], 'challenge_declined', {
      challengeId,
      challenge: data,
    });
    return data;
  }

  static async cancel(challengeId: string, userId: string) {
    const supabaseAdminClient = requireSupabaseAdmin();
    const challenge = await this.getChallenge(challengeId);
    if (challenge.challenger_id !== userId) throw Object.assign(new Error('Only challenger can cancel'), { status: 403 });
    if (challenge.status !== 'pending') throw Object.assign(new Error('Challenge is not pending'), { status: 400 });

    const { data, error } = await supabaseAdminClient
      .from('game_challenges')
      .update({ status: 'cancelled' })
      .eq('id', challengeId)
      .select('*')
      .single();
    if (error) throw error;

    await auditLog({ action: 'challenge_cancelled', actorId: userId, challengeId });

    emitChallenge([challenge.challenger_id, challenge.opponent_id], 'challenge_declined', {
      challengeId,
      challenge: data,
      cancelled: true,
    });
    return data;
  }

  static async accept(challengeId: string, userId: string) {
    const supabaseAdminClient = requireSupabaseAdmin();
    const challenge = await this.getChallenge(challengeId);
    if (challenge.opponent_id !== userId) throw Object.assign(new Error('Only opponent can accept'), { status: 403 });
    if (challenge.status !== 'pending') throw Object.assign(new Error('Challenge is not pending'), { status: 400 });
    if (challenge.expires_at && new Date(challenge.expires_at) < new Date()) {
      await supabaseAdminClient.from('game_challenges').update({ status: 'expired' }).eq('id', challengeId);
      throw Object.assign(new Error('Challenge expired'), { status: 400 });
    }

    const [balChallenger, balOpponent] = await Promise.all([
      getBalance(challenge.challenger_id),
      getBalance(challenge.opponent_id),
    ]);
    if (balChallenger < challenge.stake || balOpponent < challenge.stake) {
      throw Object.assign(new Error('One or both players lack enough Purga Points'), {
        status: 400,
        code: 'INSUFFICIENT_BALANCE',
      });
    }

    // Lock stakes (server escrow)
    const d1 = await CreditService.deductCredits(
      challenge.challenger_id,
      challenge.stake,
      'GAME_CHALLENGE',
      `Stake locked for challenge ${challengeId}`
    );
    if (!d1.success) throw Object.assign(new Error('Failed to lock challenger stake'), { status: 400 });

    const d2 = await CreditService.deductCredits(
      challenge.opponent_id,
      challenge.stake,
      'GAME_CHALLENGE',
      `Stake locked for challenge ${challengeId}`
    );
    if (!d2.success) {
      // Refund challenger
      await CreditService.awardCredits(
        challenge.challenger_id,
        challenge.stake,
        'GAME_CHALLENGE',
        `Stake refund (opponent lock failed) ${challengeId}`
      );
      throw Object.assign(new Error('Failed to lock opponent stake'), { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdminClient
      .from('game_challenges')
      .update({
        status: 'playing',
        stakes_locked: true,
        accepted_at: now,
        started_at: now,
      })
      .eq('id', challengeId)
      .select('*')
      .single();
    if (error) throw error;

    // Challenge ≠ Session — session starts when play actually begins
    const { randomBytes } = await import('crypto');
    const { data: session } = await supabaseAdminClient
      .from('game_sessions')
      .insert({
        game_id: challenge.game_id,
        challenge_id: challengeId,
        status: 'active',
        server_seed: randomBytes(16).toString('hex'),
        started_at: now,
      })
      .select('id')
      .maybeSingle();

    await auditLog({
      action: 'challenge_accepted',
      actorId: userId,
      challengeId,
      sessionId: session?.id,
      metadata: { stake: challenge.stake },
    });
    await auditLog({
      action: 'points_transferred',
      actorId: userId,
      challengeId,
      metadata: { kind: 'stake_lock', amount: challenge.stake },
    });

    await gameNotify({
      userId: challenge.challenger_id,
      type: 'challenge_accepted',
      title: 'Challenge accepted',
      body: 'Your challenge was accepted — stakes locked',
      challengeId,
    });

    emitChallenge([challenge.challenger_id, challenge.opponent_id], 'challenge_accepted', {
      challenge: data,
      sessionId: session?.id,
    });
    emitChallenge([challenge.challenger_id, challenge.opponent_id], 'challenge_started', {
      challenge: data,
      sessionId: session?.id,
    });

    return { ...data, session_id: session?.id };
  }

  /** Submit own score; auto-resolves when both scores present. */
  static async submitScore(challengeId: string, userId: string, score: number) {
    const supabaseAdminClient = requireSupabaseAdmin();
    const challenge = await this.getChallenge(challengeId);
    if (![challenge.challenger_id, challenge.opponent_id].includes(userId)) {
      throw Object.assign(new Error('Not a participant'), { status: 403 });
    }
    if (!['accepted', 'starting', 'playing'].includes(challenge.status)) {
      throw Object.assign(new Error('Challenge not in play'), { status: 400 });
    }
    if (!Number.isFinite(score) || score < 0) {
      throw Object.assign(new Error('Invalid score'), { status: 400 });
    }

    const field = userId === challenge.challenger_id ? 'challenger_score' : 'opponent_score';
    if (challenge[field] != null) {
      throw Object.assign(new Error('Score already submitted'), { status: 400 });
    }

    const { data: updated, error } = await supabaseAdminClient
      .from('game_challenges')
      .update({ [field]: Math.floor(score), status: 'playing' })
      .eq('id', challengeId)
      .select('*')
      .single();
    if (error) throw error;

    if (updated.challenger_score != null && updated.opponent_score != null) {
      return this.resolveChallenge(updated);
    }
    return updated;
  }

  /** Explicit finish by declaring winner (both must agree via same winnerId, or admin-style when both scores set). */
  static async finish(challengeId: string, userId: string, winnerId: string) {
    const supabaseAdminClient = requireSupabaseAdmin();
    const challenge = await this.getChallenge(challengeId);
    if (![challenge.challenger_id, challenge.opponent_id].includes(userId)) {
      throw Object.assign(new Error('Not a participant'), { status: 403 });
    }
    if (![challenge.challenger_id, challenge.opponent_id].includes(winnerId)) {
      throw Object.assign(new Error('Winner must be a participant'), { status: 400 });
    }
    if (challenge.reward_distributed || challenge.status === 'finished') {
      throw Object.assign(new Error('Challenge already finished'), { status: 400 });
    }
    if (!challenge.stakes_locked) {
      throw Object.assign(new Error('Stakes not locked'), { status: 400 });
    }

    return this.resolveChallenge({ ...challenge, winner_id: winnerId });
  }

  private static async resolveChallenge(challenge: any) {
    const supabaseAdminClient = requireSupabaseAdmin();
    if (challenge.reward_distributed) return challenge;

    let winnerId = challenge.winner_id as string | null;
    if (!winnerId && challenge.challenger_score != null && challenge.opponent_score != null) {
      if (challenge.challenger_score > challenge.opponent_score) winnerId = challenge.challenger_id;
      else if (challenge.opponent_score > challenge.challenger_score) winnerId = challenge.opponent_id;
      else {
        // Draw: refund both
        return this.refundDraw(challenge);
      }
    }
    if (!winnerId) throw Object.assign(new Error('Winner could not be determined'), { status: 400 });

    const loserId =
      winnerId === challenge.challenger_id ? challenge.opponent_id : challenge.challenger_id;
    const pot = challenge.stake * 2;

    // Idempotency guard
    const { data: locked, error: lockErr } = await supabaseAdminClient
      .from('game_challenges')
      .update({
        status: 'finished',
        winner_id: winnerId,
        reward_distributed: true,
        finished_at: new Date().toISOString(),
      })
      .eq('id', challenge.id)
      .eq('reward_distributed', false)
      .select('*')
      .single();

    if (lockErr || !locked) {
      // Already resolved
      return this.getChallenge(challenge.id);
    }

    const award = await CreditService.awardCredits(
      winnerId,
      pot,
      'GAME_CHALLENGE',
      `Won challenge ${challenge.id} (+${challenge.stake} net)`
    );
    if (!award.success) {
      console.error('Failed to award challenge pot', challenge.id);
    }

    const duration =
      locked.started_at
        ? Math.max(0, Math.floor((Date.now() - new Date(locked.started_at).getTime()) / 1000))
        : null;

    const seasonId = locked.season_id || (await getActiveSeasonId()) || DEFAULT_SEASON_ID;

    // Close session if any
    const { data: session } = await supabaseAdminClient
      .from('game_sessions')
      .update({
        status: 'finished',
        ended_at: new Date().toISOString(),
        winner_id: winnerId,
        loser_id: loserId,
        ended_reason: 'victory',
      })
      .eq('challenge_id', challenge.id)
      .eq('status', 'active')
      .select('id')
      .maybeSingle();

    await supabaseAdminClient.from('game_challenge_results').upsert(
      {
        challenge_id: challenge.id,
        session_id: session?.id || null,
        winner_id: winnerId,
        loser_id: loserId,
        stake: challenge.stake,
        points_won: challenge.stake,
        points_lost: challenge.stake,
        challenger_score: locked.challenger_score,
        opponent_score: locked.opponent_score,
        duration_seconds: duration,
        validated: true,
        validation_source: 'SERVER',
      },
      { onConflict: 'challenge_id' }
    );

    // Elo (ranked + friendly both update for now; tournaments can branch later)
    const [{ data: wr }, { data: lr }] = await Promise.all([
      supabaseAdminClient
        .from('game_rankings')
        .select('elo_rating')
        .eq('user_id', winnerId)
        .eq('season_id', seasonId)
        .maybeSingle(),
      supabaseAdminClient
        .from('game_rankings')
        .select('elo_rating')
        .eq('user_id', loserId)
        .eq('season_id', seasonId)
        .maybeSingle(),
    ]);
    let eloW = wr?.elo_rating ?? 1000;
    let eloL = lr?.elo_rating ?? 1000;
    // Fallback without season filter
    if (!wr) {
      const { data: w2 } = await supabaseAdminClient
        .from('game_rankings')
        .select('elo_rating')
        .eq('user_id', winnerId)
        .maybeSingle();
      eloW = w2?.elo_rating ?? 1000;
    }
    if (!lr) {
      const { data: l2 } = await supabaseAdminClient
        .from('game_rankings')
        .select('elo_rating')
        .eq('user_id', loserId)
        .maybeSingle();
      eloL = l2?.elo_rating ?? 1000;
    }
    const expW = eloExpected(eloW, eloL);
    const expL = eloExpected(eloL, eloW);
    const newEloW = eloUpdate(eloW, expW, 1);
    const newEloL = eloUpdate(eloL, expL, 0);

    const now = new Date().toISOString();
    await supabaseAdminClient.from('game_match_history').insert([
      {
        challenge_id: challenge.id,
        session_id: session?.id || null,
        user_id: winnerId,
        opponent_id: loserId,
        game_id: challenge.game_id,
        game_title: challenge.game_title,
        match_type: challenge.match_type || 'friendly',
        result: 'win',
        stake: challenge.stake,
        points_delta: challenge.stake,
        score: winnerId === challenge.challenger_id ? locked.challenger_score : locked.opponent_score,
        opponent_score:
          winnerId === challenge.challenger_id ? locked.opponent_score : locked.challenger_score,
        duration_seconds: duration,
        ended_reason: 'victory',
        elo_before: eloW,
        elo_after: newEloW,
        season_id: seasonId,
        played_at: now,
      },
      {
        challenge_id: challenge.id,
        session_id: session?.id || null,
        user_id: loserId,
        opponent_id: winnerId,
        game_id: challenge.game_id,
        game_title: challenge.game_title,
        match_type: challenge.match_type || 'friendly',
        result: 'loss',
        stake: challenge.stake,
        points_delta: -challenge.stake,
        score: loserId === challenge.challenger_id ? locked.challenger_score : locked.opponent_score,
        opponent_score:
          loserId === challenge.challenger_id ? locked.opponent_score : locked.challenger_score,
        duration_seconds: duration,
        ended_reason: 'victory',
        elo_before: eloL,
        elo_after: newEloL,
        season_id: seasonId,
        played_at: now,
      },
    ]);

    await Promise.all([
      upsertRanking(winnerId, { won: true, stake: challenge.stake, seasonId, newElo: newEloW }),
      upsertRanking(loserId, { won: false, stake: challenge.stake, seasonId, newElo: newEloL }),
    ]);

    await auditLog({
      action: 'reward_sent',
      actorId: winnerId,
      challengeId: challenge.id,
      sessionId: session?.id,
      metadata: { pot, stake: challenge.stake, validation_source: 'SERVER' },
    });

    await gameNotify({
      userId: winnerId,
      type: 'victory',
      title: 'Victory',
      body: `You won ${challenge.stake} points`,
      challengeId: challenge.id,
    });
    await gameNotify({
      userId: loserId,
      type: 'defeat',
      title: 'Defeat',
      body: `You lost ${challenge.stake} points`,
      challengeId: challenge.id,
    });

    const loserBalance = await getBalance(loserId);
    await handleBankruptcy(loserId, loserBalance, challenge.id);

    emitChallenge([challenge.challenger_id, challenge.opponent_id], 'challenge_finished', {
      challenge: locked,
      winnerId,
      loserId,
      pot,
      sessionId: session?.id,
    });
    emitChallenge([winnerId], 'challenge_reward', {
      challengeId: challenge.id,
      amount: challenge.stake,
      newBalance: award.newBalance,
    });
    emitChallenge([challenge.challenger_id, challenge.opponent_id], 'leaderboard_updated', {});

    return locked;
  }

  private static async refundDraw(challenge: any) {
    const supabaseAdminClient = requireSupabaseAdmin();
    const { data: locked } = await supabaseAdminClient
      .from('game_challenges')
      .update({
        status: 'finished',
        reward_distributed: true,
        finished_at: new Date().toISOString(),
      })
      .eq('id', challenge.id)
      .eq('reward_distributed', false)
      .select('*')
      .single();

    if (!locked) return this.getChallenge(challenge.id);

    await CreditService.awardCredits(
      challenge.challenger_id,
      challenge.stake,
      'GAME_CHALLENGE',
      `Draw refund ${challenge.id}`
    );
    await CreditService.awardCredits(
      challenge.opponent_id,
      challenge.stake,
      'GAME_CHALLENGE',
      `Draw refund ${challenge.id}`
    );

    emitChallenge([challenge.challenger_id, challenge.opponent_id], 'challenge_finished', {
      challenge: locked,
      draw: true,
    });
    return locked;
  }

  static async getChallenge(id: string) {
    const supabaseAdminClient = requireSupabaseAdmin();
    const { data, error } = await supabaseAdminClient.from('game_challenges').select('*').eq('id', id).single();
    if (error || !data) throw Object.assign(new Error('Challenge not found'), { status: 404 });
    return data;
  }

  static async listChallenges(userId: string, status?: string) {
    const supabaseAdminClient = requireSupabaseAdmin();
    let q = supabaseAdminClient
      .from('game_challenges')
      .select('*')
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(100);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) {
      if (isMissingRelation(error)) return [];
      throw error;
    }
    return data || [];
  }

  static async history(userId: string, range: 'today' | 'week' | 'month' | 'all' = 'all') {
    const supabaseAdminClient = requireSupabaseAdmin();
    let since: string | null = null;
    const now = new Date();
    if (range === 'today') {
      since = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    } else if (range === 'week') {
      since = new Date(Date.now() - 7 * 86400000).toISOString();
    } else if (range === 'month') {
      since = new Date(Date.now() - 30 * 86400000).toISOString();
    }

    let q = supabaseAdminClient
      .from('game_match_history')
      .select('*')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(100);
    if (since) q = q.gte('played_at', since);

    const { data, error } = await q;
    if (error) {
      if (isMissingRelation(error)) return [];
      throw error;
    }
    return data || [];
  }

  static async leaderboard(limit = 20) {
    const supabaseAdminClient = requireSupabaseAdmin();
    const seasonId = await getActiveSeasonId();
    let { data, error } = await supabaseAdminClient
      .from('game_rankings')
      .select('*, profiles:user_id(id, full_name, username, avatar_url)')
      .eq('season_id', seasonId)
      .order('elo_rating', { ascending: false })
      .order('wins', { ascending: false })
      .limit(limit);

    if (error) {
      // Fallback without season / elo columns
      const fallback = await supabaseAdminClient
        .from('game_rankings')
        .select('*, profiles:user_id(id, full_name, username, avatar_url)')
        .order('wins', { ascending: false })
        .order('total_points_won', { ascending: false })
        .limit(limit);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      if (isMissingRelation(error)) return [];
      throw error;
    }

    return (data || []).map((row: any) => {
      const played = (row.wins || 0) + (row.losses || 0);
      const wins = row.wins || 0;
      const totalPointsWon = row.total_points_won || 0;
      const elo = row.elo_rating ?? 1000;
      return {
        userId: row.user_id,
        name: row.profiles?.full_name || 'Player',
        username: row.profiles?.username || 'user',
        avatar: row.profiles?.avatar_url || null,
        wins,
        losses: row.losses || 0,
        challengesCompleted: played,
        winRate: played > 0 ? Math.round((wins / played) * 1000) / 10 : 0,
        currentStreak: row.current_streak || 0,
        bestStreak: row.best_streak || 0,
        totalPointsWon,
        biggestWin: row.biggest_win || 0,
        elo,
        rank: challengeRankFromStats(wins, totalPointsWon, elo),
        seasonId: row.season_id || seasonId,
      };
    });
  }

  static async liveFeed(limit = 20) {
    const supabaseAdminClient = requireSupabaseAdmin();
    const { data, error } = await supabaseAdminClient
      .from('game_challenge_results')
      .select(
        '*, challenge:challenge_id(game_id, game_title, stake), winner:winner_id(full_name, username), loser:loser_id(full_name, username)'
      )
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      if (isMissingRelation(error)) return [];
      throw error;
    }
    return (data || []).map((r: any) => ({
      id: r.id,
      winnerName: r.winner?.full_name || r.winner?.username || 'Winner',
      loserName: r.loser?.full_name || r.loser?.username || 'Loser',
      gameTitle: r.challenge?.game_title || 'Game',
      stake: r.stake,
      pointsWon: r.points_won,
      createdAt: r.created_at,
    }));
  }
}
