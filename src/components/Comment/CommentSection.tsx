import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../lib/axios';
import { useUser } from '../../context/UserContext';
import Avatar from '../Avatar';
import type { Post } from '../../types';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';
import Comment from './Comment';

interface CommentSectionProps {
  postId: string;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      name: string;
      username: string;
      avatar: string;
    };
  }>;
  onUpdate?: (post: Post) => void;
  onCommentCountChange?: (count: number) => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId, comments: initialComments, onUpdate, onCommentCountChange }) => {
  const { user } = useUser();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/posts/${postId}/comments`);
      setComments(response.data);

      // Update comment count
      if (onCommentCountChange) {
        onCommentCountChange(response.data.length);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await api.post(`/posts/${postId}/comments`, {
        content: newComment.trim()
      });

      // Add new comment to the list
      const newComments = [...comments, response.data];
      setComments(newComments);
      setNewComment('');
      toast.success('Comment added');

      // Update comment count
      if (onCommentCountChange) {
        onCommentCountChange(newComments.length);
      }

      // Update post comment count
      if (onUpdate) {
        await fetchComments();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentUpdate = async () => {
    await fetchComments();
  };

  const handleCommentDelete = async () => {
    await fetchComments();
    toast.success('Comment deleted');
  };

  return (
    <div className="space-y-2">
      {/* Comments List */}
      <div className="space-y-1">
        {isLoading ? (
          <div className="text-center text-gray-400 py-2 text-sm">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-gray-500 py-2 text-xs">No comments yet</div>
        ) : (
          comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              onUpdate={handleCommentUpdate}
              onDelete={handleCommentDelete}
            />
          ))
        )}
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-center pt-2">
        <Avatar
          src={user?.avatar || DEFAULT_IMAGES.avatar}
          alt={user?.name || 'User avatar'}
          size="sm"
        />
        <div className="flex-1 relative">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="w-full bg-gray-800/50 text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-600 placeholder-gray-500"
            disabled={isSubmitting}
          />
        </div>
      </form>
    </div>
  );
};

export default CommentSection;