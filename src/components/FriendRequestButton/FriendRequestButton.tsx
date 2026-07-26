import React, { useState, useEffect } from 'react';
import { UserPlus, Clock, UserCheck, UserX, Loader2, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api/api';
import { useUser } from '../../context/UserContext';
import type { AxiosError } from 'axios';

interface ApiError {
  message: string;
}

type FriendStatus = 'none' | 'pending' | 'incoming' | 'accepted' | 'rejected';

interface FriendRequestButtonProps {
  targetUserId: string;
  initialStatus?: FriendStatus;
  onStatusChange?: (newStatus: string) => void;
  className?: string;
}

const FriendRequestButton: React.FC<FriendRequestButtonProps> = ({
  targetUserId,
  initialStatus = 'none',
  onStatusChange,
  className = '',
}) => {
  const [requestStatus, setRequestStatus] = useState<FriendStatus>(initialStatus);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user && targetUserId) {
      void checkFriendRequestStatus();
    }
  }, [user?.id, targetUserId]);

  const checkFriendRequestStatus = async () => {
    if (!user || !targetUserId) return;

    try {
      setIsCheckingStatus(true);
      const response = await api.get(`/friend-requests/status/${targetUserId}`, {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      const newStatus = (response.data.status || 'none') as FriendStatus;
      setRequestStatus(newStatus);
      setRequestId(response.data.requestId || null);
      onStatusChange?.(newStatus);
    } catch (error) {
      console.error('Error checking friend request status:', error);
      if ((error as AxiosError).response?.status !== 404) {
        toast.error('Could not check friend status');
      }
      setRequestStatus('none');
      setRequestId(null);
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
        receiverId: targetUserId,
      });

      const newStatus = (response.data.status || 'pending') as FriendStatus;
      setRequestStatus(newStatus);
      setRequestId(response.data.requestId || null);
      onStatusChange?.(newStatus);
      toast.success(newStatus === 'accepted' ? 'You are now friends!' : 'Friend request sent!');
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const errorMessage = axiosError.response?.data?.message;

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
        await checkFriendRequestStatus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!requestId || isLoading) return;
    setIsLoading(true);
    try {
      await api.delete(`/friend-requests/${requestId}/cancel`);
      setRequestStatus('none');
      setRequestId(null);
      onStatusChange?.('none');
      toast.success('Request cancelled');
    } catch {
      toast.error('Failed to cancel request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!requestId || isLoading) return;
    setIsLoading(true);
    try {
      await api.post(`/friend-requests/${requestId}/accept`);
      setRequestStatus('accepted');
      onStatusChange?.('accepted');
      toast.success('Friend request accepted');
    } catch {
      toast.error('Failed to accept request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!requestId || isLoading) return;
    setIsLoading(true);
    try {
      await api.post(`/friend-requests/${requestId}/reject`);
      setRequestStatus('none');
      setRequestId(null);
      onStatusChange?.('none');
      toast.success('Request declined');
    } catch {
      toast.error('Failed to decline request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (isLoading || !targetUserId) return;
    if (!window.confirm('Remove this friend?')) return;
    setIsLoading(true);
    try {
      await api.delete(`/friends/${targetUserId}`);
      setRequestStatus('none');
      setRequestId(null);
      onStatusChange?.('none');
      toast.success('Friend removed');
    } catch {
      toast.error('Failed to remove friend');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.id === targetUserId) {
    return null;
  }

  if (isCheckingStatus) {
    return (
      <button disabled className="flex items-center gap-1 px-2 py-1 text-xs text-muted">
        <Loader2 size={14} className="animate-spin" />
      </button>
    );
  }

  if (requestStatus === 'incoming') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <button
          onClick={handleAccept}
          disabled={isLoading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-accent text-black hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Accept
        </button>
        <button
          onClick={handleReject}
          disabled={isLoading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-border text-muted hover:text-red-500 disabled:opacity-50"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  if (requestStatus === 'pending') {
    return (
      <button
        onClick={handleCancel}
        disabled={isLoading}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-border text-yellow-500 hover:text-foreground disabled:opacity-50 ${className}`}
        title="Cancel request"
      >
        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
        <span>Pending · Cancel</span>
      </button>
    );
  }

  if (requestStatus === 'accepted') {
    return (
      <button
        onClick={handleUnfriend}
        disabled={isLoading}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-border text-green-500 hover:text-red-500 disabled:opacity-50 ${className}`}
      >
        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
        <span>Friends · Remove</span>
      </button>
    );
  }

  if (requestStatus === 'rejected') {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-500">
        <UserX size={14} />
        <span>Declined</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleSendRequest}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        isLoading
          ? 'bg-card text-muted cursor-not-allowed border border-border'
          : 'bg-accent text-black hover:opacity-90'
      } ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 size={20} className="animate-spin" />
          Sending...
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
