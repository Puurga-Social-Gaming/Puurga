import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import api from '../../lib/axios';
import { useUser } from '../../context/UserContext';
import Avatar from '../../components/Avatar';

interface CommentProps {
  comment: {
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
  };
  onUpdate: () => void;
  onDelete: () => void;
}

const Comment: React.FC<CommentProps> = ({ comment, onUpdate, onDelete }) => {
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const isCommentOwner = user?.id === comment.user.id;

  const handleEdit = async () => {
    try {
      console.log('Updating comment:', comment.id, 'with content:', editedContent);
      const response = await api.put(`/comments/${comment.id}`, {
        content: editedContent
      });
      console.log('Update response:', response);
      setIsEditing(false);
      onUpdate();
      toast.success('Comment updated successfully');
    } catch (error: any) {
      console.error('Error updating comment:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      const errorMsg = error.response?.data?.error || 'Failed to update comment';
      toast.error(errorMsg);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      setIsDeleting(true);
      await api.delete(`/comments/${comment.id}`);
      onDelete();
      toast.success('Comment deleted successfully');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-2 py-1"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar
        src={comment.user.avatar}
        alt={comment.user.name}
        size="sm"
      />

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full bg-gray-800/50 text-white rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-600 resize-none"
              rows={2}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedContent(comment.content);
                }}
                className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="px-3 py-1 text-xs bg-white text-black rounded-md hover:bg-gray-200 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="inline-block bg-gray-800/50 rounded-2xl px-3 py-2">
              <div className="font-semibold text-white text-sm">{comment.user.name}</div>
              <p className="text-gray-200 text-sm mt-0.5">{comment.content}</p>
            </div>

            {/* Comment Actions */}
            <div className="flex items-center gap-3 mt-1 ml-3">
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                {comment.updatedAt !== comment.createdAt && ' (edited)'}
              </span>

              {(showActions || isCommentOwner) && isCommentOwner && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-gray-400 hover:text-white font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-xs text-gray-400 hover:text-red-400 font-medium transition-colors"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Comment;