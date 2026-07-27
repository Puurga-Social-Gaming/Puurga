/** Local fallback trash when `message_trash` table is not migrated yet. */

export interface LocalTrashItem {
  id: string;
  message_id: string;
  conversation_id: string;
  content: string | null;
  images: string[];
  created_at: string | null;
  deleted_at: string;
  scope: 'me' | 'everyone';
  from_user_id?: string | null;
  from_user?: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string;
  } | null;
  is_from_current_user?: boolean;
}

function storageKey(userId: string) {
  return `puurga_message_trash_${userId}`;
}

export function readLocalTrash(userId: string): LocalTrashItem[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalTrash(userId: string, items: LocalTrashItem[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(items.slice(0, 100)));
  } catch {
    // ignore
  }
}

export function addLocalTrashItem(
  userId: string,
  item: Omit<LocalTrashItem, 'id'> & { id?: string }
): LocalTrashItem {
  const items = readLocalTrash(userId).filter((t) => t.message_id !== item.message_id);
  const row: LocalTrashItem = {
    id: item.id || `local-${item.message_id}`,
    message_id: item.message_id,
    conversation_id: item.conversation_id,
    content: item.content,
    images: item.images || [],
    created_at: item.created_at,
    deleted_at: item.deleted_at,
    scope: item.scope,
    from_user_id: item.from_user_id,
    from_user: item.from_user,
    is_from_current_user: item.is_from_current_user,
  };
  items.unshift(row);
  writeLocalTrash(userId, items);
  return row;
}

export function removeLocalTrashItem(userId: string, trashId: string) {
  writeLocalTrash(
    userId,
    readLocalTrash(userId).filter((t) => t.id !== trashId)
  );
}

export function getLocalHiddenMessageIds(userId: string, conversationId?: string): Set<string> {
  const items = readLocalTrash(userId);
  return new Set(
    items
      .filter((t) => !conversationId || t.conversation_id === conversationId)
      .map((t) => t.message_id)
  );
}
