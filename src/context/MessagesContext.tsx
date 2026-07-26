import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import api from '../lib/axios';
import { useWebSocket } from '../hooks/useWebSocket';
import toast from 'react-hot-toast';
import { useMessageNotification } from '../components/MessageNotificationPopup';
import { playMessageSound, unlockMessageSound } from '../utils/messageSound';
import {
  addLocalTrashItem,
  getLocalHiddenMessageIds,
  readLocalTrash,
  removeLocalTrashItem,
} from '../utils/localMessageTrash';
import {
  ensureE2EKeyPair,
  encryptMessage,
  decryptMessage,
  packCipher,
  unpackCipher,
} from '../utils/e2eCrypto';

export interface Message {
  id: string;
  content: string | null;
  from_user_id: string;
  is_from_current_user?: boolean;
  created_at: string;
  conversation_id?: string;
  images?: string[];
  read?: boolean;
  read_at?: string | null;
  is_edited?: boolean;
  edited_at?: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  is_encrypted?: boolean;
  ciphertext?: string | null;
  decrypt_failed?: boolean;
  language?: string;
  translated_content?: string | null;
  translated_language?: string | null;
  reactions?: Record<string, { count: number; reacted_by_me: boolean }>;
  from_user: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface Conversation {
  id: string;
  participants: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    show_online_status?: boolean;
  }[];
  latest_message?: {
    content: string;
    created_at: string;
    from_user: any;
  } | null;
  unread_count: number;
  updated_at?: string;
}

export interface OnlineUser {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  isOnline: boolean;
  show_online_status?: boolean;
  /** friend = accepted, pending = outgoing request, contact = conversation only */
  relationship?: 'friend' | 'pending' | 'contact';
}

export interface TypingDraft {
  userId: string;
  text: string;
}

interface MessagesContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  onlineUsers: OnlineUser[];
  loading: boolean;
  messagesLoading: boolean;
  typingUsers: Record<string, string[]>; // conversationId -> userIds
  typingDrafts: Record<string, TypingDraft | null>;
  unreadTotal: number;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, imageUrls?: string[]) => Promise<void>;
  editMessage: (conversationId: string, messageId: string, content: string) => Promise<void>;
  deleteMessage: (
    conversationId: string,
    messageId: string,
    scope?: 'me' | 'everyone'
  ) => Promise<void>;
  loadTrash: () => Promise<TrashMessage[]>;
  permanentlyDeleteFromTrash: (trashId: string) => Promise<void>;
  reactToMessage: (conversationId: string, messageId: string, emoji: string) => Promise<void>;
  sendTypingStatus: (conversationId: string, isTyping: boolean, text?: string) => Promise<void>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  createConversation: (otherUserId: string) => Promise<Conversation | null>;
  loadOnlineUsers: () => Promise<void>;
}

function isLiveTypingPreviewEnabled(): boolean {
  try {
    const raw = localStorage.getItem('appSettings');
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    return parsed?.liveTypingPreview !== false;
  } catch {
    return true;
  }
}

export interface TrashMessage {
  id: string;
  message_id: string;
  conversation_id: string;
  content: string | null;
  images: string[];
  created_at: string | null;
  deleted_at: string;
  scope: 'me' | 'everyone';
  from_user_id: string;
  is_from_current_user: boolean;
  from_user: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
}

const MessagesContext =
  (import.meta.hot?.data?.MessagesContext as React.Context<MessagesContextType | undefined> | undefined) ??
  createContext<MessagesContextType | undefined>(undefined);

if (import.meta.hot) {
  import.meta.hot.data.MessagesContext = MessagesContext;
  // Full reload if this module is disposed while a consumer still holds the old hook
  import.meta.hot.dispose(() => {
    // keep context identity in hot.data (do not delete)
  });
}

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const userRef = useRef(user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [typingDrafts, setTypingDrafts] = useState<Record<string, TypingDraft | null>>({});
  const liveTypingEnabledRef = useRef<boolean>(isLiveTypingPreviewEnabled());
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());
  const activeMessagesFetchRef = useRef<string | null>(null);
  const [appIsActive, setAppIsActive] = useState(document.hasFocus());
  const appIsActiveRef = useRef(appIsActive);
  const showNotificationRef = useRef<((message: any) => void) | null>(null);

  const { showNotification } = useMessageNotification();

  useEffect(() => {
    showNotificationRef.current = showNotification;
  }, [showNotification]);

  useEffect(() => {
    appIsActiveRef.current = appIsActive;
  }, [appIsActive]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setAppIsActive(!document.hidden && document.hasFocus());
    };

    const handleFocus = () => {
      setAppIsActive(true);
    };

    const handleBlur = () => {
      setAppIsActive(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Keep ref updated with latest user
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const currentConversationRef = useRef(currentConversation);
  useEffect(() => {
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);

  const loadConversations = useCallback(async (retryCount = 0) => {
    if (!user) return;

    try {
      // Only set loading on first load or manual refresh, not background retries
      if (retryCount === 0 && conversations.length === 0) {
        setLoading(true);
      }

      const response = await api.get('/messages/conversations');
      setConversations(response.data || []);
      setLoading(false);
    } catch (error: any) {
      setLoading(false);

      // Retry logic - max 1 retry with exponential backoff
      if (retryCount < 1 && error?.message?.includes('Network error')) {
        const delay = 1000 * (retryCount + 1);
        console.log(`Retrying conversations load in ${delay}ms...`);
        setTimeout(() => loadConversations(retryCount + 1), delay);
        return;
      }

      // Only log error if it's not a transient network issue or if retries failed
      console.error('Error loading conversations:', error.message || error);
    }
  }, [user, conversations.length]);

  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    // Optimistic: clear list badge immediately
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
    );

    try {
      await api.put(`/messages/conversations/${conversationId}/read`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [user]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!user) return;

    const cached = messagesCacheRef.current.get(conversationId);
    if (cached) {
      setMessages(cached);
    }

    if (activeMessagesFetchRef.current === conversationId) return;
    activeMessagesFetchRef.current = conversationId;

    try {
      setMessagesLoading(true);
      const response = await api.get(`/messages/conversations/${conversationId}/messages`);
      let data: Message[] = response.data || [];

      // Hide locally-trashed messages (fallback when DB migration not applied)
      const hidden = getLocalHiddenMessageIds(user.id, conversationId);
      if (hidden.size > 0) {
        data = data.filter((m) => !hidden.has(m.id));
      }

      const peerId = currentConversationRef.current?.participants?.[0]?.id;
      if (peerId) {
        try {
          await ensureE2EKeyPair();
          const peerRes = await api.get(`/crypto/keys/${peerId}`);
          const peerKey = peerRes.data?.publicKey as JsonWebKey | undefined;

          data = await Promise.all(
            data.map(async (m) => {
              if (!m.is_encrypted || !m.ciphertext) return m;
              // Already have usable plaintext (e.g. optimistic send cache)
              if (m.content && !m.content.startsWith('🔒')) return m;

              // Prefer decrypting with the *other* party's published key
              let keyForDecrypt = peerKey;
              if (!keyForDecrypt || m.from_user_id !== peerId) {
                try {
                  const senderId = m.from_user_id === user.id ? peerId : m.from_user_id;
                  const keyRes = await api.get(`/crypto/keys/${senderId}`);
                  keyForDecrypt = keyRes.data?.publicKey || keyForDecrypt;
                } catch {
                  // keep peerKey
                }
              }

              if (!keyForDecrypt) {
                return {
                  ...m,
                  content: m.content || '',
                  decrypt_failed: true,
                } as Message;
              }

              const packed = unpackCipher(m.ciphertext);
              if (!packed) {
                return { ...m, content: m.content || '', decrypt_failed: true } as Message;
              }

              const plain = await decryptMessage(packed.ciphertext, packed.iv, keyForDecrypt);
              if (plain) {
                return { ...m, content: plain, decrypt_failed: false } as Message;
              }
              return { ...m, content: m.content || '', decrypt_failed: true } as Message;
            })
          );
        } catch {
          // ignore decrypt errors — leave plaintext messages intact
        }
      }

      messagesCacheRef.current.set(conversationId, data);

      if (currentConversationRef.current?.id === conversationId) {
        setMessages(data);
      }

      void markAsRead(conversationId);
    } catch (error) {
      console.error('Error loading messages:', error);
      if (currentConversationRef.current?.id === conversationId && !cached) {
        setMessages([]);
      }
    } finally {
      if (activeMessagesFetchRef.current === conversationId) {
        activeMessagesFetchRef.current = null;
      }
      setMessagesLoading(false);
    }
  }, [user, markAsRead]);

  const sendMessage = async (conversationId: string, content: string, imageUrls: string[] = []) => {
    if (!user || (!content.trim() && imageUrls.length === 0)) return;

    try {
      const uiLang = (localStorage.getItem('i18nextLng') || 'en').split('-')[0];
      // Don't stamp UI locale as content language — server detects from text on translate
      let payload: Record<string, unknown> = {
        content: content.trim(),
        images: imageUrls,
        language: uiLang,
      };

      // Messaging stays readable + translatable by default.
      // E2E is available but opt-in via localStorage flag (avoids "🔒 Encrypted message" UX).
      const e2eEnabled =
        typeof window !== 'undefined' && localStorage.getItem('puurga_e2e_enabled') === '1';

      if (e2eEnabled) {
        try {
          const peerId = currentConversationRef.current?.participants?.[0]?.id;
          if (peerId && content.trim()) {
            const { publicKeyJwk } = await ensureE2EKeyPair();
            await api.post('/crypto/keys', { publicKey: publicKeyJwk });
            const peerRes = await api.get(`/crypto/keys/${peerId}`);
            const peerKey = peerRes.data?.publicKey;
            if (peerKey) {
              const enc = await encryptMessage(content.trim(), peerKey);
              if (enc) {
                payload = {
                  content: content.trim(), // keep plaintext for translate / history recovery
                  images: imageUrls,
                  language: uiLang,
                  is_encrypted: true,
                  ciphertext: packCipher(enc.ciphertext, enc.iv),
                };
              }
            }
          }
        } catch (e) {
          console.warn('E2E encrypt skipped:', e);
        }
      }

      const response = await api.post(`/messages/conversations/${conversationId}/messages`, payload);

      const newMessage = response.data as Message;
      if (newMessage.is_encrypted && newMessage.ciphertext) {
        newMessage.content = content.trim(); // show plaintext locally for sender
      }
      if (!newMessage.language) newMessage.language = uiLang;
      setMessages(prev => [...prev, newMessage]);

      if (currentConversationRef.current) {
        const convoId = currentConversationRef.current.id;
        const cached = messagesCacheRef.current.get(convoId) || [];
        messagesCacheRef.current.set(convoId, [...cached, newMessage]);
      }

      void loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const editMessage = async (conversationId: string, messageId: string, content: string) => {
    if (!user || !content.trim()) return;

    try {
      const existing =
        (messagesCacheRef.current.get(conversationId) || messages).find((m) => m.id === messageId) ||
        null;

      let payload: Record<string, unknown> = { content: content.trim() };

      const e2eEnabled =
        typeof window !== 'undefined' && localStorage.getItem('puurga_e2e_enabled') === '1';

      if (e2eEnabled && existing?.is_encrypted) {
        try {
          const peerId = currentConversationRef.current?.participants?.[0]?.id;
          if (peerId) {
            const { publicKeyJwk } = await ensureE2EKeyPair();
            await api.post('/crypto/keys', { publicKey: publicKeyJwk });
            const peerRes = await api.get(`/crypto/keys/${peerId}`);
            const peerKey = peerRes.data?.publicKey;
            if (peerKey) {
              const enc = await encryptMessage(content.trim(), peerKey);
              if (enc) {
                payload = {
                  content: content.trim(),
                  is_encrypted: true,
                  ciphertext: packCipher(enc.ciphertext, enc.iv),
                };
              }
            }
          }
        } catch (e) {
          console.warn('E2E re-encrypt on edit skipped:', e);
        }
      } else if (existing?.is_encrypted) {
        // Clear stale ciphertext so peers don't show old encrypted body
        payload = {
          content: content.trim(),
          is_encrypted: false,
          ciphertext: null,
        };
      }

      const response = await api.patch(
        `/messages/conversations/${conversationId}/messages/${messageId}`,
        payload
      );
      const updated = response.data as Message;
      // Always keep local plaintext for the sender
      updated.content = content.trim();
      if (payload.is_encrypted) {
        updated.is_encrypted = true;
        updated.ciphertext = payload.ciphertext as string;
      }

      const applyUpdate = (list: Message[]) =>
        list.map((m) => (m.id === messageId ? { ...m, ...updated } : m));

      setMessages((prev) => applyUpdate(prev));
      const cached = messagesCacheRef.current.get(conversationId);
      if (cached) {
        messagesCacheRef.current.set(conversationId, applyUpdate(cached));
      }
      void loadConversations();
    } catch (error: any) {
      console.error('Error editing message:', error);
      toast.error(error?.response?.data?.error || 'Failed to edit message');
      throw error;
    }
  };

  const deleteMessage = async (
    conversationId: string,
    messageId: string,
    scope: 'me' | 'everyone' = 'me'
  ) => {
    if (!user) return;

    const existing = (messagesCacheRef.current.get(conversationId) || messages).find(
      (m) => m.id === messageId
    );

    const applyHideLocally = () => {
      const applyHide = (list: Message[]) => list.filter((m) => m.id !== messageId);
      setMessages((prev) => applyHide(prev));
      const cached = messagesCacheRef.current.get(conversationId);
      if (cached) messagesCacheRef.current.set(conversationId, applyHide(cached));
    };

    const applyDeleteEveryone = () => {
      const applyDelete = (list: Message[]) =>
        list.map((m) =>
          m.id === messageId
            ? { ...m, content: null, images: [], is_deleted: true, deleted_at: new Date().toISOString() }
            : m
        );
      setMessages((prev) => applyDelete(prev));
      const cached = messagesCacheRef.current.get(conversationId);
      if (cached) messagesCacheRef.current.set(conversationId, applyDelete(cached));
    };

    const saveLocalFallback = (snapshot?: any, forcedScope: 'me' | 'everyone' = scope) => {
      addLocalTrashItem(user.id, {
        message_id: messageId,
        conversation_id: conversationId,
        content: snapshot?.content ?? existing?.content ?? null,
        images: snapshot?.images ?? existing?.images ?? [],
        created_at: snapshot?.created_at ?? existing?.created_at ?? null,
        deleted_at: snapshot?.deleted_at ?? new Date().toISOString(),
        scope: forcedScope,
        from_user_id: snapshot?.from_user_id ?? existing?.from_user_id,
        from_user: existing?.from_user
          ? {
              id: existing.from_user.id,
              full_name: existing.from_user.full_name,
              username: existing.from_user.username,
              avatar_url: existing.from_user.avatar_url || '',
            }
          : null,
        is_from_current_user: existing?.is_from_current_user ?? existing?.from_user_id === user.id,
      });
    };

    try {
      const res = await api.delete(
        `/messages/conversations/${conversationId}/messages/${messageId}`,
        { params: { scope } }
      );

      if (scope === 'everyone') {
        applyDeleteEveryone();
        if (res.data?.trash_saved === false) {
          saveLocalFallback(undefined, 'everyone');
        }
      } else {
        applyHideLocally();
      }

      void loadConversations();
      toast.success(
        scope === 'everyone'
          ? 'Message deleted for everyone'
          : 'Message moved to trash'
      );
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      // Fallback when message_trash table is missing
      if (status === 503 && data?.trash_unavailable) {
        saveLocalFallback(data.snapshot, 'me');
        applyHideLocally();
        void loadConversations();
        toast.success('Message moved to trash');
        toast(
          'Apply SQL migration 20260716_message_trash.sql on Supabase for permanent trash sync.',
          { duration: 5000, icon: 'ℹ️' }
        );
        return;
      }
      console.error('Error deleting message:', error);
      toast.error(data?.error || 'Failed to delete message');
      throw error;
    }
  };

  const loadTrash = async (): Promise<TrashMessage[]> => {
    if (!user) return [];
    const local = readLocalTrash(user.id).map((item) => ({
      id: item.id,
      message_id: item.message_id,
      conversation_id: item.conversation_id,
      content: item.content,
      images: item.images || [],
      created_at: item.created_at,
      deleted_at: item.deleted_at,
      scope: item.scope,
      from_user_id: item.from_user_id || '',
      is_from_current_user: Boolean(item.is_from_current_user),
      from_user: item.from_user || {
        id: item.from_user_id || '',
        full_name: 'User',
        username: 'user',
        avatar_url: null,
      },
    })) as TrashMessage[];

    try {
      const res = await api.get('/messages/trash');
      const remote = (res.data || []) as TrashMessage[];
      // Prefer remote; keep local-only items not yet on server
      const remoteIds = new Set(remote.map((r) => r.message_id));
      const merged = [...remote, ...local.filter((l) => !remoteIds.has(l.message_id))];
      return merged;
    } catch (error: any) {
      if (error?.response?.status === 503) {
        return local;
      }
      const msg =
        error?.response?.data?.error ||
        error?.message ||
        'Failed to load trash';
      toast.error(msg);
      return local;
    }
  };

  const permanentlyDeleteFromTrash = async (trashId: string) => {
    if (!user) return;
    try {
      if (String(trashId).startsWith('local-')) {
        removeLocalTrashItem(user.id, trashId);
        toast.success('Removed from trash');
        return;
      }
      await api.delete(`/messages/trash/${trashId}`);
      removeLocalTrashItem(user.id, trashId);
      toast.success('Removed from trash');
    } catch (error: any) {
      // If server trash missing, still clear local
      if (error?.response?.status === 503 || error?.response?.status === 404) {
        removeLocalTrashItem(user.id, trashId);
        toast.success('Removed from trash');
        return;
      }
      toast.error(error?.response?.data?.error || 'Failed to remove from trash');
      throw error;
    }
  };

  const reactToMessage = async (conversationId: string, messageId: string, emoji: string) => {
    if (!user) return;
    try {
      const res = await api.post(
        `/messages/conversations/${conversationId}/messages/${messageId}/reactions`,
        { emoji }
      );
      const reactions = res.data.reactions || {};
      const apply = (list: Message[]) =>
        list.map((m) => (m.id === messageId ? { ...m, reactions } : m));
      setMessages((prev) => apply(prev));
      const cached = messagesCacheRef.current.get(conversationId);
      if (cached) messagesCacheRef.current.set(conversationId, apply(cached));
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to react');
      throw error;
    }
  };

  const sendTypingStatus = async (conversationId: string, isTyping: boolean, text = '') => {
    if (!user) return;
    try {
      await api.post(`/messages/conversations/${conversationId}/typing`, {
        isTyping,
        text: isTyping && liveTypingEnabledRef.current ? text.slice(0, 500) : '',
      });
    } catch (error) {
      console.error('Error sending typing status:', error);
    }
  };

  const createConversation = async (otherUserId: string): Promise<Conversation | null> => {
    if (!user) return null;

    try {
      const response = await api.post('/messages/conversations', {
        otherUserId
      });

      // Reload conversations to include the new one
      await loadConversations();

      return response.data;
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to start conversation';
      toast.error(msg);
      return null;
    }
  };

  const loadOnlineUsers = useCallback(async () => {
    if (!user) return;

    try {
      const [onlineRes, friendsRes] = await Promise.all([
        api.get('/messages/users/online'),
        api.get('/friends/accepted').catch(() => ({ data: [] })),
      ]);

      const fromOnline: OnlineUser[] = (onlineRes.data || []).map((u: any) => ({
        ...u,
        relationship: u.relationship || 'contact',
      }));

      const byId = new Map<string, OnlineUser>(fromOnline.map((u) => [u.id, u]));

      // Ensure every accepted friend appears, even if the online endpoint missed them
      for (const f of friendsRes.data || []) {
        const id = f.id as string;
        if (!id || id === user.id) continue;
        const existing = byId.get(id);
        if (existing) {
          byId.set(id, { ...existing, relationship: 'friend' });
        } else {
          byId.set(id, {
            id,
            full_name: f.name || f.full_name || 'Unknown',
            username: f.username || 'user',
            avatar_url: f.avatar || f.avatar_url || '',
            isOnline: false,
            show_online_status: true,
            relationship: 'friend',
          });
        }
      }

      const merged = Array.from(byId.values()).sort((a, b) => {
        const rank = (u: OnlineUser) =>
          u.relationship === 'friend' ? 0 : u.relationship === 'pending' ? 1 : u.isOnline ? 2 : 3;
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
        return (a.full_name || '').localeCompare(b.full_name || '');
      });

      setOnlineUsers(merged);
    } catch (error) {
      console.error('Error loading online users:', error);
      setOnlineUsers([]);
    }
  }, [user]);

  const clearDraftForUser = useCallback((conversationId: string, userId: string) => {
    setTypingDrafts((prev) => ({
      ...prev,
      [conversationId]:
        prev[conversationId]?.userId === userId ? null : prev[conversationId] ?? null,
    }));
    setTypingUsers((prev) => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).filter((id) => id !== userId),
    }));
  }, []);

  // WebSocket Handlers
  const handleNewMessage = useCallback((payload: any) => {
    const currentUser = userRef.current;
    if (!currentUser) return;

    const { conversationId, message } = payload;
    if (!message) return;

    // Validate: ignore messages from self (prevents echo/duplicate)
    if (message.fromUserId === currentUser.id) {
      return;
    }

    // Ring only when user is not already focused in this chat
    const isChattingInThisConvo = currentConversationRef.current?.id === conversationId;
    const shouldRing =
      !(isChattingInThisConvo && document.hasFocus()) &&
      document.visibilityState !== 'hidden';
    if (shouldRing) {
      playMessageSound();
    }

    const previewContent = message.isEncrypted
      ? (message.content?.trim() || 'New message')
      : message.content || '';

    const commitIncoming = (resolvedContent: string | null) => {
      clearDraftForUser(conversationId, message.fromUserId);

      if (isChattingInThisConvo) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;

          const incoming: Message = {
            id: message.id,
            content: resolvedContent ?? message.content,
            images: message.images || [],
            from_user_id: message.fromUserId,
            created_at: message.createdAt,
            conversation_id: conversationId,
            read: true,
            read_at: new Date().toISOString(),
            is_encrypted: Boolean(message.isEncrypted),
            ciphertext: message.ciphertext || null,
            language: message.language || 'en',
            translated_content: message.translatedContent ?? message.translated_content ?? null,
            translated_language: message.translatedLanguage ?? message.translated_language ?? null,
            from_user: {
              id: message.fromUser.id,
              full_name: message.fromUser.name,
              username: message.fromUser.username,
              avatar_url: message.fromUser.avatar,
            },
          };
          const next = [...prev, incoming];
          messagesCacheRef.current.set(conversationId, next);
          return next;
        });
        void markAsRead(conversationId);
      } else {
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === conversationId);
          if (!exists) return prev;
          return prev
            .map((c) =>
              c.id === conversationId
                ? {
                    ...c,
                    unread_count: (c.unread_count || 0) + 1,
                    latest_message: {
                      content: previewContent,
                      created_at: message.createdAt,
                      from_user: message.fromUser,
                    },
                    updated_at: message.createdAt,
                  }
                : c
            )
            .sort((a, b) => {
              const ta = new Date(a.latest_message?.created_at || a.updated_at || 0).getTime();
              const tb = new Date(b.latest_message?.created_at || b.updated_at || 0).getTime();
              return tb - ta;
            });
        });
      }

      if (!isChattingInThisConvo) {
        if (appIsActiveRef.current && document.hasFocus()) {
          showNotificationRef.current?.({
            id: message.id,
            conversationId,
            senderId: message.fromUser.id,
            senderName: message.fromUser.name,
            senderUsername: message.fromUser.username,
            senderAvatar: message.fromUser.avatar,
            content: previewContent,
          });
        } else {
          toast.success(
            <div className="flex flex-col">
              <span className="font-bold">{message.fromUser.name}</span>
              <span className="text-sm line-clamp-2">{previewContent}</span>
            </div>,
            {
              duration: 4000,
              position: 'top-right',
              style: {
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #333',
              },
            }
          );
        }
      }

      void loadConversations();
    };

    if (message.isEncrypted && message.ciphertext) {
      // Prefer plaintext from payload when available (new send path keeps content)
      if (typeof message.content === 'string' && message.content.trim()) {
        commitIncoming(message.content);
        return;
      }
      void (async () => {
        try {
          await ensureE2EKeyPair();
          const peerRes = await api.get(`/crypto/keys/${message.fromUserId}`);
          const peerKey = peerRes.data?.publicKey;
          const packed = unpackCipher(message.ciphertext);
          if (peerKey && packed) {
            const plain = await decryptMessage(packed.ciphertext, packed.iv, peerKey);
            commitIncoming(plain || message.content || '');
            return;
          }
        } catch {
          // fall through
        }
        commitIncoming(message.content || '');
      })();
      return;
    }

    commitIncoming(message.content);
  }, [clearDraftForUser, loadConversations, markAsRead]);

  const handleMessageRead = useCallback((payload: {
    conversationId: string;
    userId: string;
    readAt: string;
    messageIds?: string[];
  }) => {
    const { conversationId, readAt, messageIds } = payload;
    const idSet = messageIds && messageIds.length > 0 ? new Set(messageIds) : null;

    const applyRead = (list: Message[]) =>
      list.map((m) => {
        const mine = userRef.current && m.from_user_id === userRef.current.id;
        if (!mine) return m;
        if (idSet && !idSet.has(m.id)) return m;
        return { ...m, read: true, read_at: readAt };
      });

    if (currentConversationRef.current?.id === conversationId) {
      setMessages((prev) => applyRead(prev));
    }
    const cached = messagesCacheRef.current.get(conversationId);
    if (cached) {
      messagesCacheRef.current.set(conversationId, applyRead(cached));
    }
  }, []);

  const handleTyping = useCallback((payload: { conversationId: string; userId: string; isTyping: boolean; text?: string }) => {
    const { conversationId, userId, isTyping, text = '' } = payload;

    setTypingUsers(prev => {
      const currentTyping = prev[conversationId] || [];

      if (isTyping) {
        // Add user to typing list if not already there
        if (!currentTyping.includes(userId)) {
          return {
            ...prev,
            [conversationId]: [...currentTyping, userId]
          };
        }
      } else {
        // Remove user from typing list
        return {
          ...prev,
          [conversationId]: currentTyping.filter(id => id !== userId)
        };
      }
      return prev;
    });

    setTypingDrafts((prev) => ({
      ...prev,
      [conversationId]: isTyping
        ? {
            userId,
            text,
          }
        : null,
    }));
  }, []);

  const handleMessageEdited = useCallback((payload: {
    conversationId: string;
    messageId: string;
    content: string;
    isEdited: boolean;
    editedAt: string;
    translatedContent?: string | null;
    translatedLanguage?: string | null;
    language?: string | null;
  }) => {
    const {
      conversationId,
      messageId,
      content,
      editedAt,
      translatedContent,
      translatedLanguage,
      language,
    } = payload;
    const applyUpdate = (list: Message[]) =>
      list.map((m) =>
        m.id === messageId
          ? {
              ...m,
              content,
              is_edited: true,
              edited_at: editedAt,
              // Clear stale translation; apply fresh one from server when present
              translated_content:
                translatedContent !== undefined ? translatedContent : null,
              translated_language:
                translatedLanguage !== undefined ? translatedLanguage : null,
              ...(language ? { language } : {}),
            }
          : m
      );

    if (currentConversationRef.current?.id === conversationId) {
      setMessages((prev) => applyUpdate(prev));
    }
    const cached = messagesCacheRef.current.get(conversationId);
    if (cached) {
      messagesCacheRef.current.set(conversationId, applyUpdate(cached));
    }
    void loadConversations();
  }, [loadConversations]);

  const handleMessageDeleted = useCallback((payload: {
    conversationId: string;
    messageId: string;
    isDeleted: boolean;
    deletedAt: string;
    scope?: 'me' | 'everyone';
  }) => {
    const { conversationId, messageId, deletedAt, scope } = payload;
    if (scope === 'me') {
      const applyHide = (list: Message[]) => list.filter((m) => m.id !== messageId);
      if (currentConversationRef.current?.id === conversationId) {
        setMessages((prev) => applyHide(prev));
      }
      const cached = messagesCacheRef.current.get(conversationId);
      if (cached) messagesCacheRef.current.set(conversationId, applyHide(cached));
      void loadConversations();
      return;
    }

    const applyDelete = (list: Message[]) =>
      list.map((m) =>
        m.id === messageId
          ? { ...m, content: null, images: [], is_deleted: true, deleted_at: deletedAt }
          : m
      );

    if (currentConversationRef.current?.id === conversationId) {
      setMessages((prev) => applyDelete(prev));
      toast('A message was deleted', { icon: '🗑️' });
    }
    const cached = messagesCacheRef.current.get(conversationId);
    if (cached) {
      messagesCacheRef.current.set(conversationId, applyDelete(cached));
    }
    void loadConversations();
  }, [loadConversations]);

  const handleMessageHidden = useCallback((payload: {
    conversationId: string;
    messageId: string;
  }) => {
    const { conversationId, messageId } = payload;
    const applyHide = (list: Message[]) => list.filter((m) => m.id !== messageId);
    if (currentConversationRef.current?.id === conversationId) {
      setMessages((prev) => applyHide(prev));
    }
    const cached = messagesCacheRef.current.get(conversationId);
    if (cached) messagesCacheRef.current.set(conversationId, applyHide(cached));
    void loadConversations();
  }, [loadConversations]);

  const handleMessageReaction = useCallback((payload: {
    conversationId: string;
    messageId: string;
    reactions: Record<string, { count: number; reacted_by_me: boolean }>;
  }) => {
    const { conversationId, messageId, reactions } = payload;
    const apply = (list: Message[]) =>
      list.map((m) => (m.id === messageId ? { ...m, reactions } : m));
    if (currentConversationRef.current?.id === conversationId) {
      setMessages((prev) => apply(prev));
    }
    const cached = messagesCacheRef.current.get(conversationId);
    if (cached) messagesCacheRef.current.set(conversationId, apply(cached));
  }, []);

  const handleUserStatusChange = useCallback((status: { userId: string; isOnline: boolean }) => {
    setOnlineUsers(prev => {
      const updated = [...prev];
      const userIndex = updated.findIndex(u => u.id === status.userId);

      if (userIndex !== -1) {
        // Update existing user
        updated[userIndex] = { ...updated[userIndex], isOnline: status.isOnline };
      }
      // Note: We don't add new users here because we only track friends/suggestions loaded via API
      // Reloading online users might be cleaner but more expensive
      return updated;
    });
  }, []);

  // Initialize WebSocket listeners
  useWebSocket({
    onMessage: handleNewMessage,
    onMessageEdited: handleMessageEdited,
    onMessageDeleted: handleMessageDeleted,
    onMessageHidden: handleMessageHidden,
    onMessageReaction: handleMessageReaction,
    onMessageRead: handleMessageRead,
    onTyping: handleTyping,
    onDraftStarted: (payload) =>
      handleTyping({
        conversationId: payload.conversationId,
        userId: payload.userId,
        isTyping: true,
        text: payload.text || '',
      }),
    onDraftUpdated: (payload) =>
      handleTyping({
        conversationId: payload.conversationId,
        userId: payload.userId,
        isTyping: true,
        text: payload.text || '',
      }),
    onDraftStopped: (payload) => clearDraftForUser(payload.conversationId, payload.userId),
    onDraftSent: (payload) => clearDraftForUser(payload.conversationId, payload.userId),
    onUserStatusChange: handleUserStatusChange,
    onGroupMessage: (payload) => {
      const currentUser = userRef.current;
      if (!currentUser) return;
      const fromId = payload?.message?.fromUserId || payload?.fromUserId || payload?.senderId;
      if (fromId && fromId === currentUser.id) return;
      playMessageSound();
    },
  });

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0),
    [conversations]
  );

  // Browser tab badge (WhatsApp-style)
  useEffect(() => {
    const base = 'Puurga';
    if (typeof document === 'undefined') return;
    document.title = unreadTotal > 0 ? `(${unreadTotal > 99 ? '99+' : unreadTotal}) ${base}` : base;
  }, [unreadTotal]);

  // Publish E2E public key when user is available
  useEffect(() => {
    if (!user?.id) return;
    ensureE2EKeyPair()
      .then(({ publicKeyJwk }) => api.post('/crypto/keys', { publicKey: publicKeyJwk }))
      .catch(() => undefined);
  }, [user?.id]);

  // Warm audio unlock path as soon as the messages system is alive
  useEffect(() => {
    const warm = () => unlockMessageSound();
    window.addEventListener('pointerdown', warm, { once: true, passive: true });
    window.addEventListener('keydown', warm, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', warm);
      window.removeEventListener('keydown', warm);
    };
  }, []);

  // Load conversations when user logs in
  useEffect(() => {
    if (user?.id) {
      loadConversations();
      // Don't auto-refresh - let WebSocket handle online status updates
      // loadOnlineUsers will be called when Messages page is explicitly opened
    }
  }, [user?.id]);

  useEffect(() => {
    const syncLiveTypingSetting = () => {
      liveTypingEnabledRef.current = isLiveTypingPreviewEnabled();
    };

    syncLiveTypingSetting();
    window.addEventListener('storage', syncLiveTypingSetting);
    window.addEventListener('focus', syncLiveTypingSetting);
    return () => {
      window.removeEventListener('storage', syncLiveTypingSetting);
      window.removeEventListener('focus', syncLiveTypingSetting);
    };
  }, []);

  useEffect(() => {
    if (!user?.id || !currentConversation) {
      setMessages([]);
      return;
    }
    const cached = messagesCacheRef.current.get(currentConversation.id);
    setMessages(cached ?? []);
    loadMessages(currentConversation.id);
  }, [user?.id, currentConversation?.id, loadMessages]);

  useEffect(() => {
    if (!currentConversation) return;
    setTypingDrafts((prev) => ({
      ...prev,
      [currentConversation.id]:
        prev[currentConversation.id]?.userId === user?.id ? null : prev[currentConversation.id] ?? null,
    }));
  }, [currentConversation?.id, user?.id]);

  return (
    <MessagesContext.Provider
      value={{
        conversations,
        currentConversation,
        messages,
        onlineUsers,
        loading,
        messagesLoading,
        typingUsers,
        typingDrafts,
        unreadTotal,
        loadConversations,
        loadMessages,
        markAsRead,
        sendMessage,
        editMessage,
        deleteMessage,
        loadTrash,
        permanentlyDeleteFromTrash,
        reactToMessage,
        sendTypingStatus,
        setCurrentConversation,
        createConversation,
        loadOnlineUsers
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    // Vite HMR can briefly desync Provider vs hook module instances.
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const key = 'puurga_messages_ctx_hmr_reload';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        console.warn('[Messages] Context missing after HMR — reloading once…');
        window.location.reload();
      }
    }
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    sessionStorage.removeItem('puurga_messages_ctx_hmr_reload');
  }
  return context;
}; 