import React from 'react';
import Post from './Post';
import type { Post as PostType } from '../../types';

interface PostCardProps {
  post: PostType;
  onPostUpdated?: () => void;
}

/**
 * @deprecated Use Post component with variant="card" instead
 * PostCard is now a thin wrapper for backward compatibility
 * 
 * @example
 * // Old usage (deprecated)
 * <PostCard post={post} onPostUpdated={handler} />
 * 
 * // New usage (recommended)
 * <Post variant="card" post={post} onUpdate={handler} />
 */
const PostCard: React.FC<PostCardProps> = ({ post, onPostUpdated }) => {
  return (
      <Post 
      variant="card" 
      post={post} 
      onUpdate={() => {
        if (onPostUpdated) {
          onPostUpdated();
        }
      }} 
    />
  );
};

export default PostCard;
