import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { UserCheck, UserX } from 'lucide-react';
import Avatar from '../../components/Avatar';

interface Notification {
  id: string;
  type: 'friend_request' | 'friend_request_accepted' | 'like' | 'comment';
  read: boolean;
  createdAt: string;
  fromUser: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
  data: {
    friendRequestId?: string;
  };
}

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
      await api.put(`/api/notifications/${notificationId}/read`);
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
      await api.put(`/api/notifications/${notificationId}/read`);
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
    switch (notification.type) {
      case 'friend_request':
        return (
          <div key={notification.id} className={`p-4 ${notification.read ? 'bg-[#1a1a1a]' : 'bg-[#1a1a1a] border-l-4 border-blue-500'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar src={notification.fromUser.avatar} alt={notification.fromUser.name} size="md" />
                <div>
                  <p className="text-white">
                    <span className="font-semibold">{notification.fromUser.name}</span>
                    <span className="text-gray-400"> sent you a friend request</span>
                  </p>
                  <p className="text-sm text-gray-500">{formatDate(notification.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAcceptFriendRequest(notification.data.friendRequestId!, notification.id)}
                  className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full"
                >
                  <UserCheck size={18} />
                </button>
                <button
                  onClick={() => handleRejectFriendRequest(notification.data.friendRequestId!, notification.id)}
                  className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full"
                >
                  <UserX size={18} />
                </button>
                <button
                  onClick={() => handleViewProfile(notification.fromUser.username)}
                  className="px-3 py-1 bg-[#333] hover:bg-[#444] text-white rounded-lg text-sm"
                >
                  View Profile
                </button>
              </div>
            </div>
          </div>
        );

      case 'friend_request_accepted':
        return (
          <div key={notification.id} className={`p-4 ${notification.read ? 'bg-[#1a1a1a]' : 'bg-[#1a1a1a] border-l-4 border-green-500'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar src={notification.fromUser.avatar} alt={notification.fromUser.name} size="md" />
                <div>
                  <p className="text-white">
                    <span className="font-semibold">{notification.fromUser.name}</span>
                    <span className="text-gray-400"> accepted your friend request</span>
                  </p>
                  <p className="text-sm text-gray-500">{formatDate(notification.createdAt)}</p>
                </div>
              </div>
              <button
                onClick={() => handleViewProfile(notification.fromUser.username)}
                className="px-3 py-1 bg-[#333] hover:bg-[#444] text-white rounded-lg text-sm"
              >
                View Profile
              </button>
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
    <div className="max-w-3xl mx-auto py-6">
      <h1 className="text-2xl font-bold text-white mb-6">Notifications</h1>
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No notifications yet</div>
        ) : (
          notifications.map(notification => renderNotification(notification))
        )}
      </div>
    </div>
  );
};

export default Notifications; 