import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Post as PostType } from '../../types';
import PostComponent from '../Post/Post';

interface PostListProps {
  posts: PostType[];
  onPostUpdate?: (updatedPost: PostType) => void;
}

const PostList: React.FC<PostListProps> = ({ posts, onPostUpdate }) => {
  const { t } = useTranslation();

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center text-muted py-8 bg-transparent">
        {t('posts.noPostsToDisplay')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <PostComponent
          key={post.id}
          post={post}
          onUpdate={onPostUpdate}
        />
      ))}
    </div>
  );
};

export default React.memo(PostList);