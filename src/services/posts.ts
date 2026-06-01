import api from './api';
import type { Post } from '../types';

interface CreatePostData {
  content: string;
  visibility?: 'public' | 'friends' | 'private';
  background_index?: number;
  images?: string[];
  media_layout?: string;
}

export const postService = {
  async getPosts(page = 1, limit = 10): Promise<{ posts: Post[]; total: number }> {
    const { data } = await api.get(`/posts?page=${page}&limit=${limit}`);
    return data;
  },

  async createPost(postData: CreatePostData): Promise<Post> {
    const { data } = await api.post('/users/posts', postData);
    return data;
  },

  async likePost(postId: string): Promise<void> {
    await api.post(`/posts/${postId}/like`);
  },

  async unlikePost(postId: string): Promise<void> {
    await api.delete(`/posts/${postId}/like`);
  },

  async getUserPosts(userId: string, page = 1, limit = 10): Promise<{ posts: Post[]; total: number }> {
    const { data } = await api.get(`/users/${userId}/posts?page=${page}&limit=${limit}`);
    return data;
  },
};