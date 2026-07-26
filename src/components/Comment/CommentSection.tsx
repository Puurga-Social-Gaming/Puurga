import React, { useState, useEffect, useMemo } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../../lib/axios';
import { useUser } from '../../context/UserContext';
import Avatar from '../Avatar';
import type { Post } from '../../types';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';
import Comment, { type CommentData } from './Comment';

interface CommentSectionProps {
  postId: string;
  comments: CommentData[];
  onUpdate?: (post: Post) => void;
  onCommentCountChange?: (count: number) => void;
}

/** Collect every descendant under a principal comment, flat + chronological. */
function collectDescendants(
  rootId: string,
  byParent: Map<string, CommentData[]>
): CommentData[] {
  const out: CommentData[] = [];
  const queue = [...(byParent.get(rootId) || [])];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const next = queue.shift()!;
    if (seen.has(next.id)) continue;
    seen.add(next.id);
    out.push(next);
    const children = byParent.get(next.id) || [];
    for (const child of children) queue.push(child);
  }

  out.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  return out;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  comments: initialComments,
  onUpdate,
  onCommentCountChange,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState<CommentData[]>(initialComments || []);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/posts/${postId}/comments`);
      const list = Array.isArray(response.data) ? response.data : [];
      setComments(list);
      if (onCommentCountChange) onCommentCountChange(list.length);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const threads = useMemo(() => {
    const byParent = new Map<string, CommentData[]>();
    const idSet = new Set(comments.map((c) => c.id));
    const top: CommentData[] = [];

    for (const c of comments) {
      if (c.parentId && idSet.has(c.parentId)) {
        const list = byParent.get(c.parentId) || [];
        list.push(c);
        byParent.set(c.parentId, list);
      } else {
        // Orphans without a known parent stay as principal comments
        top.push(c);
      }
    }

    top.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return top.map((principal) => ({
      principal,
      replies: collectDescendants(principal.id, byParent),
    }));
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await api.post(`/posts/${postId}/comments`, {
        content: newComment.trim(),
        language: (i18n.language || 'en').split('-')[0],
      });
      setNewComment('');
      toast.success(t('comments.added', 'Comment added'));
      await fetchComments();
      if (onUpdate) {
        // parent may refresh post stats
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error(t('comments.addFailed', 'Failed to add comment'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentUpdate = async () => {
    await fetchComments();
  };

  const handleCommentDelete = async () => {
    await fetchComments();
    toast.success(t('comments.deleted', 'Comment deleted'));
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      const activeElement = document.activeElement as HTMLElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')
      ) {
        activeElement.blur();
      }
    }
  };

  const canSend = newComment.trim().length > 0 && !isSubmitting;

  return (
    <div className="space-y-2" onClick={handleBackdropClick}>
      <div className="space-y-3">
        {isLoading && comments.length === 0 ? (
          <div className="text-center text-muted py-3 text-sm">
            {t('comments.loading', 'Loading comments…')}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-muted py-3 text-xs">
            {t('comments.empty', 'No comments yet')}
          </div>
        ) : (
          threads.map(({ principal, replies }) => (
            <div
              key={principal.id}
              className="rounded-xl border border-border/40 bg-background/40 px-1.5 py-1"
            >
              <Comment
                comment={principal}
                postId={postId}
                depth={0}
                replies={replies}
                onUpdate={handleCommentUpdate}
                onDelete={handleCommentDelete}
                onReplyPosted={handleCommentUpdate}
              />
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 items-center pt-2">
        <Avatar
          src={user?.avatar || DEFAULT_IMAGES.avatar}
          alt={user?.name || 'User avatar'}
          size="sm"
        />
        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('comments.placeholder', 'Write a comment…')}
            className="w-full bg-card border border-border text-foreground rounded-full pl-4 pr-11 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label={t('comments.send', 'Send comment')}
            className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
              canSend
                ? 'bg-accent text-black hover:opacity-90'
                : 'bg-transparent text-muted opacity-50'
            }`}
          >
            {isSubmitting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentSection;
