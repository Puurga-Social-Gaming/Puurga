import sequelize from '../config/database';
import { Friendship, FriendRequest, Follower, Op } from '../models';

/**
 * Friend / block / mute relations resolved against the LOCAL PostgreSQL database.
 * No Supabase dependency.
 */

/** Accepted friends across the friendships and (fallback) friend_requests tables. */
export async function getAcceptedFriendIds(userId: string): Promise<string[]> {
  const ids = new Set<string>();

  const friendships = await Friendship.findAll({
    where: {
      [Op.or]: [{ user_id: userId }, { friend_id: userId }],
    },
    attributes: ['user_id', 'friend_id'],
  });
  for (const f of friendships) {
    const other = f.user_id === userId ? f.friend_id : f.user_id;
    if (other && other !== userId) ids.add(other);
  }

  // Fallback: accepted friend_requests (covers cases where friendships insert failed)
  const accepted = await FriendRequest.findAll({
    where: {
      status: 'accepted',
      [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
    },
    attributes: ['sender_id', 'receiver_id'],
  });
  for (const r of accepted) {
    const other = r.sender_id === userId ? r.receiver_id : r.sender_id;
    if (other && other !== userId) ids.add(other);
  }

  return Array.from(ids);
}

/** People I already sent a friend request to (still pending — can message them). */
export async function getPendingOutgoingIds(userId: string): Promise<string[]> {
  const rows = await FriendRequest.findAll({
    where: { sender_id: userId, status: 'pending' },
    attributes: ['receiver_id'],
  });
  return rows
    .map((r) => r.receiver_id)
    .filter((id) => id && id !== userId);
}

/** True if users are friends (either schema / accepted request). */
export async function areFriends(a: string, b: string): Promise<boolean> {
  const friends = await getAcceptedFriendIds(a);
  return friends.includes(b);
}

/** True if either user has blocked the other. */
export async function areBlocked(a: string, b: string): Promise<boolean> {
  const [rows] = await sequelize.query(
    `SELECT id FROM user_blocks
     WHERE (blocker_id = :a AND blocked_id = :b)
        OR (blocker_id = :b AND blocked_id = :a)
     LIMIT 1`,
    { replacements: { a, b } }
  );
  return rows.length > 0;
}

/** True if muter has muted mutedUser. */
export async function isMuted(muterId: string, mutedUserId: string): Promise<boolean> {
  const [rows] = await sequelize.query(
    `SELECT id FROM user_mutes WHERE muter_id = :muterId AND muted_id = :mutedUserId LIMIT 1`,
    { replacements: { muterId, mutedUserId } }
  );
  return rows.length > 0;
}

/** IDs of users I have blocked. */
export async function getBlockedIds(userId: string): Promise<string[]> {
  const [rows] = await sequelize.query(
    `SELECT blocked_id FROM user_blocks WHERE blocker_id = :userId`,
    { replacements: { userId } }
  );
  return (rows as any[]).map((r) => r.blocked_id);
}

/** IDs of users blocked in either direction (I blocked them OR they blocked me). */
export async function getBidirectionalBlockedIds(userId: string): Promise<string[]> {
  const [rows] = await sequelize.query(
    `SELECT blocker_id, blocked_id FROM user_blocks
     WHERE blocker_id = :userId OR blocked_id = :userId`,
    { replacements: { userId } }
  );
  const ids = new Set<string>();
  for (const row of rows as any[]) {
    const other = row.blocker_id === userId ? row.blocked_id : row.blocker_id;
    if (other && other !== userId) ids.add(other);
  }
  return Array.from(ids);
}

/** IDs of users I have muted. */
export async function getMutedIds(userId: string): Promise<string[]> {
  const [rows] = await sequelize.query(
    `SELECT muted_id FROM user_mutes WHERE muter_id = :userId`,
    { replacements: { userId } }
  );
  return (rows as any[]).map((r) => r.muted_id);
}

/** Remove friendship rows between two users. */
export async function removeFriendship(a: string, b: string): Promise<void> {
  await Friendship.destroy({
    where: {
      [Op.or]: [
        { user_id: a, friend_id: b },
        { user_id: b, friend_id: a },
      ],
    },
  });
  await FriendRequest.destroy({
    where: {
      [Op.or]: [
        { sender_id: a, receiver_id: b },
        { sender_id: b, receiver_id: a },
      ],
    },
  });
  await removeMutualFollows(a, b);
}

/** When A and B become friends, both follow each other. */
export async function syncMutualFollows(a: string, b: string): Promise<void> {
  const [existingA] = await sequelize.query(
    `SELECT id FROM followers WHERE follower_id = :a AND following_id = :b`,
    { replacements: { a, b } }
  );
  if (existingA.length === 0) {
    await Follower.create({ follower_id: a, following_id: b } as any);
  }
  const [existingB] = await sequelize.query(
    `SELECT id FROM followers WHERE follower_id = :b AND following_id = :a`,
    { replacements: { a: b, b: a } }
  );
  if (existingB.length === 0) {
    await Follower.create({ follower_id: b, following_id: a } as any);
  }
}

/** Remove follow edges both ways. */
export async function removeMutualFollows(a: string, b: string): Promise<void> {
  await Follower.destroy({
    where: {
      [Op.or]: [
        { follower_id: a, following_id: b },
        { follower_id: b, following_id: a },
      ],
    },
  });
}
