import { supabase } from '../config/supabase';

/**
 * Resolve friend IDs across both historical schemas:
 * - user_id_1 / user_id_2  (most routes)
 * - user_id / friend_id    (create_friends_tables.sql, auth.ts)
 * Also treats accepted friend_requests as friendships when the friends row is missing.
 */
export async function getAcceptedFriendIds(userId: string): Promise<string[]> {
  const ids = new Set<string>();

  // Schema A: user_id_1 / user_id_2
  const { data: rowsA, error: errA } = await supabase
    .from('friends')
    .select('user_id_1, user_id_2')
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

  if (!errA && rowsA) {
    for (const f of rowsA) {
      const other = f.user_id_1 === userId ? f.user_id_2 : f.user_id_1;
      if (other && other !== userId) ids.add(other);
    }
  } else if (errA && errA.code !== '42P01' && errA.code !== '42703') {
    console.warn('getAcceptedFriendIds schemaA:', errA.message);
  }

  // Schema B: user_id / friend_id — always try (merge), in case rows live under this layout
  const { data: rowsB, error: errB } = await supabase
    .from('friends')
    .select('user_id, friend_id')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  if (!errB && rowsB) {
    for (const f of rowsB) {
      const other = f.user_id === userId ? f.friend_id : f.user_id;
      if (other && other !== userId) ids.add(other);
    }
  } else if (errB && errB.code !== '42P01' && errB.code !== '42703') {
    console.warn('getAcceptedFriendIds schemaB:', errB.message);
  }

  // Table C: friendships (used by statuses / auth login notifications)
  const { data: rowsC, error: errC } = await supabase
    .from('friendships')
    .select('user_id, friend_id, status')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  if (!errC && rowsC) {
    for (const f of rowsC) {
      if (f.status && f.status !== 'accepted') continue;
      const other = f.user_id === userId ? f.friend_id : f.user_id;
      if (other && other !== userId) ids.add(other);
    }
  } else if (errC && errC.code !== '42P01' && errC.code !== '42703') {
    console.warn('getAcceptedFriendIds friendships:', errC.message);
  }

  // Fallback: accepted friend_requests (covers cases where friends insert failed)
  const { data: accepted, error: accErr } = await supabase
    .from('friend_requests')
    .select('sender_id, receiver_id')
    .eq('status', 'accepted')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (!accErr && accepted) {
    for (const r of accepted) {
      const other = r.sender_id === userId ? r.receiver_id : r.sender_id;
      if (other && other !== userId) ids.add(other);
    }
  } else if (accErr && accErr.code !== '42P01' && accErr.code !== '42703') {
    console.warn('getAcceptedFriendIds acceptedRequests:', accErr.message);
  }

  return Array.from(ids);
}

/** People I already sent a friend request to (still pending — can message them). */
export async function getPendingOutgoingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('receiver_id, status')
    .eq('sender_id', userId);

  if (error) {
    if (error.code !== '42P01' && error.code !== '42703') {
      console.warn('getPendingOutgoingIds:', error.message);
    }
    return [];
  }

  return (data || [])
    .filter((r: any) => !r.status || r.status === 'pending')
    .map((r: any) => r.receiver_id as string)
    .filter((id: string) => id && id !== userId);
}

/** True if users are friends under either schema (or accepted request). */
export async function areFriends(a: string, b: string): Promise<boolean> {
  const friends = await getAcceptedFriendIds(a);
  return friends.includes(b);
}

/** True if either user has blocked the other. */
export async function areBlocked(a: string, b: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('id')
    .or(
      `and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`
    )
    .limit(1);

  if (error) {
    if (error.code !== '42P01' && error.code !== '42703') {
      console.warn('areBlocked:', error.message);
    }
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** True if muter has muted mutedUser. */
export async function isMuted(muterId: string, mutedUserId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_mutes')
    .select('id')
    .eq('muter_id', muterId)
    .eq('muted_id', mutedUserId)
    .maybeSingle();

  if (error) {
    if (error.code !== '42P01' && error.code !== '42703') {
      console.warn('isMuted:', error.message);
    }
    return false;
  }
  return !!data;
}

export async function getBlockedIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', userId);

  if (error) {
    if (error.code !== '42P01' && error.code !== '42703') {
      console.warn('getBlockedIds:', error.message);
    }
    return [];
  }
  return (data || []).map((r) => r.blocked_id as string);
}

/** IDs of users blocked in either direction (I blocked them OR they blocked me). */
export async function getBidirectionalBlockedIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

  if (error) {
    if (error.code !== '42P01' && error.code !== '42703') {
      console.warn('getBidirectionalBlockedIds:', error.message);
    }
    return [];
  }

  const ids = new Set<string>();
  for (const row of data || []) {
    const other = row.blocker_id === userId ? row.blocked_id : row.blocker_id;
    if (other && other !== userId) ids.add(other);
  }
  return Array.from(ids);
}

export async function getMutedIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_mutes')
    .select('muted_id')
    .eq('muter_id', userId);

  if (error) {
    if (error.code !== '42P01' && error.code !== '42703') {
      console.warn('getMutedIds:', error.message);
    }
    return [];
  }
  return (data || []).map((r) => r.muted_id as string);
}

/** Remove friendship rows between two users (best-effort across schemas). */
export async function removeFriendship(a: string, b: string): Promise<void> {
  await supabase.from('friends').delete().or(
    `and(user_id_1.eq.${a},user_id_2.eq.${b}),and(user_id_1.eq.${b},user_id_2.eq.${a})`
  );
  await supabase.from('friends').delete().or(
    `and(user_id.eq.${a},friend_id.eq.${b}),and(user_id.eq.${b},friend_id.eq.${a})`
  );
  await supabase.from('friendships').delete().or(
    `and(user_id.eq.${a},friend_id.eq.${b}),and(user_id.eq.${b},friend_id.eq.${a})`
  );
  await supabase
    .from('friend_requests')
    .delete()
    .or(
      `and(sender_id.eq.${a},receiver_id.eq.${b}),and(sender_id.eq.${b},receiver_id.eq.${a})`
    );
  await removeMutualFollows(a, b);
}

/** When A and B become friends, both follow each other. */
export async function syncMutualFollows(a: string, b: string): Promise<void> {
  const now = new Date().toISOString();
  const rows = [
    { follower_id: a, following_id: b, created_at: now },
    { follower_id: b, following_id: a, created_at: now },
  ];
  const { error } = await supabase.from('followers').upsert(rows, {
    onConflict: 'follower_id,following_id',
    ignoreDuplicates: true,
  });
  if (error && error.code !== '42P01' && error.code !== '42703') {
    console.warn('syncMutualFollows:', error.message);
  }
}

/** Remove follow edges both ways. */
export async function removeMutualFollows(a: string, b: string): Promise<void> {
  const { error } = await supabase
    .from('followers')
    .delete()
    .or(
      `and(follower_id.eq.${a},following_id.eq.${b}),and(follower_id.eq.${b},following_id.eq.${a})`
    );
  if (error && error.code !== '42P01' && error.code !== '42703') {
    console.warn('removeMutualFollows:', error.message);
  }
}
