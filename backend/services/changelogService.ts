import { QueryTypes } from 'sequelize';
import sequelize from '../config/database';
import { wsManager } from '../websocketManager';

export type ChangelogKind = 'added' | 'fixed' | 'changed' | 'improved';

export interface ChangelogEntry {
  id: string;
  kind: ChangelogKind;
  version: string | null;
  title: string;
  message: string | null;
  route: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreateEntryParams {
  title: string;
  message?: string;
  kind?: ChangelogKind;
  route?: string;
  version?: string;
  createdBy?: string;
}

const VALID_KINDS: ChangelogKind[] = ['added', 'fixed', 'changed', 'improved'];

/**
 * ChangelogService
 *
 * Every app change/fix is stored as a `changelog_entries` row (local PostgreSQL)
 * and fanned out as a `changelog` notification to every user. The notification
 * stays in the user's list until they click it — clicking dismisses (deletes)
 * it and takes them to `route` (or /whats-new) so they can test the change.
 */
export class ChangelogService {
  /** Create a changelog entry and notify all users about it. */
  static async createEntry(params: CreateEntryParams): Promise<{ entry: ChangelogEntry; notified: number }> {
    const kind: ChangelogKind = VALID_KINDS.includes(params.kind as ChangelogKind)
      ? (params.kind as ChangelogKind)
      : 'changed';

    const title = (params.title || '').trim();
    if (!title) {
      throw new Error('Changelog entry requires a title');
    }

    const [rows] = await sequelize.query(
      `INSERT INTO changelog_entries (kind, version, title, message, route, created_by)
       VALUES (:kind, :version, :title, :message, :route, :createdBy)
       RETURNING *`,
      {
        replacements: {
          kind,
          version: params.version || null,
          title: title.slice(0, 200),
          message: (params.message || '').trim() || null,
          route: (params.route || '').trim() || null,
          createdBy: params.createdBy || null,
        },
        type: QueryTypes.INSERT,
      }
    ) as unknown as [ChangelogEntry[], unknown];

    const entry = rows[0];
    const notified = await this.fanOutNotification(entry);
    return { entry, notified };
  }

  /** Insert one `changelog` notification per user + push it live to online users. */
  private static async fanOutNotification(entry: ChangelogEntry): Promise<number> {
    const metadata = JSON.stringify({
      changelogId: entry.id,
      kind: entry.kind,
      route: entry.route,
      version: entry.version,
    });

    // One set-based insert for every user — no per-user round trips
    const [inserted] = await sequelize.query(
      `INSERT INTO notifications
         (id, receiver_id, sender_id, type, title, message, read, is_read, metadata, created_at, updated_at)
       SELECT gen_random_uuid(), u.id, NULL, 'changelog', :title, :message, false, false,
              CAST(:metadata AS jsonb), NOW(), NOW()
       FROM users u
       RETURNING id, receiver_id`,
      {
        replacements: {
          title: entry.title,
          message: entry.message || '',
          metadata,
        },
        type: QueryTypes.INSERT,
      }
    ) as unknown as [{ id: string; receiver_id: string }[], unknown];

    // Real-time push for users currently connected (sender-less notification)
    for (const row of inserted || []) {
      if (!wsManager.isUserOnline(row.receiver_id)) continue;
      wsManager.sendNotification(row.receiver_id, {
        id: row.id,
        type: 'changelog',
        fromUser: { id: '', name: 'Puurga', username: 'puurga', avatar: '' },
        data: {
          changelogId: entry.id,
          kind: entry.kind,
          route: entry.route,
          version: entry.version,
        },
        title: entry.title,
        message: entry.message || '',
        createdAt: entry.created_at,
      } as any);
    }

    return inserted?.length || 0;
  }

  /** Latest changelog entries (newest first). */
  static async listEntries(limit = 50): Promise<ChangelogEntry[]> {
    try {
      return await sequelize.query(
        `SELECT * FROM changelog_entries ORDER BY created_at DESC LIMIT :limit`,
        { replacements: { limit: Math.min(limit, 200) }, type: QueryTypes.SELECT }
      ) as ChangelogEntry[];
    } catch (error: any) {
      // Table not migrated yet — degrade gracefully
      if (error?.original?.code === '42P01' || /relation .* does not exist/i.test(error?.message || '')) {
        return [];
      }
      throw error;
    }
  }

  /** Delete an entry and the notifications pointing at it (admin cleanup). */
  static async deleteEntry(entryId: string): Promise<void> {
    await sequelize.query(
      `DELETE FROM notifications WHERE type = 'changelog' AND metadata->>'changelogId' = :id`,
      { replacements: { id: entryId }, type: QueryTypes.DELETE }
    );
    await sequelize.query(
      `DELETE FROM changelog_entries WHERE id = :id`,
      { replacements: { id: entryId }, type: QueryTypes.DELETE }
    );
  }
}

export default ChangelogService;
