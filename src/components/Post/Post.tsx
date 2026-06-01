import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, MoreHorizontal, Pencil, X, AlertTriangle, Skull, Ghost, Flame } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { Post as PostType, ReactionCount } from '../../types';
import api from '../../lib/axios';
import { motion, AnimatePresence } from 'framer-motion';
import CommentSection from '../Comment/CommentSection';
import PostReactions from './PostReactions';
import ShareButton from './ShareButton';
import { useSurvival } from '../../context/SurvivalContext';

import SupabaseImage from '../UI/SupabaseImage';
import SupabaseVideo from '../UI/SupabaseVideo';
import Avatar from '../Avatar';
import RichText from '../RichText/RichText';

// Post background presets (matching CreatePost)
const BACKGROUND_PRESETS = [
  { type: 'none', label: 'None', value: 0, class: 'bg-transparent' },
  { type: 'color', label: 'Warm', value: 1, class: 'bg-orange-100' },
  { type: 'color', label: 'Cool', value: 2, class: 'bg-blue-100' },
  { type: 'color', label: 'Nature', value: 3, class: 'bg-green-100' },
  { type: 'color', label: 'Sunset', value: 4, class: 'bg-yellow-100' },
  { type: 'gradient', label: 'Ocean', value: 5, class: 'bg-gradient-to-br from-blue-500 to-purple-600' },
  { type: 'gradient', label: 'Sunrise', value: 6, class: 'bg-gradient-to-br from-pink-500 to-orange-500' },
  { type: 'gradient', label: 'Forest', value: 7, class: 'bg-gradient-to-br from-green-500 to-teal-600' },
];

interface PostProps {
  post: PostType;
  onUpdate?: (post: PostType) => void;
  variant?: 'feed' | 'card' | 'compact';
}

const Post: React.FC<PostProps> = ({ post, onUpdate, variant = 'feed' }) => {
  // Variant-based styling
  const containerClasses = {
    feed: 'py-1',
    card: 'p-1.5 rounded-xl border border-border shadow-theme-sm hover:shadow-theme-md transition-shadow',
    compact: 'py-0.5',
  };
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [editedBackgroundIndex, setEditedBackgroundIndex] = useState(post.background_index || 0);
  const [isPurging, setIsPurging] = useState(false);
  const [localPurges, setLocalPurges] = useState(post.purges || 0);
  const [showAllImages, setShowAllImages] = useState(false);
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
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (commentSectionRef.current && !commentSectionRef.current.contains(event.target as Node)) {
        setShowComments(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleCommentUpdate = (updatedPost: PostType) => {
    if (updatedPost.comments !== undefined) {
      setCommentCount(updatedPost.comments);
    }
    if (onUpdate) onUpdate(updatedPost);
  };

  const handleDeletePost = async () => {
    if (!window.confirm(t('post.deleteConfirm'))) return;
    try {
      const response = await api.delete(`/posts/${post.id}`);
      if (response.status === 200) {
        toast.success(t('post.postDeleted'));
        if (onUpdate) onUpdate({ ...post, deleted: true } as PostType);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(t('post.deleteFailed'));
    }
  };

  const handlePurgeClick = async () => {
    if (isPurging || isPurged) return;
    try {
      setIsPurging(true);
      const response = await api.post(`/posts/${post.id}/purge`);
      const newPurgeCount = response.data.purges;
      setLocalPurges(newPurgeCount);
      setIsPurged(true);
      if (newPurgeCount >= 5) {
        toast.error(`Post has been purged ${newPurgeCount} times.`, { duration: 4000 });
      } else {
        toast.success('Post purged!');
      }
      if (onUpdate) onUpdate({ ...post, purges: newPurgeCount, purged: true });
    } catch (error: any) {
      console.error('Error purging post:', error);
      if (error.response?.status === 403 && error.response?.data?.code === 'OWN_POST') {
        toast.error('You cannot purge your own posts', { duration: 3000 });
      } else if (error.response?.status === 400 && error.response?.data?.code === 'ALREADY_PURGED') {
        toast.error('You have already purged this post', { duration: 3000 });
        setIsPurged(true);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message, { duration: 3000 });
      } else {
        toast.error('Failed to purge post');
      }
    } finally {
      setIsPurging(false);
    }
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
  const getBackgroundClass = () => {
    const index = post.background_index || 0;
    return BACKGROUND_PRESETS[index]?.class || 'bg-transparent';
  };

  const textColorClass = post.background_index && post.background_index !== 0
    ? 'text-gray-900'
    : 'text-foreground';

  const hasBackground = post.background_index && post.background_index !== 0;

  return (
    <div id={`post-${post.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className={containerClasses[variant]}
      >
        {/* Card */}
        <div className="rounded-xl bg-card/50 backdrop-blur-sm border border-border/40 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">

          {/* Header row */}
          <div className="flex items-center gap-2 px-3 pt-2.5 pb-0">
            <Link to={`/profile/${post.user.username}`} className="shrink-0">
              <Avatar
                src={post.user.avatar || '/default-avatar.png'}
                alt={post.user.name}
                size="sm"
                userId={post.user.id}
                showOnlineStatus={true}
                expandOnTap={true}
              />
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <Link
                  to={`/profile/${post.user.username}`}
                  className="font-semibold text-[12.5px] leading-tight text-foreground hover:text-accent hover:underline truncate"
                >
                  {post.user.name}
                </Link>
                {STATE_ICONS[authorState]}
              </div>
              <p className="text-[10px] text-muted/60 leading-none mt-0.5">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>

            {/* Menu */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={handleMenuToggle}
                className="w-6 h-6 flex items-center justify-center text-muted/50 hover:text-foreground hover:bg-border/40 rounded-full transition-all"
                type="button"
              >
                <MoreHorizontal size={13} />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-1 w-44 bg-card rounded-lg shadow-lg overflow-hidden z-10 border border-border/60"
                  >
                    <button
                      onClick={handleEdit}
                      className="w-full px-3 py-2 text-left text-[12px] text-foreground flex items-center gap-2 hover:bg-card-hover transition-colors"
                      type="button"
                    >
                      <Pencil size={13} />
                      {t('post.editPost')}
                    </button>
                    <button
                      onClick={handleDeletePost}
                      className="w-full px-3 py-2 text-left text-[12px] text-red-500 flex items-center gap-2 hover:bg-red-500/10 transition-colors"
                      type="button"
                    >
                      <X size={13} />
                      {t('post.deletePost')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Content */}
          <div className="px-3 pt-2 pb-0">
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {/* Background pickers */}
                  <div className="flex gap-1 mb-2">
                    {BACKGROUND_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setEditedBackgroundIndex(preset.value)}
                        className={`w-5 h-5 rounded ${preset.class} hover:scale-110 transition-transform ${preset.value === editedBackgroundIndex ? 'ring-2 ring-accent ring-offset-1 ring-offset-card' : ''
                          }`}
                        title={preset.label}
                      />
                    ))}
                  </div>
                  <div className={`rounded-lg p-2 ${BACKGROUND_PRESETS[editedBackgroundIndex]?.class || 'bg-transparent'}`}>
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className={`w-full rounded-md px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-1 focus:ring-accent transition-shadow ${editedBackgroundIndex !== 0
                          ? 'bg-transparent text-gray-900 placeholder-gray-600'
                          : 'bg-input text-foreground placeholder-muted'
                        }`}
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
                    <div className={`rounded-lg px-3 py-2.5 ${getBackgroundClass()}`}>
                      <div className={`text-[13px] leading-relaxed ${textColorClass}`}>
                        <RichText
                          content={displayText}
                          showLinkPreviews={true}
                          compactLinks={false}
                          onHashtagClick={(tag) => console.log('Hashtag clicked:', tag)}
                          onMentionClick={(username) => console.log('Mention clicked:', username)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className={`text-[13px] leading-relaxed ${textColorClass}`}>
                      <RichText
                        content={displayText}
                        showLinkPreviews={true}
                        compactLinks={false}
                        onHashtagClick={(tag) => console.log('Hashtag clicked:', tag)}
                        onMentionClick={(username) => console.log('Mention clicked:', username)}
                      />
                    </div>
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

          {/* Media */}
          {post.images && post.images.length > 0 && (() => {
            const media = post.images;
            const shouldShowExpand = media.length > 2 && !showAllImages;
            const mediaToShow = shouldShowExpand ? media.slice(0, 2) : media;
            const remainingCount = media.length - 2;

            const getGridClasses = () => {
              if (media.length === 1) return 'grid-cols-1';
              const layout = post.media_layout || 'grid';
              switch (layout) {
                case 'rows': return 'grid-cols-1';
                case 'columns': return 'grid-cols-2 gap-1';
                case 'grid':
                default: return 'grid-cols-2 sm:grid-cols-3 gap-1';
              }
            };

            const getMediaClasses = (isSingle: boolean, isVideo: boolean, layout?: string) => {
              if (isSingle) return isVideo ? 'aspect-video w-full max-h-[240px] sm:max-h-[300px] object-cover' : 'aspect-[4/5] w-full max-h-[240px] sm:max-h-[300px] object-cover';
              const mediaLayout = layout || 'grid';
              switch (mediaLayout) {
                case 'rows': return isVideo ? 'h-[18vh] sm:h-[22vh] max-h-[220px] w-full object-cover' : 'h-[18vh] sm:h-[22vh] max-h-[220px] w-full object-cover';
                case 'columns': return isVideo ? 'aspect-video w-full object-cover' : 'aspect-[3/4] w-full object-cover';
                case 'grid':
                default: return isVideo ? 'aspect-video w-full object-cover' : 'aspect-[3/4] w-full object-cover';
              }
            };

            const isVideoUrl = (url: string) => {
              const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv'];
              return videoExtensions.some(ext => url.toLowerCase().includes(ext));
            };

            return (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-2 grid gap-0.5 overflow-hidden ${getGridClasses()}`}
              >
                {mediaToShow.map((mediaUrl, index) => {
                  const isVideo = isVideoUrl(mediaUrl);
                  return (
                    <div key={index} className="relative overflow-hidden">
                      {isVideo ? (
                        <div className="cursor-pointer" onClick={() => handleVideoClick(mediaUrl)}>
                          <SupabaseVideo
                            src={mediaUrl}
                            controls={playingVideoId === mediaUrl}
                            muted={playingVideoId !== mediaUrl}
                            playsInline={true}
                            autoPlay={playingVideoId === mediaUrl}
                            className={`transition-opacity duration-150 ${getMediaClasses(media.length === 1, true, post.media_layout)}`}
                          />
                          {playingVideoId !== mediaUrl && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div onClick={() => handleMediaClick(mediaUrl, false)} className="cursor-pointer">
                          <SupabaseImage
                            src={mediaUrl}
                            alt={`Post image ${index + 1}`}
                            className={`transition-opacity duration-150 hover:opacity-95 ${getMediaClasses(media.length === 1, false, post.media_layout)}`}
                          />
                        </div>
                      )}
                      {shouldShowExpand && index === 1 && (
                        <button
                          onClick={() => setShowAllImages(true)}
                          className="absolute inset-0 bg-foreground/55 hover:bg-foreground/65 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <div className="text-background text-center">
                            <div className="text-base font-bold">+{remainingCount}</div>
                            <div className="text-[10px] opacity-80">more</div>
                          </div>
                        </button>
                      )}
                    </div>
                  );
                })}
                {showAllImages && media.length > 2 && (
                  <>
                    {media.slice(2).map((mediaUrl, index) => {
                      const isVideo = isVideoUrl(mediaUrl);
                      return (
                        <motion.div key={index + 2} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden">
                          {isVideo ? (
                            <div className="cursor-pointer" onClick={() => handleVideoClick(mediaUrl)}>
                              <SupabaseVideo
                                src={mediaUrl}
                                controls={playingVideoId === mediaUrl}
                                muted={playingVideoId !== mediaUrl}
                                playsInline={true}
                                autoPlay={playingVideoId === mediaUrl}
                                className={`${getMediaClasses(false, true, post.media_layout)}`}
                              />
                              {playingVideoId !== mediaUrl && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div onClick={() => handleMediaClick(mediaUrl, false)} className="cursor-pointer">
                              <SupabaseImage src={mediaUrl} alt={`Post image ${index + 3}`} className={`${getMediaClasses(false, false, post.media_layout)}`} />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </>
                )}
              </motion.div>
            );
          })()}

          {/* Action bar */}
          <div className="flex items-center justify-between px-2 py-1.5 mt-1 border-t border-border/20">
            <div className="flex items-center gap-0.5">
              <PostReactions postId={post.id} initialReactions={post.reactions || {}} onReactionChange={handleReactionChange} />
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleCommentClick}
                className={`h-6 px-2 flex items-center gap-1 rounded-full text-muted hover:text-accent transition-all hover:bg-accent/8 ${showComments ? 'text-accent bg-accent/8' : ''}`}
                type="button"
              >
                <MessageCircle size={13} className={showComments ? 'fill-accent/20' : ''} />
                <span className="text-[11px] font-medium tabular-nums">{commentCount}</span>
              </motion.button>
            </div>

            <div className="flex items-center gap-0.5">
              <ShareButton postId={post.id} postContent={post.content} postAuthor={post.user.name} postAuthorAvatar={post.user.avatar} />
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handlePurgeClick}
                disabled={isPurging}
                className={`h-6 px-2 flex items-center gap-1 rounded-full transition-all ${isPurged ? 'text-accent bg-accent/8' : 'text-muted hover:text-red-400 hover:bg-red-400/8'
                  } ${isPurging ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Purge post"
              >
                <SupabaseImage
                  src="https://vhvxfnxtyrgiydztsonz.supabase.co/storage/v1/object/public/icons/purge.png"
                  alt="Purge"
                  className={`w-3.5 h-3.5 transition-all ${isPurging ? 'animate-pulse' : ''} ${isPurged ? 'drop-shadow-[0_0_6px_rgba(var(--accent-rgb),0.5)]' : 'grayscale'}`}
                />
                <span className="text-[11px] font-medium tabular-nums">{localPurges}</span>
              </motion.button>
            </div>
          </div>

          {/* Comment section */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                ref={commentSectionRef}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="border-t border-border/20 px-2 pb-2 pt-1"
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