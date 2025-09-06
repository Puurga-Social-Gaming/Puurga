import { create } from 'zustand';
import type { Post } from '../types';
import { postService } from '../services/posts';

interface PostState {
  posts: Post[];
  total: number;
  isLoading: boolean;
  error: string | null;
  page: number;
  fetchPosts: () => Promise<void>;
  createPost: (content: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
}

export const usePostStore = create<PostState>((set, get) => ({
  posts: [],
  total: 0,
  isLoading: false,
  error: null,
  page: 1,
  fetchPosts: async () => {
    set({ isLoading: true });
    try {
      const { posts, total } = await postService.getPosts(get().page);
      set({ posts, total, isLoading: false, error: null });
    } catch (error) {
      set({ isLoading: false, error: 'Failed to fetch posts' });
    }
  },
  createPost: async (content: string) => {
    try {
      const newPost = await postService.createPost({ content });
      set((state) => ({ posts: [newPost, ...state.posts] }));
    } catch (error) {
      set({ error: 'Failed to create post' });
    }
  },
  likePost: async (postId: string) => {
    try {
      await postService.likePost(postId);
      // Update post likes in state
    } catch (error) {
      set({ error: 'Failed to like post' });
    }
  },
  unlikePost: async (postId: string) => {
    try {
      await postService.unlikePost(postId);
      // Update post likes in state
    } catch (error) {
      set({ error: 'Failed to unlike post' });
    }
  },
}));