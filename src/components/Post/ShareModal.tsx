import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Link2,
  Users,
  MessageCircle,
  MessageSquare,
  BookOpen,
  Check,
  Search,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getAcceptedFriends } from '../../services/friendService';
import api from '../../lib/axios';
import Avatar from '../Avatar';
import { useUser } from '../../context/UserContext';
import Button from '../UI/Button';
import { isVideoUrl } from '../../utils/mediaUrls';

interface Friend {
  id: string;
  username: string;
  name: string;
  avatar?: string;
  display_name?: string;
  avatar_url?: string;
}

interface GroupItem {
  id: string;
  name: string;
  image_url?: string | null;
  avatar_url?: string | null;
  is_member?: boolean;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postContent: string;
  postAuthor: string;
  postAuthorAvatar?: string;
  postImages?: string[];
}

type Panel = 'main' | 'groups';

function friendLabel(f: Friend) {
  return f.name || f.display_name || f.username || 'Friend';
}

function friendAvatar(f: Friend) {
  return f.avatar || f.avatar_url || undefined;
}

function buildShareMessage(opts: {
  author: string;
  content: string;
  url: string;
  note?: string;
}) {
  const snippet =
    opts.content.length > 160 ? `${opts.content.slice(0, 160)}…` : opts.content;
  const note = opts.note?.trim();
  const body = snippet
    ? `📎 Shared a post by @${opts.author}\n\n"${snippet}"\n\n${opts.url}`
    : `📎 Shared a post by @${opts.author}\n\n${opts.url}`;
  return note ? `${note}\n\n${body}` : body;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  postId,
  postContent,
  postAuthor,
  postImages = [],
}) => {
  const { user } = useUser();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [shareText, setShareText] = useState('');
  const [friendQuery, setFriendQuery] = useState('');
  const [groupQuery, setGroupQuery] = useState('');
  const [panel, setPanel] = useState<Panel>('main');
  const [sharing, setSharing] = useState(false);
  const [sharingStory, setSharingStory] = useState(false);
  const [sharingGroups, setSharingGroups] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${baseUrl}/post/${postId}?ref=puurga_share`;

  useEffect(() => {
    if (!isOpen) return;
    setShareText('');
    setFriendQuery('');
    setGroupQuery('');
    setSelectedFriendIds(new Set());
    setSelectedGroupIds(new Set());
    setPanel('main');
    void fetchFriends();
  }, [isOpen]);

  const fetchFriends = async () => {
    try {
      const data = await getAcceptedFriends();
      const list = Array.isArray(data) ? data : data?.friends || [];
      setFriends(list);
    } catch (error) {
      console.error('Error fetching friends:', error);
      setFriends([]);
    }
  };

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const { data } = await api.get('/groups');
      const list = (Array.isArray(data) ? data : []).filter(
        (g: GroupItem) => Boolean(g.is_member)
      );
      setGroups(list);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]);
      toast.error('Failed to load groups');
    } finally {
      setLoadingGroups(false);
    }
  };

  const openGroupsPanel = () => {
    setPanel('groups');
    void fetchGroups();
  };

  const filteredFriends = useMemo(() => {
    const q = friendQuery.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => {
      const label = friendLabel(f).toLowerCase();
      return label.includes(q) || (f.username || '').toLowerCase().includes(q);
    });
  }, [friends, friendQuery]);

  const filteredGroups = useMemo(() => {
    const q = groupQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => (g.name || '').toLowerCase().includes(q));
  }, [groups, groupQuery]);

  const canShareNow = selectedFriendIds.size > 0 && !sharing;

  const toggleFriend = (id: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleShareToFriends = async () => {
    if (selectedFriendIds.size === 0) return;
    setSharing(true);
    try {
      const message = buildShareMessage({
        author: postAuthor,
        content: postContent,
        url: shareUrl,
        note: shareText,
      });

      const results = await Promise.allSettled(
        [...selectedFriendIds].map(async (friendId) => {
          const convo = await api.post('/messages/conversations', {
            otherUserId: friendId,
          });
          const conversationId = convo.data?.id;
          if (!conversationId) throw new Error('No conversation');
          await api.post(`/messages/conversations/${conversationId}/messages`, {
            content: message,
            images: [],
            language: (localStorage.getItem('i18nextLng') || 'en').split('-')[0],
          });
        })
      );

      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const fail = results.length - ok;
      if (ok > 0) {
        toast.success(
          ok === 1 ? 'Shared with 1 friend' : `Shared with ${ok} friends`
        );
      }
      if (fail > 0) toast.error(`${fail} share(s) failed`);
      if (ok > 0) onClose();
    } catch (error) {
      console.error('Error sharing to friends:', error);
      toast.error('Failed to share with friends');
    } finally {
      setSharing(false);
    }
  };

  const handleShareToGroups = async () => {
    if (selectedGroupIds.size === 0) return;
    setSharingGroups(true);
    try {
      const message = buildShareMessage({
        author: postAuthor,
        content: postContent,
        url: shareUrl,
        note: shareText,
      });

      const results = await Promise.allSettled(
        [...selectedGroupIds].map((groupId) =>
          api.post(`/groups/${groupId}/messages`, {
            content: message,
            media: [],
            language: (localStorage.getItem('i18nextLng') || 'en').split('-')[0],
          })
        )
      );

      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const fail = results.length - ok;
      if (ok > 0) {
        toast.success(ok === 1 ? 'Shared to 1 group' : `Shared to ${ok} groups`);
      }
      if (fail > 0) toast.error(`${fail} group share(s) failed`);
      if (ok > 0) onClose();
    } catch (error) {
      console.error('Error sharing to groups:', error);
      toast.error('Failed to share to groups');
    } finally {
      setSharingGroups(false);
    }
  };

  const handleShareToStory = async () => {
    setSharingStory(true);
    try {
      const formData = new FormData();
      const storyText = buildShareMessage({
        author: postAuthor,
        content: postContent,
        url: shareUrl,
        note: shareText,
      });
      formData.append('content', storyText);
      formData.append('gradientIndex', '0');

      const firstImage = postImages.find((u) => u && !isVideoUrl(u));
      if (firstImage) {
        try {
          const res = await fetch(firstImage);
          if (res.ok) {
            const blob = await res.blob();
            const ext = blob.type.includes('png')
              ? 'png'
              : blob.type.includes('webp')
                ? 'webp'
                : 'jpg';
            formData.append(
              'media',
              new File([blob], `shared-post.${ext}`, {
                type: blob.type || 'image/jpeg',
              })
            );
          }
        } catch {
          // text-only story is fine
        }
      }

      await api.post('/statuses', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Shared to your story');
      onClose();
    } catch (error: any) {
      console.error('Error sharing to story:', error);
      toast.error(error?.response?.data?.error || 'Failed to share to story');
    } finally {
      setSharingStory(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  const handleExternalShare = (platform: string) => {
    const textToShare = `Check out this post by ${postAuthor} on Puurga!`;
    let url = '';

    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(textToShare)}&url=${encodeURIComponent(shareUrl)}&hashtags=Puurga`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(`${textToShare} ${shareUrl}`)}`;
        break;
      case 'messenger':
        url = `fb-messenger://share/?link=${encodeURIComponent(shareUrl)}`;
        break;
    }

    if (url) window.open(url, '_blank', 'width=600,height=400');
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-card text-card-foreground rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border z-10 max-h-[90dvh]"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              {panel === 'groups' ? (
                <button
                  type="button"
                  onClick={() => setPanel('main')}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-card-hover"
                  aria-label="Back"
                >
                  <ArrowLeft size={18} />
                </button>
              ) : (
                <div className="w-10" />
              )}
              <h2 className="text-[17px] font-bold">
                {panel === 'groups' ? 'Share to Groups' : 'Share'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-card-hover hover:bg-card-hover/80 transition-colors"
              >
                <X size={20} className="text-muted" />
              </button>
            </div>

            {panel === 'main' ? (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={user?.avatar || undefined}
                        alt={user?.name || 'User'}
                        size="md"
                      />
                      <span className="font-semibold text-[15px]">
                        {user?.name || 'Loading...'}
                      </span>
                    </div>

                    <textarea
                      value={shareText}
                      onChange={(e) => setShareText(e.target.value)}
                      placeholder="Add a message (optional)…"
                      className="w-full bg-transparent text-[16px] outline-none border-none resize-none placeholder-muted min-h-[56px]"
                    />
                  </div>

                  <div className="h-px w-full bg-border" />

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-[13px] tracking-wide text-muted uppercase">
                        Share with friends
                      </h3>
                      {selectedFriendIds.size > 0 && (
                        <span className="text-[12px] font-semibold text-accent">
                          {selectedFriendIds.size} selected
                        </span>
                      )}
                    </div>

                    {friends.length > 4 && (
                      <div className="relative mb-3">
                        <Search
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                        />
                        <input
                          value={friendQuery}
                          onChange={(e) => setFriendQuery(e.target.value)}
                          placeholder="Search friends…"
                          className="w-full bg-background border border-border rounded-full pl-9 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>
                    )}

                    {filteredFriends.length === 0 ? (
                      <p className="text-sm text-muted py-2">
                        No friends to share with yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-48 overflow-y-auto pr-1">
                        {filteredFriends.map((friend) => {
                          const selected = selectedFriendIds.has(friend.id);
                          return (
                            <button
                              key={friend.id}
                              type="button"
                              onClick={() => toggleFriend(friend.id)}
                              className="flex flex-col items-center gap-1 group"
                            >
                              <div className="relative">
                                <Avatar
                                  src={friendAvatar(friend)}
                                  alt={friendLabel(friend)}
                                  size="lg"
                                  className={`w-12 h-12 ring-2 transition-all ${
                                    selected
                                      ? 'ring-accent'
                                      : 'ring-transparent group-hover:ring-border'
                                  }`}
                                />
                                {selected && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-accent text-black flex items-center justify-center border-2 border-card">
                                    <Check size={12} strokeWidth={3} />
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] leading-tight text-center text-muted font-medium group-hover:text-foreground max-w-[64px] truncate">
                                {friendLabel(friend)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="h-px w-full bg-border" />

                  <div>
                    <h3 className="font-semibold text-[13px] tracking-wide text-muted uppercase mb-3">
                      Share to
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                      <button
                        type="button"
                        onClick={handleShareToStory}
                        disabled={sharingStory}
                        className="flex flex-col items-center flex-shrink-0 cursor-pointer group disabled:opacity-50"
                      >
                        <div className="w-12 h-12 rounded-full bg-card-hover group-hover:bg-card-hover/80 flex items-center justify-center mb-1 transition-colors">
                          <BookOpen size={20} className="text-foreground" />
                        </div>
                        <span className="text-[11px] font-medium text-muted group-hover:text-foreground">
                          {sharingStory ? '…' : 'Story'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={openGroupsPanel}
                        className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-full bg-card-hover group-hover:bg-card-hover/80 flex items-center justify-center mb-1 transition-colors">
                          <Users size={20} className="text-foreground" />
                        </div>
                        <span className="text-[11px] font-medium text-muted group-hover:text-foreground">
                          Groups
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-full bg-accent/20 group-hover:bg-accent/30 flex items-center justify-center mb-1 transition-colors">
                          <Link2 size={20} className="text-accent" />
                        </div>
                        <span className="text-[11px] font-medium text-foreground">
                          Copy Link
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExternalShare('whatsapp')}
                        className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-full bg-card-hover group-hover:bg-card-hover/80 flex items-center justify-center mb-1">
                          <MessageCircle size={20} className="text-foreground" />
                        </div>
                        <span className="text-[11px] font-medium text-muted group-hover:text-foreground">
                          WhatsApp
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExternalShare('messenger')}
                        className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-full bg-card-hover group-hover:bg-card-hover/80 flex items-center justify-center mb-1">
                          <MessageSquare size={20} className="text-foreground" />
                        </div>
                        <span className="text-[11px] font-medium text-muted group-hover:text-foreground">
                          Messenger
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-border shrink-0 bg-card pb-[max(env(safe-area-inset-bottom),1rem)]">
                  <Button
                    variant="primary"
                    onClick={handleShareToFriends}
                    isLoading={sharing}
                    disabled={!canShareNow}
                    className="w-full text-[16px] font-bold h-12 rounded-xl"
                  >
                    {selectedFriendIds.size === 0
                      ? 'Select friends to share'
                      : `Share Now (${selectedFriendIds.size})`}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                    />
                    <input
                      value={groupQuery}
                      onChange={(e) => setGroupQuery(e.target.value)}
                      placeholder="Search your groups…"
                      className="w-full bg-background border border-border rounded-full pl-9 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  {loadingGroups ? (
                    <p className="text-sm text-muted text-center py-8">Loading groups…</p>
                  ) : filteredGroups.length === 0 ? (
                    <p className="text-sm text-muted text-center py-8">
                      You’re not in any groups yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredGroups.map((group) => {
                        const selected = selectedGroupIds.has(group.id);
                        return (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => toggleGroup(group.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                              selected
                                ? 'border-accent bg-accent/10'
                                : 'border-border hover:bg-card-hover'
                            }`}
                          >
                            <Avatar
                              src={
                                (group as any).profile_image_url ||
                                group.image_url ||
                                group.avatar_url ||
                                undefined
                              }
                              alt={group.name}
                              size="md"
                            />
                            <span className="flex-1 font-medium text-sm truncate">
                              {group.name}
                            </span>
                            <span
                              className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                selected
                                  ? 'bg-accent border-accent text-black'
                                  : 'border-border'
                              }`}
                            >
                              {selected && <Check size={12} strokeWidth={3} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 border-t border-border shrink-0 bg-card pb-[max(env(safe-area-inset-bottom),1rem)]">
                  <Button
                    variant="primary"
                    onClick={handleShareToGroups}
                    isLoading={sharingGroups}
                    disabled={selectedGroupIds.size === 0 || sharingGroups}
                    className="w-full text-[16px] font-bold h-12 rounded-xl"
                  >
                    {selectedGroupIds.size === 0
                      ? 'Select groups to share'
                      : `Share to ${selectedGroupIds.size} group${selectedGroupIds.size > 1 ? 's' : ''}`}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ShareModal;
