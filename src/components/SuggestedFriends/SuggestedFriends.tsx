import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserPlus, X, Clock, UserCheck, Mail } from 'lucide-react';
import Avatar from '../Avatar';
import api from '../../api/api';
import { toast } from 'react-hot-toast';
import type { AxiosError } from 'axios';

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
  const navigate = useNavigate();
  const location = useLocation();

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
      
      const response = await api.get('/friends/suggestions');
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

  const handleDismiss = (userId: string) => {
    setSuggestions(prev => prev.filter(user => user.id !== userId));
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

  const handleMessage = async (userId: string) => {
    try {
      // Create or get existing conversation
      const response = await api.post('/conversations', {
        otherUserId: userId
      });
      
      // Navigate to the conversation
      navigate(`/messages/${response.data.id}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-4 animate-pulse">
        <div className="h-4 w-1/3 bg-[#2d2d2d] rounded mb-4"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#2d2d2d]"></div>
            <div className="flex-1">
              <div className="h-3 w-24 bg-[#2d2d2d] rounded mb-2"></div>
              <div className="h-2 w-16 bg-[#2d2d2d] rounded"></div>
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
    <div className="bg-[#1a1a1a] rounded-xl p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Suggested Friends</h3>
      <div className="space-y-4">
        {suggestions.map((user) => (
          <div key={user.id} className="flex items-center gap-3 group">
            <div className="relative">
              <Avatar
                src={user.avatar}
                alt={`${user.name}'s profile picture`}
                size="md"
                className="w-10 h-10"
                onClick={() => navigate(`/profile/${user.username}`)}
                showBorder={false}
              />
              {user.requestStatus === 'pending' ? (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Clock size={12} className="text-white" />
                </div>
              ) : user.requestStatus === 'accepted' ? (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <UserCheck size={12} className="text-white" />
                </div>
              ) : (
                <div 
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-600 transition-colors"
                  onClick={() => handleSendRequest(user.id)}
                >
                  <UserPlus size={12} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-white truncate cursor-pointer hover:underline"
                  onClick={() => navigate(`/profile/${user.username}`)}>
                {user.name}
              </h4>
              <p className="text-sm text-gray-400 truncate">{user.bio || `@${user.username}`}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleMessage(user.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#2d2d2d] rounded"
                title="Send message"
              >
                <Mail size={16} className="text-gray-400" />
              </button>
              <button
                onClick={() => handleDismiss(user.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#2d2d2d] rounded"
                title="Remove suggestion"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuggestedFriends;