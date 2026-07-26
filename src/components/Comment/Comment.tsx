import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { CornerDownRight, Heart, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../lib/axios';
import { useUser } from '../../context/UserContext';
import Avatar from '../../components/Avatar';
import ProfileLink from '../Profile/ProfileLink';
import InlineTranslate from '../InlineTranslate';
import PurgeIcon from '../Icons/PurgeIcon';

export interface CommentData {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isEdited?: boolean;
  parentId?: string | null;
  language?: string;
  likes?: number;
  likedByMe?: boolean;
  purges?: number;
  purgedByMe?: boolean;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
}

interface CommentProps {
  comment: CommentData;
  postId: string;
  depth?: number;
  /** Flat list of all secondary replies under a principal comment */
  replies?: CommentData[];
  onUpdate: () => void;
  onDelete: () => void;
  onReplyPosted?: () => void;
}

function isCommentEdited(createdAt: string, updatedAt: string, isEdited?: boolean) {
  if (isEdited) return true;
  if (!createdAt || !updatedAt) return false;
  return Math.abs(new Date(updatedAt).getTime() - new Date(createdAt).getTime()) > 1500;
}

const Comment: React.FC<CommentProps> = ({
  comment,
  postId,
  depth = 0,
  replies = [],
  onUpdate,
  onDelete,
  onReplyPosted,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [likes, setLikes] = useState(comment.likes || 0);
  const [likedByMe, setLikedByMe] = useState(Boolean(comment.likedByMe));
  const [liking, setLiking] = useState(false);
  const [purges, setPurges] = useState(comment.purges || 0);
  const [purgedByMe, setPurgedByMe] = useState(Boolean(comment.purgedByMe));
  const [purging, setPurging] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  React.useEffect(() => {
    setLikes(comment.likes || 0);
    setLikedByMe(Boolean(comment.likedByMe));
    setPurges(comment.purges || 0);
    setPurgedByMe(Boolean(comment.purgedByMe));
    setEditedContent(comment.content);
  }, [
    comment.id,
    comment.likes,
    comment.likedByMe,
    comment.purges,
    comment.purgedByMe,
    comment.content,
  ]);

  const isCommentOwner = user?.id === comment.user.id;
  const edited = isCommentEdited(comment.createdAt, comment.updatedAt, comment.isEdited);
  const isSecondary = depth > 0;

  const handleEdit = async () => {
    try {
      await api.put(`/comments/${comment.id}`, { content: editedContent });
      setIsEditing(false);
      onUpdate();
      toast.success(t('comments.updated', 'Comment updated'));
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('comments.updateFailed', 'Failed to update comment'));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('comments.deleteConfirm', 'Delete this comment?'))) return;
    try {
      setIsDeleting(true);
      await api.delete(`/comments/${comment.id}`);
      onDelete();
    } catch {
      toast.error(t('comments.deleteFailed', 'Failed to delete comment'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLike = async () => {
    if (liking || !user) return;
    setLiking(true);
    const prevLiked = likedByMe;
    const prevCount = likes;
    setLikedByMe(!prevLiked);
    setLikes(Math.max(0, prevCount + (prevLiked ? -1 : 1)));
    try {
      const { data } = await api.post(`/comments/${comment.id}/like`);
      setLikedByMe(Boolean(data.liked));
      setLikes(typeof data.likes === 'number' ? data.likes : prevCount);
    } catch (error: any) {
      setLikedByMe(prevLiked);
      setLikes(prevCount);
      toast.error(error?.response?.data?.error || t('comments.likeFailed', 'Failed to like comment'));
    } finally {
      setLiking(false);
    }
  };

  const handlePurge = async () => {
    if (purging || !user || isCommentOwner) return;
    setPurging(true);
    const prev = purgedByMe;
    const prevCount = purges;
    setPurgedByMe(!prev);
    setPurges(Math.max(0, prevCount + (prev ? -1 : 1)));
    try {
      const { data } = await api.post(`/comments/${comment.id}/purge`);
      setPurgedByMe(Boolean(data.purged));
      setPurges(typeof data.purges === 'number' ? data.purges : prevCount);
      if (data.commentHidden) {
        toast.success(t('comments.purgedHidden', 'Comment purged'));
        onUpdate();
      }
    } catch (error: any) {
      setPurgedByMe(prev);
      setPurges(prevCount);
      toast.error(error?.response?.data?.error || t('comments.purgeFailed', 'Failed to purge comment'));
    } finally {
      setPurging(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || replying) return;
    setReplying(true);
    try {
      await api.post(`/posts/${postId}/comments`, {
        content: replyText.trim(),
        parentId: comment.id,
        language: (i18n.language || 'en').split('-')[0],
      });
      setReplyText('');
      setShowReply(false);
      toast.success(t('comments.replyAdded', 'Reply added'));
      onReplyPosted?.();
      onUpdate();
    } catch (error: any) {
      const code = error?.response?.data?.code;
      if (code === 'PARENT_ID_MISSING') {
        toast.error(
          t(
            'comments.replyMigrationNeeded',
            'Replies need the database migration. Run 20260724_comment_replies.sql'
          )
        );
      } else {
        toast.error(error?.response?.data?.error || t('comments.replyFailed', 'Failed to reply'));
      }
    } finally {
      setReplying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className={`flex gap-2 py-1.5 ${isSecondary ? 'pl-0.5' : ''}`}
    >
      <ProfileLink username={comment.user.username} className="shrink-0 rounded-full mt-0.5">
        <Avatar src={comment.user.avatar} alt={comment.user.name} size="sm" />
      </ProfileLink>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full bg-card border border-border text-foreground rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent resize-none"
              rows={2}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditedContent(comment.content);
                }}
                className="px-3 py-1 text-xs text-muted hover:text-foreground"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleEdit}
                className="px-3 py-1 text-xs bg-accent text-black rounded-md font-medium"
              >
                {t('common.save', 'Save')}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div
              className={`inline-block max-w-full shadow-sm ${
                isSecondary
                  ? 'bg-muted/20 border border-border/50 rounded-2xl rounded-tl-md px-2.5 py-1.5'
                  : 'bg-card border border-border/60 rounded-2xl px-3 py-2'
              }`}
            >
              {isSecondary && (
                <div className="flex items-center gap-1 text-[10px] text-muted mb-0.5">
                  <CornerDownRight size={10} className="opacity-70" />
                  <span>{t('comments.replyLabel', 'Reply')}</span>
                </div>
              )}
              <ProfileLink
                username={comment.user.username}
                className={`font-semibold text-foreground hover:text-accent ${
                  isSecondary ? 'text-[12px]' : 'text-[13px]'
                }`}
              >
                {comment.user.name}
              </ProfileLink>
              <div className="mt-0.5">
                <InlineTranslate
                  content={comment.content}
                  claimedLanguage={comment.language}
                  tone="muted"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 mt-1.5 ml-1 flex-wrap">
              <span className="text-[11px] text-muted tabular-nums">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>

              {edited && (
                <span className="text-[10px] text-muted italic">
                  {t('comments.edited', 'edited')}
                </span>
              )}

              <button
                type="button"
                onClick={handleLike}
                disabled={liking}
                aria-label={likedByMe ? 'Unlike' : 'Like'}
                className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors ${
                  likedByMe ? 'text-red-400' : 'text-muted hover:text-red-400'
                }`}
              >
                <Heart size={13} className={likedByMe ? 'fill-current' : ''} strokeWidth={2} />
                {likes > 0 && <span>{likes}</span>}
              </button>

              <button
                type="button"
                onClick={() => setShowReply((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-accent transition-colors"
              >
                <MessageCircle size={12} />
                {t('comments.reply', 'Reply')}
              </button>

              {!isCommentOwner && (
                <button
                  type="button"
                  onClick={handlePurge}
                  disabled={purging}
                  title={t('comments.purge', 'Purge')}
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors ${
                    purgedByMe ? 'text-accent' : 'text-muted hover:text-red-400'
                  }`}
                >
                  <PurgeIcon size={13} className={purgedByMe ? '' : 'grayscale'} />
                  {purges > 0 && <span>{purges}</span>}
                </button>
              )}

              {isCommentOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-foreground font-semibold"
                  >
                    <Pencil size={12} />
                    {t('common.edit', 'Edit')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-red-400 font-semibold"
                  >
                    <Trash2 size={12} />
                    {isDeleting ? '…' : t('common.delete', 'Delete')}
                  </button>
                </>
              )}
            </div>

            {showReply && (
              <form onSubmit={handleReply} className="mt-2 flex gap-2 items-center">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t('comments.replyPlaceholder', `Reply to ${comment.user.name}…`, {
                    name: comment.user.name,
                  })}
                  className="flex-1 bg-background border border-border rounded-full px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted"
                  autoFocus
                  disabled={replying}
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || replying}
                  className="px-3 py-1.5 text-xs font-semibold rounded-full bg-accent text-black disabled:opacity-40"
                >
                  {replying ? '…' : t('comments.reply', 'Reply')}
                </button>
              </form>
            )}

            {!isSecondary && replies.length > 0 && (
              <div className="mt-2 ml-1 sm:ml-2 pl-3 border-l-2 border-accent/40 space-y-0.5">
                <p className="text-[10px] uppercase tracking-wide text-muted font-semibold mb-1">
                  {t('comments.repliesCount', '{{count}} replies', { count: replies.length })}
                </p>
                {replies.map((reply) => (
                  <Comment
                    key={reply.id}
                    comment={reply}
                    postId={postId}
                    depth={1}
                    replies={[]}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onReplyPosted={onReplyPosted}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Comment;
