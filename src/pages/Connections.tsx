import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserPlus,
  UserCheck,
  Clock,
  Search,
  Loader2,
  Check,
  X,
  UserMinus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';
import ProfileLink from '../components/Profile/ProfileLink';
import api from '../lib/axios';
import {
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getFriendSuggestions,
  getAcceptedFriends,
  sendFriendRequest,
} from '../services/friendService';

type TabId = 'friends' | 'followers' | 'following' | 'pending' | 'suggested';

interface Person {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
  requestId?: string;
}

const TABS: { id: TabId; labelKey: string; fallback: string; icon: React.ReactNode }[] = [
  { id: 'friends', labelKey: 'connections.friends', fallback: 'Friends', icon: <Users size={14} /> },
  { id: 'followers', labelKey: 'connections.followers', fallback: 'Followers', icon: <UserCheck size={14} /> },
  { id: 'following', labelKey: 'connections.following', fallback: 'Following', icon: <UserPlus size={14} /> },
  { id: 'pending', labelKey: 'connections.pending', fallback: 'Pending', icon: <Clock size={14} /> },
  { id: 'suggested', labelKey: 'connections.suggested', fallback: 'Suggested', icon: <UserPlus size={14} /> },
];

const Connections: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>('friends');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [friends, setFriends] = useState<Person[]>([]);
  const [followers, setFollowers] = useState<Person[]>([]);
  const [following, setFollowing] = useState<Person[]>([]);
  const [incoming, setIncoming] = useState<Person[]>([]);
  const [outgoing, setOutgoing] = useState<Person[]>([]);
  const [suggested, setSuggested] = useState<Person[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [friendsRes, followersRes, followingRes, incomingRes, outgoingRes, suggestedRes] =
        await Promise.all([
          getAcceptedFriends().catch(() => []),
          api.get('/friends/followers').then((r) => r.data).catch(() => []),
          api.get('/friends/following').then((r) => r.data).catch(() => []),
          getFriendRequests().catch(() => []),
          api.get('/friends/requests/outgoing').then((r) => r.data).catch(() => []),
          getFriendSuggestions().catch(() => []),
        ]);

      setFriends(
        (friendsRes || []).map((u: any) => ({
          id: u.id,
          name: u.name || u.full_name || 'Unknown',
          username: u.username || 'user',
          avatar: u.avatar || u.avatar_url,
        }))
      );
      setFollowers(
        (followersRes || []).map((u: any) => ({
          id: u.id,
          name: u.name || u.full_name || 'Unknown',
          username: u.username || 'user',
          avatar: u.avatar || u.avatar_url,
        }))
      );
      setFollowing(
        (followingRes || []).map((u: any) => ({
          id: u.id,
          name: u.name || u.full_name || 'Unknown',
          username: u.username || 'user',
          avatar: u.avatar || u.avatar_url,
        }))
      );
      setIncoming(
        (incomingRes || []).map((r: any) => ({
          id: r.sender_id || r.id,
          requestId: r.id,
          name: r.sender_name || r.name || 'Unknown',
          username: r.sender_username || r.username || 'user',
          avatar: r.sender_avatar || r.avatar,
        }))
      );
      setOutgoing(
        (outgoingRes || []).map((r: any) => ({
          id: r.receiver_id || r.id,
          requestId: r.id,
          name: r.name || 'Unknown',
          username: r.username || 'user',
          avatar: r.avatar,
        }))
      );
      setSuggested(
        (suggestedRes || []).map((u: any) => ({
          id: u.id,
          name: u.name || u.full_name || 'Unknown',
          username: u.username || 'user',
          avatar: u.avatar || u.avatar_url,
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error(t('connections.loadError', 'Failed to load connections'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const list = useMemo(() => {
    let items: Person[] = [];
    if (tab === 'friends') items = friends;
    else if (tab === 'followers') items = followers;
    else if (tab === 'following') items = following;
    else if (tab === 'pending') items = [...incoming, ...outgoing];
    else items = suggested;

    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q)
    );
  }, [tab, friends, followers, following, incoming, outgoing, suggested, search]);

  const handleAccept = async (person: Person) => {
    if (!person.requestId) return;
    setBusyId(person.id);
    try {
      await acceptFriendRequest(person.requestId);
      toast.success(t('connections.accepted', 'Friend request accepted'));
      await loadAll();
    } catch {
      toast.error(t('connections.acceptError', 'Failed to accept'));
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (person: Person) => {
    if (!person.requestId) return;
    setBusyId(person.id);
    try {
      await rejectFriendRequest(person.requestId);
      toast.success(t('connections.rejected', 'Request declined'));
      await loadAll();
    } catch {
      toast.error(t('connections.rejectError', 'Failed to decline'));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (person: Person) => {
    if (!person.requestId) return;
    setBusyId(person.id);
    try {
      await api.delete(`/friend-requests/${person.requestId}/cancel`);
      toast.success(t('connections.cancelled', 'Request cancelled'));
      await loadAll();
    } catch {
      toast.error(t('connections.cancelError', 'Failed to cancel'));
    } finally {
      setBusyId(null);
    }
  };

  const handleUnfriend = async (person: Person) => {
    if (!window.confirm(t('connections.unfriendConfirm', `Remove ${person.name} from friends?`))) {
      return;
    }
    setBusyId(person.id);
    try {
      await api.delete(`/friends/${person.id}`);
      toast.success(t('connections.unfriended', 'Friend removed'));
      await loadAll();
    } catch {
      toast.error(t('connections.unfriendError', 'Failed to remove friend'));
    } finally {
      setBusyId(null);
    }
  };

  const handleAdd = async (person: Person) => {
    setBusyId(person.id);
    try {
      await sendFriendRequest(person.id);
      toast.success(t('connections.requestSent', 'Friend request sent'));
      await loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('connections.requestError', 'Failed to send request'));
    } finally {
      setBusyId(null);
    }
  };

  const isIncoming = (p: Person) => incoming.some((i) => i.requestId === p.requestId);
  const isOutgoing = (p: Person) => outgoing.some((o) => o.requestId === p.requestId);

  return (
    <div className="w-full space-y-6">
      <header className="page-header">
        <h1 className="page-title text-2xl">
          {t('connections.title', 'My Connections')}
        </h1>
        <p className="page-subtitle">
          {t('connections.subtitle', 'Friends, followers, requests and suggestions')}
        </p>
      </header>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('connections.search', 'Search people…')}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              tab === item.id
                ? 'bg-accent text-black border-accent'
                : 'bg-card text-muted border-border hover:text-foreground hover:bg-card-hover hover:border-highlight'
            }`}
          >
            {item.icon}
            {t(item.labelKey, item.fallback)}
            {item.id === 'pending' && incoming.length + outgoing.length > 0 && (
              <span className="ml-0.5 bg-red-500 text-white rounded-full min-w-[16px] h-4 px-1 text-[10px] flex items-center justify-center">
                {incoming.length + outgoing.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted">
          <Loader2 className="animate-spin mr-2" size={20} />
          {t('common.loading', 'Loading…')}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <Users className="mx-auto mb-3 text-muted" size={36} />
          <p className="text-foreground font-medium">
            {t('connections.empty', 'No people here yet')}
          </p>
          <p className="text-sm text-muted mt-1">
            {t('connections.emptyHint', 'Try another tab or send a friend request')}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((person) => (
            <li
              key={`${tab}-${person.requestId || person.id}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-highlight hover:bg-card-hover/60 transition-colors"
            >
              <Link to={`/profile/${person.username}`} className="shrink-0">
                <Avatar
                  src={person.avatar || undefined}
                  alt={person.name}
                  size="md"
                  userId={person.id}
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/profile/${person.username}`}
                  className="font-medium text-foreground hover:text-accent truncate block"
                >
                  {person.name}
                </Link>
                <ProfileLink username={person.username} className="text-xs text-muted truncate hover:text-accent block">
                  @{person.username}
                </ProfileLink>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {tab === 'friends' && (
                  <button
                    type="button"
                    disabled={busyId === person.id}
                    onClick={() => handleUnfriend(person)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-border text-muted hover:text-red-500 hover:border-red-500/40 disabled:opacity-50"
                  >
                    {busyId === person.id ? <Loader2 size={12} className="animate-spin" /> : <UserMinus size={12} />}
                    {t('connections.unfriend', 'Unfriend')}
                  </button>
                )}

                {tab === 'pending' && isIncoming(person) && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === person.id}
                      onClick={() => handleAccept(person)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-accent text-black hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    >
                      {busyId === person.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      {t('connections.accept', 'Accept')}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === person.id}
                      onClick={() => handleReject(person)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-border text-muted hover:text-red-500 disabled:opacity-50"
                    >
                      <X size={12} />
                    </button>
                  </>
                )}

                {tab === 'pending' && isOutgoing(person) && (
                  <button
                    type="button"
                    disabled={busyId === person.id}
                    onClick={() => handleCancel(person)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-border text-muted hover:text-foreground disabled:opacity-50"
                  >
                    {busyId === person.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                    {t('connections.cancel', 'Cancel')}
                  </button>
                )}

                {tab === 'suggested' && (
                  <button
                    type="button"
                    disabled={busyId === person.id}
                    onClick={() => handleAdd(person)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-accent text-black hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {busyId === person.id ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                    {t('connections.add', 'Add')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Connections;
