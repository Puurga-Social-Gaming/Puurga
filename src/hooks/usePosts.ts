import { useEffect } from 'react';
import { usePostStore } from '../store/postStore';

export const usePosts = () => {
  const { posts, isLoading, error, fetchPosts, createPost, likePost, unlikePost } = usePostStore();

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    isLoading,
    error,
    createPost,
    likePost,
    unlikePost,
  };
};