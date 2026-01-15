import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { UserCheck, UserX, Heart, MessageCircle } from 'lucide-react';
import Avatar from '../../components/Avatar';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';

interface NotificationUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

interface Notification {
  id: string;
  type: 'friend_request' | 'friend_request_accepted' | 'like' | 'comment';
  read: boolean;
  createdAt: string;
  fromUser?: NotificationUser;
  data: {
    friendRequestId?: string;
    postId?: string;
    commentId?: string;
  };
}

// Safe accessor for fromUser with defaults
const getFromUser = (notification: Notification): NotificationUser => {
  return notification.fromUser || {
    id: '',
    name: 'Unknown User',
    username: 'unknown',
    avatar: DEFAULT_IMAGES.avatar,
  };
};

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptFriendRequest = async (friendRequestId: string, notificationId: string) => {
    try {
      await api.post(`/api/friend-requests/${friendRequestId}/accept`);
      await api.put(`/api/notifications/read`, { notificationIds: [notificationId] });
      toast.success('Friend request accepted');
      fetchNotifications();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error('Failed to accept friend request');
    }
  };

  const handleRejectFriendRequest = async (friendRequestId: string, notificationId: string) => {
    try {
      await api.post(`/api/friend-requests/${friendRequestId}/reject`);
      await api.put(`/api/notifications/read`, { notificationIds: [notificationId] });
      toast.success('Friend request rejected');
      fetchNotifications();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error('Failed to reject friend request');
    }
  };

  const handleViewProfile = (username: string) => {
    navigate(`/profile/${username}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const renderNotification = (notification: Notification) => {
    const fromUser = getFromUser(notification);
    const data = notification.data || {};
    
    switch (notification.type) {
      case 'friend_request':
        return (
          <div key={notification.id} className={`p-4 rounded-lg ${notification.read ? 'bg-[#1a1a1a]' : 'bg-[#1a1a1a] border-l-4 border-blue-500'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar src={fromUser.avatar || DEFAULT_IMAGES.avatar} alt={fromUser.name} size="md" />
                <div>
                  <p className="text-white">
                    <span className="font-semibold">{fromUser.name || 'Someone'}</span>
                    <span className="text-gray-400"> sent you a friend request</span>
                  </p>
                  <p className="text-sm text-gray-500">{formatDate(notification.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {data.friendRequestId && (
                  <>
                    <button
                      onClick={() => handleAcceptFriendRequest(data.friendRequestId!, notification.id)}
                      className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full"
                    >
                      <UserCheck size={18} />
                    </button>
                    <button
                      onClick={() => handleRejectFriendRequest(data.friendRequestId!, notification.id)}
                      className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full"
                    >
                      <UserX size={18} />
                    </button>
                  </>
                )}
                {fromUser.username && (
                  <button
                    onClick={() => handleViewProfile(fromUser.username)}
                    className="px-3 py-1 bg-[#333] hover:bg-[#444] text-white rounded-lg text-sm"
                  >
                    View Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        );

      case 'friend_request_accepted':
        return (
          <div key={notification.id} className={`p-4 rounded-lg ${notification.read ? 'bg-[#1a1a1a]' : 'bg-[#1a1a1a] border-l-4 border-green-500'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar src={fromUser.avatar || DEFAULT_IMAGES.avatar} alt={fromUser.name} size="md" />
                <div>
                  <p className="text-white">
                    <span className="font-semibold">{fromUser.name || 'Someone'}</span>
                    <span className="text-gray-400"> accepted your friend request</span>
                  </p>
                  <p className="text-sm text-gray-500">{formatDate(notification.createdAt)}</p>
                </div>
              </div>
              {fromUser.username && (
                <button
                  onClick={() => handleViewProfile(fromUser.username)}
                  className="px-3 py-1 bg-[#333] hover:bg-[#444] text-white rounded-lg text-sm"
                >
                  View Profile
                </button>
              )}
            </div>
          </div>
        );

      case 'like':
        return (
          <div key={notification.id} className={`p-4 rounded-lg ${notification.read ? 'bg-[#1a1a1a]' : 'bg-[#1a1a1a] border-l-4 border-pink-500'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar src={fromUser.avatar || DEFAULT_IMAGES.avatar} alt={fromUser.name} size="md" />
                  <div className="absolute -bottom-1 -right-1 bg-pink-500 rounded-full p-1">
                    <Heart size={12} className="text-white fill-white" />
                  </div>
                </div>
                <div>
                  <p className="text-white">
                    <span className="font-semibold">{fromUser.name || 'Someone'}</span>
                    <span className="text-gray-400"> liked your post</span>
                  </p>
                  <p className="text-sm text-gray-500">{formatDate(notification.createdAt)}</p>
                </div>
              </div>
              {fromUser.username && (
                <button
                  onClick={() => handleViewProfile(fromUser.username)}
                  className="px-3 py-1 bg-[#333] hover:bg-[#444] text-white rounded-lg text-sm"
                >
                  View Profile
                </button>
              )}
            </div>
          </div>
        );

      case 'comment':
        return (
          <div key={notification.id} className={`p-4 rounded-lg ${notification.read ? 'bg-[#1a1a1a]' : 'bg-[#1a1a1a] border-l-4 border-orange-500'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar src={fromUser.avatar || DEFAULT_IMAGES.avatar} alt={fromUser.name} size="md" />
                  <div className="absolute -bottom-1 -right-1 bg-orange-500 rounded-full p-1">
                    <MessageCircle size={12} className="text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-white">
                    <span className="font-semibold">{fromUser.name || 'Someone'}</span>
                    <span className="text-gray-400"> commented on your post</span>
                  </p>
                  <p className="text-sm text-gray-500">{formatDate(notification.createdAt)}</p>
                </div>
              </div>
              {fromUser.username && (
                <button
                  onClick={() => handleViewProfile(fromUser.username)}
                  className="px-3 py-1 bg-[#333] hover:bg-[#444] text-white rounded-lg text-sm"
                >
                  View Profile
                </button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <div className="p-4 text-white">Loading notifications...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No notifications yet</div>
          ) : (
            notifications.map(notification => renderNotification(notification))
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications; 