import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import api from '../lib/axios';
import Post from '../components/Post/Post';
import type { Post as PostType } from '../types';
import { parseMediaUrls } from '../utils/mediaUrls';

function mapPost(raw: any): PostType {
  const images = Array.isArray(raw.images)
    ? raw.images
    : parseMediaUrls(raw.media_url);

  return {
    id: raw.id,
    userId: raw.user_id || raw.userId || raw.user?.id || '',
    content: raw.content || '',
    createdAt: raw.created_at || raw.createdAt || '',
    user: {
      id: raw.user?.id || raw.user_id || '',
      name: raw.user?.name || raw.user?.full_name || 'User',
      username: raw.user?.username || 'user',
      avatar: raw.user?.avatar || raw.user?.avatar_url || '',
    },
    likes: raw.likes || 0,
    liked: Boolean(raw.liked),
    puurgas: raw.puurgas || 0,
    puurged: Boolean(raw.puurged),
    purges: raw.purges || raw.purge_count || 0,
    purged: Boolean(raw.purged),
    comments: raw.comments || raw.comment_count || 0,
    visibility: raw.visibility || 'public',
    background_index: raw.background_index || 0,
    images,
    reactions: raw.reactions || {},
  };
}

const PostDetail: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/posts/${postId}`);
        if (!cancelled) setPost(mapPost(data));
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.error || 'Post not found');
          setPost(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-border bg-background/90 backdrop-blur">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/home'))}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-card"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-semibold text-[16px]">Post</h1>
      </div>

      <div className="max-w-2xl mx-auto px-2 py-3">
        {loading && (
          <div className="flex justify-center py-16 text-muted">
            <Loader2 className="animate-spin" size={28} />
          </div>
        )}
        {!loading && error && (
          <div className="text-center py-16 space-y-3">
            <p className="text-muted">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="text-accent font-medium text-sm"
            >
              Back to Home
            </button>
          </div>
        )}
        {!loading && post && (
          <Post
            post={post}
            onUpdate={(updated) => {
              if ((updated as any).deleted || (updated as any).hidden) {
                navigate('/home');
                return;
              }
              setPost({ ...post, ...updated });
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PostDetail;
