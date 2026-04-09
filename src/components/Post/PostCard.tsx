import React, { useState } from 'react';
import { Heart, MessageCircle, MoreVertical, Pencil, Trash2, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import Avatar from '../Avatar';
import PuurgaLogo from '../Icons/PuurgaLogo';
import EditPostModal from './EditPostModal';
import ContentTranslator from '../ContentTranslator';
import type { Post } from '../../types';

interface PostCardProps {
  post: Post;
  onPostUpdated?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onPostUpdated }) => {
  const { user } = useUser();
  const [showOptions, setShowOptions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const isOwnPost = user?.id === post.userId;

  const handleEdit = async (newContent: string) => {
    try {
      const posts = JSON.parse(localStorage.getItem('posts') || '[]');
      const updatedPosts = posts.map((p: Post) =>
        p.id === post.id
          ? {
            ...p,
            content: newContent,
            lastEdited: new Date().toISOString()
          }
          : p
      );
      localStorage.setItem('posts', JSON.stringify(updatedPosts));
      onPostUpdated?.();
    } catch (error) {
      console.error('Failed to edit post:', error);
      throw error;
    }
  };

  const formatDate = (date: string, lastEdited?: string) => {
    const formattedDate = new Date(date).toLocaleDateString();
    if (lastEdited) {
      return `${formattedDate} (edited)`;
    }
    return formattedDate;
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    setIsDeleting(true);
    try {
      const posts = JSON.parse(localStorage.getItem('posts') || '[]');
      const updatedPosts = posts.filter((p: Post) => p.id !== post.id);
      localStorage.setItem('posts', JSON.stringify(updatedPosts));
      onPostUpdated?.();
    } catch (error) {
      console.error('Failed to delete post:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const nextImage = () => {
    if (post.images && currentImageIndex < post.images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  };

  const previousImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  return (
    <>
      <div className="bg-card p-4 rounded-xl border border-border shadow-theme-sm hover:shadow-theme-md transition-shadow">
        <div className="flex justify-between">
          <div className="flex gap-3">
            <Avatar
              src={post.user.avatar}
              alt={post.user.name}
              size="md"
            />
            <div>
              <h3 className="font-semibold text-foreground">{post.user.name}</h3>
              <p className="text-sm text-muted">
                {formatDate(post.createdAt, post.lastEdited)}
              </p>
            </div>
          </div>

          {isOwnPost && (
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="p-2 text-muted hover:text-foreground hover:bg-highlight-light rounded-full transition-colors"
              >
                <MoreVertical size={20} />
              </button>

              {showOptions && (
                <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-theme-md overflow-hidden z-10 border border-border">
                  <button
                    onClick={() => {
                      setShowOptions(false);
                      setShowEditModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-foreground hover:bg-highlight-light transition-colors"
                  >
                    <Pencil size={16} />
                    Edit Post
                  </button>
                  <button
                    onClick={() => {
                      setShowOptions(false);
                      handleDelete();
                    }}
                    disabled={isDeleting}
                    className="w-full flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={16} />
                    {isDeleting ? 'Deleting...' : 'Delete Post'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-3">
          <ContentTranslator
            content={post.content}
            sourceType="post"
            sourceId={post.id}
            originalLanguage={post.language}
            renderContent={(text) => <p className="text-foreground">{text}</p>}
          />
        </div>

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div className="mt-3 relative">
            <img
              src={post.images[currentImageIndex]}
              alt={`Post image ${currentImageIndex + 1}`}
              className="w-full rounded-lg max-h-48 md:max-h-96 object-cover"
            />
            {post.images.length > 1 && (
              <>
                <button
                  onClick={previousImage}
                  disabled={currentImageIndex === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-background/50 rounded-full hover:bg-background/75 disabled:opacity-50"
                >
                  <ChevronLeft size={20} className="text-foreground" />
                </button>
                <button
                  onClick={nextImage}
                  disabled={currentImageIndex === post.images.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-background/50 rounded-full hover:bg-background/75 disabled:opacity-50"
                >
                  <ChevronRight size={20} className="text-foreground" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {post.images.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Location */}
        {post.location && (
          <div className="mt-2 flex items-center gap-1 text-sm text-muted">
            <MapPin size={14} />
            <span>{post.location.name}</span>
          </div>
        )}

        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-border">
          <button className="flex items-center gap-2 text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors">
            <Heart size={20} />
            <span className="text-sm">{post.likes}</span>
          </button>
          <button className="flex items-center gap-2 text-muted hover:text-accent hover:bg-highlight-light px-3 py-1.5 rounded-lg transition-colors">
            <MessageCircle size={20} />
            <span className="text-sm">{post.comments}</span>
          </button>
          <button className="flex items-center gap-2 text-muted hover:text-accent hover:bg-highlight-light px-3 py-1.5 rounded-lg transition-colors">
            <PuurgaLogo size={20} />
            <span className="text-sm">{post.puurgas}</span>
          </button>
        </div>
      </div>

      <EditPostModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleEdit}
        initialContent={post.content}
      />
    </>
  );
};

export default PostCard;