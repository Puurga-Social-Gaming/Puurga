/**
 * Full account deletion service.
 *
 * Google Play requires that when a user deletes their account, their data is
 * deleted or de-identified. This performs a thorough wipe:
 *
 *   1. Content they own (posts, comments, statuses, reactions, likes...)
 *   2. Social graph rows (friendships, requests, follows, blocks, mutes...)
 *   3. Messaging cleanup (their messages removed; participant rows removed)
 *   4. Platform data (notifications, settings, survival state, credits history,
 *      subscriptions, game sessions, reports they filed...)
 *   5. Finally: profile row + user row
 *
 * Tables are deleted with best-effort handling — an unknown table name (e.g.
 * from another install) is logged and skipped instead of aborting the wipe.
 * The core rows (posts/comments/friends/notifications/users/profiles) MUST
 * succeed or the deletion aborts and rolls back.
 */

import { QueryTypes, Transaction } from 'sequelize';
import sequelize from '../config/database';

interface DeletionResult {
  userId: string;
  remainingContactInfo: string;
  deletedTables: string[];
  skippedTables: string[];
}

// Tables that MUST exist and MUST delete cleanly — a failure aborts the wipe.
const REQUIRED_TABLES: string[] = [
  'posts',
  'comments',
  'friendships',
  'friend_requests',
  'notifications',
  'users',
  'profiles',
];

// Likes/reactions may not exist on every install (code has fallbacks), so they
// are cleared best-effort rather than aborting the deletion.
const CONTENT_GRAPH_TABLES: string[] = [
  'likes',
  'reactions',
];

// Optional tables — cleared when they exist, skipped silently when they don't.
const OPTIONAL_TABLES: string[] = [
  'followers',
  'blocks',
  'mutes',
  'user_settings',
  'user_survival_states',
  'user_survival_history',
  'purges',
  'post_purges',
  'purgatory_entries',
  'game_sessions',
  'game_stats',
  'game_scores',
  'user_achievements',
  'user_progression',
  'xp_events',
  'credit_transactions',
  'credit_ledger',
  'push_subscriptions',
  'push_subscriptions_users',
  'user_devices',
  'daily_missions',
  'daily_mission_progress',
  'user_challenges',
  'matchmaking_queue',
  'alliance_members',
  'alliances',
  'group_members',
  'groups_members',
  'group_messages',
  'conversation_participants',
  'conversations',
  'messages',
  'statuses',
  'status_views',
  'stories_views',
  'story_views',
  'statuses_views',
  'user_statuses',
  'certifications',
  'user_links',
  'password_reset_tokens',
  'user_auth_logs',
  'sessions',
  'refresh_tokens',
  'csp_reports_user',
];

async function getColumns(t: Transaction, table: string): Promise<Set<string>> {
  const cols = await sequelize.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = :table`,
    { transaction: t, replacements: { table }, type: QueryTypes.SELECT }
  );
  return new Set(cols.map((c) => c.column_name));
}

// Find the first existing column among plausible names for "who owns this row"
const OWNER_CANDIDATES = [
  'user_id', 'from_user_id', 'account_id', 'owner_id', 'author_id', 'sender_id', 'senderId',
  'member_id', 'viewer_id', 'receiver_id', 'recipient_id', 'blocked_user_id', 'muted_user_id', 'reporter_id', 'created_by',
];

function pickOwnerColumn(cols: Set<string>, extraFirst: string[] = []): string | null {
  for (const c of [...extraFirst, ...OWNER_CANDIDATES]) {
    if (cols.has(c)) return c;
  }
  return null;
}

async function deleteFromTable(
  t: Transaction,
  table: string,
  clause: string,
  userId: string,
  tolerant = false
) {
  const sql = `DELETE FROM ${table} ${clause}`;
  try {
    await sequelize.query(sql, { transaction: t, replacements: { userId } });
    return { ok: true, table };
  } catch (err: any) {
    // 42P01 = undefined_table, 42703 = undefined_column
    const code = err?.parent?.code || err?.original?.code;
    if (code === '42P01') {
      return { ok: false, table };
    }
    if ((code === '42703' || code === '22P02') && tolerant) {
      // Optional table exists but its columns differ on this install — skip it
      console.warn(`accountDeletion: skipped ${table} (column mismatch)`);
      return { ok: false, table };
    }
    throw err;
  }
}

export async function deleteUserAccount(userId: string): Promise<DeletionResult> {
  const deletedTables: string[] = [];
  const skippedTables: string[] = [];

  const t: Transaction = await sequelize.transaction();

  try {
    // Introspect the columns of every candidate table once (fails safely if absent)
    const knownTables: string[] = [
      'posts', 'comments', 'likes', 'reactions', 'statuses', 'friendships', 'friend_requests',
      'notifications', 'reports', 'profiles', 'users', 'messages', 'conversations',
      'conversation_participants', ...OPTIONAL_TABLES,
      'status_views', 'statuses_views', 'story_views', 'stories_views',
      'group_members', 'groups_members',
    ];
    const tableColumns = new Map<string, Set<string>>();
    for (const table of [...new Set(knownTables)]) {
      try {
        tableColumns.set(table, await getColumns(t, table));
      } catch {
        // table absent on this install
      }
    }

    // ── Gather owned content ids first (needed for targeted cleanup) ───────
    const postsCols = tableColumns.get('posts');
    const postsOwner = postsCols ? pickOwnerColumn(postsCols, ['user_id']) : null;
    const postIds = postsOwner
      ? (await sequelize.query<{ id: string }>(
          `SELECT id FROM posts WHERE ${postsOwner} = :userId`,
          { transaction: t, replacements: { userId }, type: QueryTypes.SELECT }
        )).map((p) => String(p.id))
      : [];

    const commentsCols = tableColumns.get('comments');
    const commentsOwner = commentsCols ? pickOwnerColumn(commentsCols, ['user_id', 'author_id']) : null;
    const commentIds = commentsOwner
      ? (await sequelize.query<{ id: string }>(
          `SELECT id FROM comments WHERE ${commentsOwner} = :userId`,
          { transaction: t, replacements: { userId }, type: QueryTypes.SELECT }
        )).map((c) => String(c.id))
      : [];

    const postIdsLiteral = postIds.length ? `('${postIds.join("','")}')` : "(NULL)";

    // ── 1. Content they interacted with / own ─────────────────────────────
    type Plan = [string, string | null, string];
    const plan: Plan[] = [
      // [table, ownerColumnOverride, extraIdClause]
      ['likes', null, ` OR post_id IN ${postIdsLiteral}`],
      ['reactions', null, ` OR post_id IN ${postIdsLiteral}`],
      ['comments', commentsOwner, ` OR post_id IN ${postIdsLiteral}`],
      ['posts', postsOwner, ''],
      ['statuses', null, ''],
      ['statuses', 'account_id', ''],
      ['friendships', null, ''],
      ['friend_requests', null, ''],
      ['notifications', null, ''],
      ['reports', null, ''],
      ['profiles', 'id', ''],
      ['users', 'id', ''],
    ];

    for (const [table, overrideCol, extraClause] of plan) {
      const cols = tableColumns.get(table);
      const owner = overrideCol
        ? (cols?.has(overrideCol) ? overrideCol : null)
        : (cols ? pickOwnerColumn(cols) : null);

      if (!owner) {
        if (REQUIRED_TABLES.includes(table)) {
          throw new Error(`Cannot determine owner column for required table "${table}"`);
        }
        skippedTables.push(table);
        continue;
      }

      const clause = `WHERE ${owner} = :userId${extraClause}`;
      const r = await deleteFromTable(t, table, clause, userId, !REQUIRED_TABLES.includes(table));
      if (r.ok) deletedTables.push(table);
      else if (REQUIRED_TABLES.includes(table)) {
        throw new Error(`Core table ${table} failed deletion`);
      } else skippedTables.push(table);
    }

    // ── 2. Optional / possibly-not-installed tables (owner column varies) ─
    for (const table of [...new Set(OPTIONAL_TABLES)]) {
      const cols = tableColumns.get(table);
      const owner = cols ? pickOwnerColumn(cols) : null;
      if (!owner) { skippedTables.push(table); continue; }
      const r = await deleteFromTable(t, table, `WHERE ${owner} = :userId`, userId, true);
      if (r.ok) deletedTables.push(table);
      else skippedTables.push(table);
    }

    // ── 3. Messaging: remove own messages, prune empty conversations ─────
    const messagesCols = tableColumns.get('messages');
    const msgOwner = messagesCols ? pickOwnerColumn(messagesCols, ['from_user_id', 'sender_id']) : null;
    if (msgOwner) {
      await deleteFromTable(t, 'messages', `WHERE ${msgOwner} = :userId`, userId, true);
      deletedTables.push('messages');
    }

    const convParticipantsCols = tableColumns.get('conversation_participants');
    const cpOwner = convParticipantsCols ? pickOwnerColumn(convParticipantsCols, ['user_id', 'member_id']) : null;
    if (cpOwner) {
      await sequelize.query(
        `DELETE FROM conversation_participants WHERE ${cpOwner} = :userId`,
        { transaction: t, replacements: { userId } }
      );
      deletedTables.push('conversation_participants');

      const convHasId = tableColumns.get('conversations')?.has('id');
      if (convHasId) {
        // delete conversations that now have zero participants
        await sequelize.query(
          `DELETE FROM conversations c
           WHERE NOT EXISTS (
             SELECT 1 FROM conversation_participants p WHERE p.conversation_id = c.id
           )`,
          { transaction: t }
        );
        deletedTables.push('conversations');
      }
    }

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  // Remaining trace (for Play compliance logs): a generic contact that no
  // longer resolves to any account row.
  return {
    userId,
    remainingContactInfo: '',
    deletedTables,
    skippedTables,
  };
}
