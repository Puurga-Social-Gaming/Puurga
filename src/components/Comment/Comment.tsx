import React, { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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
  const [showOptions, setShowOptions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isCommentOwner = user?.id === comment.user.id;

  const handleEdit = async () => {
    try {
      await api.put(`/api/comments/${comment.id}`, {
        content: editedContent
      });
      setIsEditing(false);
      onUpdate();
      toast.success('Comment updated successfully');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Failed to update comment');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      setIsDeleting(true);
      await api.delete(`/api/comments/${comment.id}`);
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex gap-3 p-4 bg-[#1a1a1a] rounded-lg"
    >
      <Avatar
        src={comment.user.avatar}
        alt={comment.user.name}
        size="sm"
      />
      
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <span className="font-semibold text-white">{comment.user.name}</span>
            <span className="text-sm text-gray-400 ml-2">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              {comment.updatedAt !== comment.createdAt && ' (edited)'}
            </span>
          </div>

          {isCommentOwner && (
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-[#2d2d2d] transition-colors"
              >
                <MoreHorizontal size={16} />
              </button>

              {showOptions && (
                <div className="absolute right-0 mt-1 w-32 bg-[#2d2d2d] rounded-lg shadow-lg overflow-hidden z-10">
                  <button
                    onClick={() => {
                      setShowOptions(false);
                      setIsEditing(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-[#3d3d3d] transition-colors"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setShowOptions(false);
                      handleDelete();
                    }}
                    disabled={isDeleting}
                    className="w-full flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-[#3d3d3d] transition-colors"
                  >
                    <Trash2 size={14} />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="mt-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full bg-[#2d2d2d] text-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={2}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedContent(comment.content);
                }}
                className="px-3 py-1 text-sm text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="px-3 py-1 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-200 mt-1">{comment.content}</p>
        )}
      </div>
    </motion.div>
  );
};

export default Comment; 