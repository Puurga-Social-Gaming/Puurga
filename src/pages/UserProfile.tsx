import React from 'react';
import { useParams } from 'react-router-dom';
import { Post } from '../types';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio?: string;
  followers: number;
  following: number;
}

const UserProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [profile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [userPosts] = React.useState<Post[]>([]);
  const [loadingPosts] = React.useState(true);

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        // TODO: Implement profile loading (e.g., fetch from API)
        setLoading(false);
      } catch (error: unknown) {
        console.error('Failed to load profile', error);
        setError('Failed to load profile');
        setLoading(false);
      }
    };

    if (username) {
      loadProfile();
    }
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-400">{error || 'Profile not found'}</p>
        {/* Add a retry button if desired */}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto p-4"
    >
      <div className="bg-[#1a1a1a] rounded-lg shadow p-6 mb-6">
        <div className="flex items-center space-x-4">
          <img
            src={profile.avatar}
            alt={profile.name}
            className="w-24 h-24 rounded-full border-4 border-[#0a0a0a] object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
            <p className="text-gray-400">@{profile.username}</p>
            {profile.bio && <p className="mt-2 text-gray-300">{profile.bio}</p>}
            <div className="flex space-x-4 mt-4 text-gray-400">
              <div>
                <span className="font-bold text-white">{profile.followers}</span>{' '}
                <span>Followers</span>
              </div>
              <div>
                <span className="font-bold text-white">{profile.following}</span>{' '}
                <span>Following</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {loadingPosts ? (
          <div className="flex items-center justify-center text-gray-400 py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading posts...
          </div>
        ) : userPosts.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No posts yet</div>
        ) : (
          userPosts.map((post) => (
            <div key={post.id} className="bg-[#1a1a1a] rounded-lg shadow p-4">
              <p className="text-white">{post.content}</p>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default UserProfile; 