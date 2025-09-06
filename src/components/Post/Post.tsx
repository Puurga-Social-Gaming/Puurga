import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Share2, MoreHorizontal, Award, Pencil, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import type { Post as PostType, ReactionCount } from '../../types';
import { useUser } from '../../context/UserContext';
import api from '../../api/api';
import { motion, AnimatePresence } from 'framer-motion';
import CommentSection from '../Comment/CommentSection';
import PostReactions from './PostReactions';

interface PostProps {
  post: PostType;
  onUpdate?: (post: PostType) => void;
}

const Post: React.FC<PostProps> = ({ post, onUpdate }) => {
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [isPuurging, setIsPuurging] = useState(false);
  const [localPuurgas, setLocalPuurgas] = useState(post.puurgas);
  const [isPuurged, setIsPuurged] = useState(post.puurged || false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showComments, setShowComments] = useState(false);

  const isPostCreator = user?.id === post.user.id;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
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
    setShowMenu(false);
  };

  const handleSaveEdit = async () => {
    try {
      const response = await api.put(`/posts/${post.id}`, {
        content: editedContent
      });
      
      if (response.status === 200) {
        toast.success('Post updated successfully');
        setIsEditing(false);
        if (onUpdate) onUpdate({
          ...post,
          content: editedContent
        });
      }
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post');
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(post.content);
    setIsEditing(false);
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowComments(!showComments);
  };

  const handlePuurgeClick = async () => {
    if (isPuurging) return;
    
    try {
      setIsPuurging(true);
      const response = await api.post(`/posts/${post.id}/puurga`);
      setLocalPuurgas(response.data.puurgas);
      setIsPuurged(!isPuurged);
      if (onUpdate) onUpdate({
        ...post,
        puurgas: response.data.puurgas,
        puurged: response.data.puurged
      });
    } catch (error) {
      console.error('Error puurging post:', error);
      toast.error('Failed to puurga post');
    } finally {
      setIsPuurging(false);
    }
  };

  const handleDeletePost = async () => {
    try {
      const response = await api.delete(`/posts/${post.id}`);
      
      if (response.status === 200) {
        toast.success('Post deleted successfully');
        if (onUpdate) onUpdate(post);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleReactionChange = (reactions: { [key: string]: ReactionCount }) => {
    if (onUpdate) {
      onUpdate({
        ...post,
        reactions
      });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-6"
    >
      <div className="flex items-start gap-3">
        <Link to={`/profile/${post.user.username}`}>
          <motion.img
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
            src={post.user.avatar || '/default-avatar.png'}
            alt={post.user.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-orange-500/20 hover:ring-orange-500 transition-all duration-200"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div>
                <Link 
                  to={`/profile/${post.user.username}`}
                  className="font-medium text-white hover:underline"
                >
                  {post.user.name}
                </Link>
                <p className="text-sm text-gray-400">
                  @{post.user.username} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            {isPostCreator && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={handleMenuToggle}
                  className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                  title="More options"
                >
                  <MoreHorizontal size={20} />
                </button>
                {showMenu && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-1 w-48 bg-[#1a1a1a] rounded-lg shadow-lg overflow-hidden z-10 backdrop-blur-sm border border-white/10"
                  >
                    <motion.button
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                      onClick={handleEdit}
                      className="w-full px-4 py-2 text-left text-white flex items-center gap-2 transition-colors hover:text-orange-500"
                    >
                      <Pencil size={16} />
                      Edit Post
                    </motion.button>
                    <motion.button
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                      onClick={handleDeletePost}
                      className="w-full px-4 py-2 text-left text-red-400 flex items-center gap-2 transition-colors hover:text-red-500"
                    >
                      <X size={16} />
                      Delete Post
                    </motion.button>
                  </motion.div>
                )}
              </div>
            )}
          </div>
          
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-2"
              >
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full bg-white/5 rounded-lg px-4 py-2 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 transition-shadow duration-200"
                  rows={3}
                />
                <div className="mt-2 flex justify-end gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCancelEdit}
                    className="px-3 py-1 text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveEdit}
                    className="px-3 py-1 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                  >
                    Save
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 text-white whitespace-pre-wrap break-words"
              >
                {post.content}
              </motion.p>
            )}
          </AnimatePresence>
          
          {post.images && post.images.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-3 grid gap-2 ${
                post.images.length === 1 ? 'grid-cols-1' : 
                post.images.length === 2 ? 'grid-cols-2' : 
                'grid-cols-2'
              }`}
            >
              {post.images.map((image, index) => (
                <motion.img
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  src={image}
                  alt={`Post image ${index + 1}`}
                  className={`rounded-xl object-cover w-full transition-transform duration-200 hover:shadow-lg ${
                    post.images!.length === 1 ? 'max-h-96' : 'h-48'
                  }`}
                />
              ))}
            </motion.div>
          )}
          
          <div className="mt-4 flex items-center gap-6">
            <PostReactions
              postId={post.id}
              initialReactions={post.reactions || {}}
              onReactionChange={handleReactionChange}
            />

            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleCommentClick}
              className="flex items-center gap-1 text-gray-400 hover:text-blue-500 transition-colors"
              type="button"
            >
              <MessageCircle size={20} className={showComments ? 'text-blue-500' : ''} />
              <span className="text-sm">{post.comments}</span>
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="flex items-center gap-1 text-gray-400 hover:text-green-500 transition-colors"
            >
              <Share2 size={20} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePuurgeClick}
              className={`flex items-center gap-1 transition-colors ${
                isPuurged ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'
              }`}
            >
              <Award size={20} />
              <span className="text-sm">{localPuurgas}</span>
            </motion.button>
          </div>

          {/* Comment Section */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 border-t border-gray-800 pt-4"
              >
                <CommentSection
                  postId={post.id}
                  comments={post.Comments || []}
                  onUpdate={onUpdate}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default Post; 