import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, MoreHorizontal, Pencil, X, AlertTriangle, Skull, Ghost, Flame, ThumbsDown, Globe, Download, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { Post as PostType, ReactionCount } from '../../types';
import api from '../../lib/axios';
import { motion, AnimatePresence } from 'framer-motion';
import CommentSection from '../Comment/CommentSection';
import PostReactions from './PostReactions';
import ShareButton from './ShareButton';
import PostMediaGallery from './PostMediaGallery';
import { useSurvival } from '../../context/SurvivalContext';
import { useUser } from '../../context/UserContext';
import { BACKGROUND_PRESETS, getPostBackgroundPreset } from '../../constants/postBackgrounds';

import SupabaseVideo from '../ui/SupabaseVideo';
import Avatar from '../Avatar';
import RichText from '../RichText/RichText';
import PurgeIcon from '../Icons/PurgeIcon';
import InlineTranslate from '../InlineTranslate';
import CertificationBadges from '../Profile/CertificationBadges';
import { downloadPostCapture } from '../../utils/downloadPostCapture';
import { POST_PURGE_THRESHOLD } from '../../constants/purgeConstants';

interface PostProps {
  post: PostType;
  onUpdate?: (post: PostType & { deleted?: boolean; hidden?: boolean }) => void;
  variant?: 'feed' | 'card' | 'compact';
}

const Post: React.FC<PostProps> = ({ post, onUpdate, variant = 'feed' }) => {
  // Variant-based styling
  const containerClasses = {
    feed: 'py-3',
    card: 'p-1.5 rounded-xl border border-border shadow-theme-sm hover:shadow-theme-md transition-shadow',
    compact: 'py-0.5',
  };
  const { t } = useTranslation();
  const { user } = useUser();
  const isOwner =
    !!user?.id &&
    (String(user.id) === String(post.userId) || String(user.id) === String(post.user?.id));
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [editedBackgroundIndex, setEditedBackgroundIndex] = useState(post.background_index || 0);
  const [isPurging, setIsPurging] = useState(false);
  const [localPurges, setLocalPurges] = useState(post.purges || 0);
  const [isPurged, setIsPurged] = useState(post.purged || false);
  const { survivalState: mySurvival } = useSurvival();
  const authorState = mySurvival?.current_survival_state || 'SAFE';
  const STATE_ICONS: Record<string, React.ReactNode> = {
    SAFE: null,
    WARNING: <AlertTriangle size={9} className="text-amber-400" />,
    HUNTED: <Flame size={9} className="text-orange-400" />,
    COLLAPSING: <Skull size={9} className="text-red-500" />,
    GHOSTED: <Ghost size={9} className="text-gray-400" />,
  };
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments || 0);
  const commentSectionRef = useRef<HTMLDivElement>(null);
  const commentButtonRef = useRef<HTMLButtonElement>(null);
  const [translateToken, setTranslateToken] = useState(0);
  const [isTranslatedView, setIsTranslatedView] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [expandedMedia, setExpandedMedia] = useState<{ url: string; isVideo: boolean } | null>(null);

  // Text truncation for mobile (typical social media limit is ~150-200 chars)
  const TEXT_LIMIT = 150;
  const shouldTruncate = post.content.length > TEXT_LIMIT;
  const displayText = isExpanded || !shouldTruncate
    ? post.content
    : post.content.substring(0, TEXT_LIMIT) + '...';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setShowMenu(false);
      }
      if (!showComments) return;
      if (commentSectionRef.current?.contains(target)) return;
      if (commentButtonRef.current?.contains(target)) return;
      setShowComments(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showComments]);

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(post.content);
    setEditedBackgroundIndex(post.background_index || 0);
    setShowMenu(false);
  };

  const handleSaveEdit = async () => {
    try {
      const response = await api.put(`/posts/${post.id}`, {
        content: editedContent,
        background_index: editedBackgroundIndex
      });
      if (response.status === 200) {
        toast.success(t('post.postUpdated'));
        setIsEditing(false);
        if (onUpdate) onUpdate({ ...post, content: editedContent, background_index: editedBackgroundIndex });
      }
    } catch (error: any) {
      console.error('Error updating post:', error);
      const serverMsg = error?.response?.data?.error || error?.data?.error || error?.message;
      toast.error(serverMsg || t('post.updateFailed'));
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(post.content);
    setEditedBackgroundIndex(post.background_index || 0);
    setIsEditing(false);
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowComments(!showComments);
  };

  const handleTranslateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!post.content?.trim()) {
      toast.error(t('post.nothingToTranslate', 'No text to translate'));
      return;
    }
    setTranslateToken((n) => n + 1);
  };

  const handleDownloadPost = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const safeName = (post.user.username || post.user.name || 'post')
        .replace(/[^a-z0-9_-]/gi, '')
        .slice(0, 24);
      await downloadPostCapture(
        {
          authorName: post.user.name || post.user.username || 'Puurga user',
          authorUsername: post.user.username,
          authorAvatar: post.user.avatar,
          content: post.content,
          images: post.images || [],
          createdLabel: formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }),
        },
        `puurga-${safeName || 'post'}-${String(post.id).slice(0, 8)}.png`
      );
      toast.success(t('post.downloaded', 'Post saved as image'));
    } catch (err) {
      console.error('Post download failed:', err);
      toast.error(t('post.downloadFailed', 'Could not download post'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCommentUpdate = (updatedPost: PostType) => {
    if (updatedPost.comments !== undefined) {
      setCommentCount(updatedPost.comments);
    }
    if (onUpdate) onUpdate(updatedPost);
  };

  const handleDeletePost = async () => {
    if (!isOwner) return;
    if (!window.confirm(t('post.deleteConfirm'))) return;
    setShowMenu(false);
    try {
      const response = await api.delete(`/posts/${post.id}`);
      if (response.status === 200) {
        toast.success(t('post.postDeleted'));
        if (onUpdate) onUpdate({ ...post, deleted: true });
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(t('post.deleteFailed'));
    }
  };

  const handlePurgeClick = async () => {
    if (isOwner) {
      toast.error(t('post.cannotPurgeOwn', 'You cannot purge your own posts'), { duration: 3000 });
      return;
    }
    if (isPurging || isPurged) return;
    try {
      setIsPurging(true);
      const response = await api.post(`/posts/${post.id}/purge`);
      const newPurgeCount = response.data?.purges ?? (localPurges + 1);
      setLocalPurges(newPurgeCount);
      setIsPurged(true);
      if (newPurgeCount >= 5) {
        toast.error(t('post.purgeThreshold', 'This post has been purged {{count}} times.', { count: newPurgeCount }), { duration: 4000 });
      } else {
        toast.success(t('post.purgeDone', 'Purge counted'));
      }
      if (onUpdate) onUpdate({ ...post, purges: newPurgeCount, purged: true });
    } catch (error: any) {
      console.error('Error purging post:', error);
      const status = error.response?.status;
      const code = error.response?.data?.code;
      const message = error.response?.data?.error || error.response?.data?.message;

      if (status === 403 && code === 'OWN_POST') {
        toast.error(t('post.cannotPurgeOwn', 'You cannot purge your own posts'), { duration: 3000 });
      } else if (status === 400 && code === 'ALREADY_PURGED') {
        toast.success(t('post.alreadyPurged', 'You have already purged this post'));
        setIsPurged(true);
        if (onUpdate) onUpdate({ ...post, purged: true });
      } else if (message) {
        toast.error(message, { duration: 3000 });
      } else if (status === 500 || !status) {
        toast.error(t('post.purgeFailed', 'Failed to purge post. Try again.'), { duration: 3000 });
      } else {
        toast.error(t('post.purgeFailed', 'Failed to purge post'));
      }
    } finally {
      setIsPurging(false);
      setShowMenu(false);
    }
  };

  const handleDontLike = () => {
    void handlePurgeClick();
  };

  const handleReactionChange = (reactions: { [key: string]: ReactionCount }) => {
    if (onUpdate) onUpdate({ ...post, reactions });
  };

  const handleVideoClick = (mediaUrl: string) => {
    setPlayingVideoId(playingVideoId === mediaUrl ? null : mediaUrl);
  };

  const handleMediaClick = (mediaUrl: string, isVideo: boolean) => {
    if (isVideo) {
      setExpandedMedia({ url: mediaUrl, isVideo: true });
    } else {
      setExpandedMedia({ url: mediaUrl, isVideo: false });
    }
  };

  // Get background class for post (like status system)
  const bgPreset = getPostBackgroundPreset(post.background_index);
  const getBackgroundClass = () => bgPreset.class;
  const textColorClass = bgPreset.textClass;
  const hasBackground = Boolean(post.background_index && post.background_index !== 0);
  const editBgPreset = getPostBackgroundPreset(editedBackgroundIndex);

  return (
    <div id={`post-${post.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className={containerClasses[variant]}
      >
        {/* Card */}
        <div className="rounded-2xl bg-card backdrop-blur-sm border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">

          {/* Header row */}
          <div className="flex items-center gap-3 px-4 pt-3 pb-0">
            <Link to={`/profile/${post.user.username}`} className="shrink-0">
              <Avatar
                src={post.user.avatar || undefined}
                alt={post.user.name}
                size="sm"
                userId={post.user.id}
                showOnlineStatus={true}
                expandOnTap={true}
              />
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Link
                  to={`/profile/${post.user.username}`}
                  className="font-semibold text-[13px] leading-tight text-foreground hover:text-accent no-underline hover:no-underline truncate"
                >
                  {post.user.name}
                </Link>
                <CertificationBadges
                  certificationSlug={post.user.certificationSlug}
                  logoCertified={post.user.logoCertified}
                  size="sm"
                />
                {STATE_ICONS[authorState]}
              </div>
              <p className="text-[11px] text-muted/60 leading-none mt-0.5">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>

            {/* Menu — edit/delete for author only; "don't like" for others */}
            <div className="relative shrink-0" ref={menuRef} data-capture-ignore="true">
              <button
                onClick={handleMenuToggle}
                className="w-7 h-7 flex items-center justify-center text-muted/50 hover:text-foreground hover:bg-border/40 rounded-full transition-all touch-manipulation"
                type="button"
                aria-label="Post options"
              >
                <MoreHorizontal size={14} />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-1 w-48 bg-card rounded-lg shadow-lg overflow-hidden z-20 border border-border/60"
                  >
                    {isOwner ? (
                      <>
                        <button
                          onClick={handleEdit}
                          className="w-full px-3 py-2.5 text-left text-[12px] text-foreground flex items-center gap-2 hover:bg-card-hover transition-colors"
                          type="button"
                        >
                          <Pencil size={13} />
                          {t('post.editPost')}
                        </button>
                        <button
                          onClick={handleDeletePost}
                          className="w-full px-3 py-2.5 text-left text-[12px] text-red-500 flex items-center gap-2 hover:bg-red-500/10 transition-colors"
                          type="button"
                        >
                          <X size={13} />
                          {t('post.deletePost')}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleDontLike}
                        disabled={isPurging || isPurged}
                        className="w-full px-3 py-2.5 text-left text-[12px] text-red-500 flex items-center gap-2 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        type="button"
                      >
                        <ThumbsDown size={13} />
                        {t('post.dontLike', "I don't like this")}
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pt-2.5 pb-0">
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {/* Background pickers */}
                  <div className="mb-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted mb-1.5">
                      {t('post.background', 'Background')}
                    </p>
                    <div className="flex gap-1.5 flex-wrap max-h-24 overflow-y-auto pr-0.5">
                      {BACKGROUND_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setEditedBackgroundIndex(preset.value)}
                          className={`w-7 h-7 rounded-md shrink-0 ${preset.swatchClass || preset.class} hover:scale-110 transition-transform ${
                            preset.value === editedBackgroundIndex
                              ? 'ring-2 ring-accent ring-offset-1 ring-offset-card'
                              : 'ring-1 ring-black/5'
                          }`}
                          title={preset.label}
                          aria-label={preset.label}
                        />
                      ))}
                    </div>
                  </div>
                  <div
                    className={`rounded-xl p-3 min-h-[88px] ${editBgPreset.class} ${
                      editedBackgroundIndex !== 0 ? '' : 'border border-border/50'
                    }`}
                  >
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className={`w-full rounded-md px-2 py-1.5 text-[13px] resize-none focus:outline-none bg-transparent transition-shadow ${editBgPreset.textClass} placeholder:opacity-50`}
                      rows={3}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-end gap-1.5 pb-2">
                    <button onClick={handleCancelEdit} className="px-3 py-1 text-[11px] text-muted hover:text-foreground transition-colors rounded-md" type="button">
                      {t('post.cancel')}
                    </button>
                    <button onClick={handleSaveEdit} className="px-3 py-1 text-[11px] bg-accent hover:bg-accent-hover text-black rounded-md font-medium transition-colors" type="button">
                      {t('post.save')}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {/* Post text — only wrap in a styled box if there's a background */}
                  {hasBackground ? (
                    <div className={`rounded-xl px-4 py-3.5 ${getBackgroundClass()}`}>
                      <InlineTranslate
                        content={displayText}
                        claimedLanguage={(post as any).language}
                        tone="onAccent"
                        showControl={false}
                        triggerToken={translateToken}
                        onTranslatedChange={setIsTranslatedView}
                        renderContent={(text) => (
                          <div className={`text-[14px] sm:text-[13px] leading-relaxed font-medium ${textColorClass}`}>
                            <RichText
                              content={text}
                              showLinkPreviews={true}
                              compactLinks={false}
                              onHashtagClick={(tag) => console.log('Hashtag clicked:', tag)}
                              onMentionClick={(username) => console.log('Mention clicked:', username)}
                            />
                          </div>
                        )}
                      />
                    </div>
                  ) : (
                    <InlineTranslate
                      content={displayText}
                      claimedLanguage={(post as any).language}
                      tone="muted"
                      showControl={false}
                      triggerToken={translateToken}
                      onTranslatedChange={setIsTranslatedView}
                      renderContent={(text) => (
                        <div className={`text-[13px] leading-relaxed ${textColorClass}`}>
                          <RichText
                            content={text}
                            showLinkPreviews={true}
                            compactLinks={false}
                            onHashtagClick={(tag) => console.log('Hashtag clicked:', tag)}
                            onMentionClick={(username) => console.log('Mention clicked:', username)}
                          />
                        </div>
                      )}
                    />
                  )}
                  {shouldTruncate && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="mt-0.5 text-accent hover:text-accent-hover text-[11px] font-medium transition-colors"
                    >
                      {isExpanded ? t('post.readLess') : t('post.readMore')}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Media — same inset as text / profile posts (aligned edges) */}
          {post.images && post.images.length > 0 && (
            <div className="px-4">
              <PostMediaGallery
                media={post.images}
                playingVideoId={playingVideoId}
                onVideoClick={handleVideoClick}
                onMediaClick={handleMediaClick}
              />
            </div>
          )}

          {/* Action bar */}
          <div
            className="flex items-center justify-between px-3 py-2 mt-2 border-t border-border/20"
            data-capture-ignore="true"
          >
            <div className="flex items-center gap-1">
              {!isOwner && (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handlePurgeClick}
                  disabled={isPurging}
                  className={`h-7 px-2.5 flex items-center gap-1.5 rounded-full transition-all ${
                    isPurged ? 'text-accent bg-accent/8' : 'text-muted hover:text-red-400 hover:bg-red-400/8'
                  } ${isPurging ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={t('post.dontLike', "I don't like this")}
                  type="button"
                >
                  <PurgeIcon
                    size={16}
                    className={`transition-all ${isPurging ? 'animate-pulse' : ''} ${
                      isPurged ? 'drop-shadow-[0_0_6px_rgba(var(--accent-rgb),0.5)]' : 'grayscale'
                    }`}
                  />
                  <span className="text-[11.5px] font-medium tabular-nums">{localPurges}</span>
                </motion.button>
              )}
              <PostReactions postId={post.id} initialReactions={post.reactions || {}} onReactionChange={handleReactionChange} />
              <motion.button
                ref={commentButtonRef}
                whileTap={{ scale: 0.92 }}
                onClick={handleCommentClick}
                className={`h-7 px-2.5 flex items-center gap-1.5 rounded-full text-muted hover:text-accent transition-all hover:bg-accent/8 ${showComments ? 'text-accent bg-accent/8' : ''}`}
                type="button"
                aria-expanded={showComments}
                aria-label={showComments ? 'Hide comments' : 'Show comments'}
              >
                <MessageCircle size={16} className={showComments ? 'fill-accent/20' : ''} />
                <span className="text-[11.5px] font-medium tabular-nums">{commentCount}</span>
              </motion.button>
            </div>

            <div className="flex items-center gap-0.5">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleTranslateClick}
                type="button"
                title={
                  isTranslatedView
                    ? t('common.viewOriginal', 'View original')
                    : t('common.viewTranslated', 'Translate')
                }
                aria-label={t('common.viewTranslated', 'Translate')}
                className={`h-7 w-7 flex items-center justify-center rounded-full transition-all ${
                  isTranslatedView
                    ? 'text-accent bg-accent/10'
                    : 'text-muted hover:text-accent hover:bg-accent/8'
                }`}
              >
                <Globe size={16} />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleDownloadPost}
                type="button"
                disabled={isDownloading}
                title={t('post.downloadPost', 'Download post')}
                aria-label={t('post.downloadPost', 'Download post')}
                className={`h-7 w-7 flex items-center justify-center rounded-full text-muted hover:text-accent hover:bg-accent/8 transition-all ${
                  isDownloading ? 'opacity-50 cursor-wait' : ''
                }`}
              >
                {isDownloading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
              </motion.button>

              <ShareButton
                postId={post.id}
                postContent={post.content}
                postAuthor={post.user.username || post.user.name}
                postAuthorAvatar={post.user.avatar}
                postImages={post.images || []}
              />
            </div>
          </div>

          {/* Purge progress indicator */}
          {(() => {
            const ratio = localPurges / POST_PURGE_THRESHOLD;
            const color = localPurges >= 200 ? 'bg-red-500'
              : localPurges >= 150 ? 'bg-orange-500'
              : localPurges >= 75 ? 'bg-yellow-500'
              : 'bg-green-500';
            return (
              <div className="px-3 pb-1" title={`${localPurges} / ${POST_PURGE_THRESHOLD} purges before removal`}>
                <div className="h-0.5 w-full bg-muted/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Comment section */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                ref={commentSectionRef}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="border-t border-border/20 px-4 pb-3 pt-2"
                data-capture-ignore="true"
              >
                <CommentSection
                  postId={post.id}
                  comments={post.Comments || []}
                  onUpdate={handleCommentUpdate}
                  onCommentCountChange={setCommentCount}
                />
              </motion.div>
            )}
          </AnimatePresence>
          {variant === 'feed' && (
            <div className="h-6 w-full bg-gradient-to-t from-background/60 to-transparent pointer-events-none" />
          )}
        </div>

        {/* Lightbox */}
        <AnimatePresence>
          {expandedMedia && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpandedMedia(null)}
              className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
            >
              <motion.div
                initial={{ scale: 0.92 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.92 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-4xl max-h-[90vh] w-full"
              >
                <button
                  onClick={() => setExpandedMedia(null)}
                  className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors z-10"
                >
                  <X size={26} />
                </button>
                {expandedMedia.isVideo ? (
                  <SupabaseVideo
                    src={expandedMedia.url}
                    controls={true}
                    muted={false}
                    playsInline={true}
                    className="w-full h-full max-h-[85vh] rounded-lg"
                  />
                ) : (
                  <img
                    src={expandedMedia.url}
                    alt="Expanded post image"
                    className="w-full h-full object-contain rounded-lg"
                  />
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Post;