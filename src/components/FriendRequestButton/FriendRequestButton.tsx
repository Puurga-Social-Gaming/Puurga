import React, { useState, useEffect } from 'react';
import { UserPlus, Clock, UserCheck, UserX, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api/api';
import { useUser } from '../../context/UserContext';
import type { AxiosError } from 'axios';

interface ApiError {
  message: string;
}

interface FriendRequestButtonProps {
  targetUserId: string;
  initialStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
  onStatusChange?: (newStatus: string) => void;
  className?: string;
}

const FriendRequestButton: React.FC<FriendRequestButtonProps> = ({
  targetUserId,
  initialStatus = 'none',
  onStatusChange,
  className = ''
}) => {
  const [requestStatus, setRequestStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const { user } = useUser();

  // Fetch status whenever component mounts or user/targetUserId changes
  useEffect(() => {
    if (user && targetUserId) {
      checkFriendRequestStatus();
    }
  }, [user?.id, targetUserId]);

  const checkFriendRequestStatus = async () => {
    if (!user || !targetUserId) return;

    try {
      setIsCheckingStatus(true);
      const response = await api.get(`/friend-requests/status/${targetUserId}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      const newStatus = response.data.status || 'none';
      setRequestStatus(newStatus);
      onStatusChange?.(newStatus);
    } catch (error) {
      console.error('Error checking friend request status:', error);
      // Only show error toast if it's not a 404 (no request found)
      if ((error as AxiosError).response?.status !== 404) {
        toast.error('Could not check friend status');
      }
      setRequestStatus('none');
      onStatusChange?.('none');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSendRequest = async () => {
    if (isLoading || !user || !targetUserId) return;

    setIsLoading(true);
    try {
      const response = await api.post('/friend-requests/send', {
        receiverId: targetUserId
      });
      
      // Use the status from the response to ensure consistency
      const newStatus = response.data.status || 'pending';
      setRequestStatus(newStatus);
      onStatusChange?.(newStatus);
      toast.success('Friend request sent!');
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const errorMessage = axiosError.response?.data?.message;
      
      // Handle specific error cases
      if (errorMessage === 'Friend request already exists') {
        setRequestStatus('pending');
        onStatusChange?.('pending');
        toast.error('Friend request already sent');
      } else if (errorMessage === 'You are already friends with this user') {
        setRequestStatus('accepted');
        onStatusChange?.('accepted');
        toast.error('You are already friends');
      } else {
        toast.error(errorMessage || 'Failed to send friend request');
        // Recheck status to ensure consistency
        await checkFriendRequestStatus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show button if viewing own profile or no user logged in
  if (!user || user.id === targetUserId) {
    return null;
  }

  if (isCheckingStatus) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 bg-[#2d2d2d] text-gray-400 rounded-lg"
      >
        <Loader2 size={20} className="animate-spin" />
        Checking...
      </button>
    );
  }

  return (
    <button
      onClick={handleSendRequest}
      disabled={isLoading || requestStatus === 'accepted'}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        isLoading 
          ? 'bg-[#2d2d2d] text-gray-400 cursor-not-allowed'
          : requestStatus === 'pending'
          ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'
          : requestStatus === 'accepted'
          ? 'bg-green-500/10 text-green-500 cursor-not-allowed'
          : requestStatus === 'rejected'
          ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
          : 'bg-orange-500 text-white hover:bg-orange-600'
      } ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 size={20} className="animate-spin" />
          Sending...
        </>
      ) : requestStatus === 'pending' ? (
        <>
          <Clock size={20} />
          Request Pending
        </>
      ) : requestStatus === 'accepted' ? (
        <>
          <UserCheck size={20} />
          Friends
        </>
      ) : requestStatus === 'rejected' ? (
        <>
          <UserX size={20} />
          Request Declined
        </>
      ) : (
        <>
          <UserPlus size={20} />
          Add Friend
        </>
      )}
    </button>
  );
};

export default FriendRequestButton; 