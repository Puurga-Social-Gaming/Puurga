import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { UserPlus, Clock, UserCheck } from 'lucide-react';
import api from '../../api/api';
import { toast } from 'react-hot-toast';
import type { AxiosError } from 'axios';
import { useMessages } from '../../context/MessagesContext';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';
import ProfileLink from '../Profile/ProfileLink';

interface ApiError {
  message: string;
}

interface SuggestedUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  requestStatus?: 'pending' | 'accepted' | null;
}

const SuggestedFriends: React.FC = () => {
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();
  const { onlineUsers } = useMessages();

  useEffect(() => {
    loadSuggestions();
  }, [location.pathname]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);

      // Check if we have a token
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);

      if (!token) {
        console.warn('No authentication token found');
        setError('Authentication required');
        return;
      }

      const response = await api.get('friends/suggestions');
      setSuggestions(response.data);
      setError(''); // Clear any previous errors
    } catch (err) {
      const axiosError = err as AxiosError;
      console.error('Error loading suggestions:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        message: axiosError.message
      });

      if (axiosError.response?.status === 401) {
        setError('Authentication failed');
        // Optionally redirect to login or refresh token
      } else {
        setError('Failed to load suggestions');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await api.post('/friend-requests/send', {
        receiverId: userId
      });

      // Update the local state to show pending status
      setSuggestions(prev => prev.map(user =>
        user.id === userId
          ? { ...user, requestStatus: 'pending' }
          : user
      ));

      toast.success('Friend request sent!');
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      console.error('Error sending friend request:', error);
      toast.error(axiosError.response?.data?.message || 'Failed to send friend request');

      // Update the UI state based on the error
      if (axiosError.response?.data?.message === 'Friend request already exists') {
        setSuggestions(prev => prev.map(user =>
          user.id === userId
            ? { ...user, requestStatus: 'pending' }
            : user
        ));
      } else if (axiosError.response?.data?.message === 'You are already friends with this user') {
        setSuggestions(prev => prev.map(user =>
          user.id === userId
            ? { ...user, requestStatus: 'accepted' }
            : user
        ));
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--card)]/90 rounded-xl p-6 border border-[var(--border)] animate-pulse">
        <div className="h-5 w-1/3 bg-[var(--surface)] rounded mb-4"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[var(--surface)]"></div>
            <div className="flex-1">
              <div className="h-3 w-24 bg-[var(--surface)] rounded mb-2"></div>
              <div className="h-2 w-16 bg-[var(--surface)] rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--card)]/90 rounded-xl p-6 border border-[var(--border)]">
      <h2 className="text-xl font-bold text-[var(--fg)] mb-4">Suggested Friends</h2>
      <div className="space-y-3">
        {suggestions.map((user) => (
          <div key={user.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ProfileLink username={user.username} className="rounded-full block">
                  <img
                    src={user.avatar || DEFAULT_IMAGES.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = DEFAULT_IMAGES.avatar;
                    }}
                  />
                </ProfileLink>
                {onlineUsers.some(u => u.id === user.id) && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--card)]" title="Online" />
                )}
              </div>
              <div className="min-w-0">
                <ProfileLink username={user.username} className="text-[var(--fg)] font-medium block truncate hover:text-accent">
                  {user.name}
                </ProfileLink>
                <ProfileLink username={user.username} className="text-[var(--muted)] text-xs truncate hover:text-accent block">
                  @{user.username}
                </ProfileLink>
              </div>
            </div>
            {user.requestStatus === 'pending' ? (
              <div className="bg-yellow-500/10 text-yellow-500 rounded-full p-2" title="Request Pending">
                <Clock size={18} />
              </div>
            ) : user.requestStatus === 'accepted' ? (
              <div className="bg-green-500/10 text-green-500 rounded-full p-2" title="Friends">
                <UserCheck size={18} />
              </div>
            ) : (
              <button
                onClick={() => handleSendRequest(user.id)}
                className="bg-[var(--accent)] text-white rounded-full p-2 hover:opacity-90 transition-colors"
                title="Send Friend Request"
              >
                <UserPlus size={18} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuggestedFriends;