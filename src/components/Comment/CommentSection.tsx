import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../lib/axios';
import { useUser } from '../../context/UserContext';
import Avatar from '../Avatar';
import type { Post } from '../../types';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';

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
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId, comments, onUpdate }) => {
  const { user } = useUser();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await api.post(`/api/posts/${postId}/comments`, {
        content: newComment.trim()
      });

      // Clear input and update comments
      setNewComment('');
      if (onUpdate) {
        const postResponse = await api.get(`/api/posts/${postId}`);
        onUpdate(postResponse.data);
      }
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Avatar 
          src={user?.avatar || DEFAULT_IMAGES.avatar} 
          alt={user?.name || 'User avatar'} 
          size="sm" 
        />
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 bg-transparent border border-gray-700 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-gray-500"
        />
      </form>

      {/* Comments List */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2">
            <Avatar 
              src={comment.user.avatar} 
              alt={comment.user.name} 
              size="sm" 
            />
            <div className="flex-1">
              <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                <div className="font-medium text-sm">{comment.user.name}</div>
                <div className="text-sm text-gray-300">{comment.content}</div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(comment.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommentSection; 