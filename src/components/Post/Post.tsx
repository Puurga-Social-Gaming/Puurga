import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, MoreHorizontal, Pencil, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import type { Post as PostType, ReactionCount } from '../../types';
import api from '../../lib/axios';
import { motion, AnimatePresence } from 'framer-motion';
import CommentSection from '../Comment/CommentSection';
import PostReactions from './PostReactions';
import ShareButton from './ShareButton';
import PuurgaLogo from '../Icons/PuurgaLogo';

interface PostProps {
  post: PostType;
  onUpdate?: (post: PostType) => void;
}

const Post: React.FC<PostProps> = ({ post, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [isPurging, setIsPurging] = useState(false);
  const [localPurges, setLocalPurges] = useState(post.purges || 0);
  const [isPurged, setIsPurged] = useState(post.purged || false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments || 0);
  const commentSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      
      // Close comments if clicking outside the comment section
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
    setShowMenu(false);
  };

  const handleSaveEdit = async () => {
    try {
      const response = await api.put(`/api/posts/${post.id}`, {
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

  const handleCommentUpdate = (updatedPost: PostType) => {
    // Update comment count when comments change
    if (updatedPost.comments !== undefined) {
      setCommentCount(updatedPost.comments);
    }
    if (onUpdate) {
      onUpdate(updatedPost);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }
    
    try {
      const response = await api.delete(`/api/posts/${post.id}`);
      
      if (response.status === 200) {
        toast.success('Post deleted successfully');
        // Signal parent to remove this post from the list
        if (onUpdate) onUpdate({ ...post, deleted: true } as PostType);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handlePurgeClick = async () => {
    if (isPurging) return;
    
    try {
      setIsPurging(true);
      const response = await api.post(`/api/posts/${post.id}/purge`);
      
      const newPurgeCount = response.data.purges;
      const newPurgedState = response.data.purged;
      
      setLocalPurges(newPurgeCount);
      setIsPurged(newPurgedState);
      
      // Check if user should go into ghost mode (5+ purges)
      if (newPurgeCount >= 5) {
        toast.error(`⚠️ This post has been purged ${newPurgeCount} times. User may enter ghost mode.`, {
          duration: 4000
        });
      } else {
        toast.success(newPurgedState ? '🔥 Post purged!' : 'Purge removed');
      }
      
      if (onUpdate) onUpdate({
        ...post,
        purges: newPurgeCount,
        purged: newPurgedState
      });
    } catch (error: any) {
      console.error('Error purging post:', error);
      
      // Handle specific error cases
      if (error.response?.status === 403 && error.response?.data?.code === 'OWN_POST') {
        toast.error('🚫 You cannot purge your own posts', {
          duration: 3000
        });
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message, {
          duration: 3000
        });
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to purge post');
      }
    } finally {
      setIsPurging(false);
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
    <div id={`post-${post.id}`}>
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
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  to={`/profile/${post.user.username}`}
                  className="font-medium text-white hover:underline"
                >
                  {post.user.name}
                </Link>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </p>
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={handleMenuToggle}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                  type="button"
                >
                  <MoreHorizontal size={20} />
                </button>

                <AnimatePresence>
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
                        type="button"
                      >
                        <Pencil size={16} />
                        Edit Post
                      </motion.button>
                      <motion.button
                        whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                        onClick={handleDeletePost}
                        className="w-full px-4 py-2 text-left text-red-400 flex items-center gap-2 transition-colors hover:text-red-500"
                        type="button"
                      >
                        <X size={16} />
                        Delete Post
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
                      type="button"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSaveEdit}
                      className="px-3 py-1 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                      type="button"
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
                  (() => {
                    if (post.images.length === 1) return 'grid-cols-1';
                    switch (post.media_layout) {
                      case 'rows':
                        return 'grid-cols-1';
                      case 'columns':
                        return 'grid-cols-2';
                      case 'grid':
                      default:
                        return 'grid-cols-2 sm:grid-cols-3';
                    }
                  })()
                }`}
              >
                {post.images.map((image, index) => (
                  <motion.img
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    src={image}
                    alt={`Post image ${index + 1}`}
                    className={`rounded-xl object-cover w-full transition-transform duration-200 hover:shadow-lg ${
                      post.images!.length === 1 ? 'max-h-80' : 'h-40'
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
                <span className="text-sm">{commentCount}</span>
              </motion.button>
              
              <ShareButton
                postId={post.id}
                postContent={post.content}
                postAuthor={post.user.name}
              />

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handlePurgeClick}
                disabled={isPurging}
                className={`flex items-center gap-1 transition-colors ${
                  isPurged ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'
                } ${isPurging ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Purge post"
              >
                <PuurgaLogo size={20} />
                <span className="text-sm">{localPurges}</span>
              </motion.button>
            </div>

            {/* Comment Section */}
            <AnimatePresence>
              {showComments && (
                <motion.div
                  ref={commentSectionRef}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 border-t border-gray-800 pt-4"
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
        </div>
      </motion.div>
    </div>
  );
};

export default Post;