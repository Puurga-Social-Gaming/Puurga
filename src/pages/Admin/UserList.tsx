import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import Avatar from '../../components/Avatar';
import { toast } from 'react-hot-toast';
import { Trash2, Lock, Unlock } from 'lucide-react';
import { useUser, User } from '../../context/UserContext';
import { AxiosError } from 'axios';

interface ApiError {
  message: string;
}

const UserList: React.FC = () => {
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (err) {
      setError('Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleResetAllPasswords = async () => {
    try {
      setIsResetting(true);
      await api.post('/admin/users/reset-passwords');
      toast.success('All passwords have been reset to "Password@123"');
      await fetchUsers();
    } catch (err) {
      console.error('Error resetting passwords:', err);
      toast.error('Failed to reset passwords');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      setActionInProgress(userId);
      await api.delete(`/admin/users/${userId}`);
      toast.success('User deleted successfully');
      await fetchUsers();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleBlock = async (userId: string, isCurrentlyBlocked: boolean) => {
    try {
      setActionInProgress(userId);
      await api.put(`/admin/users/${userId}/toggle-block`);
      toast.success(`User ${isCurrentlyBlocked ? 'unblocked' : 'blocked'} successfully`);
      await fetchUsers();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      console.error('Error toggling user block status:', error);
      toast.error(error.response?.data?.message || 'Failed to update user status');
    } finally {
      setActionInProgress(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return <div className="text-white">Loading users...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  const canManageUser = (userToManage: User) => {
    if (!currentUser) return false;
    if (currentUser.email === 'admin@gmail.com') return true;
    if (currentUser.role !== 'super_admin') return false;
    if (userToManage.role === 'super_admin') return false;
    return true;
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">All Users</h1>
        <button
          onClick={handleResetAllPasswords}
          disabled={isResetting}
          className={`px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors ${isResetting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
        >
          {isResetting ? 'Resetting Passwords...' : 'Reset All Passwords'}
        </button>
      </div>
      <div className="grid gap-4">
        {users.map(user => (
          <div
            key={user.id}
            className={`bg-[#1a1a1a] p-4 rounded-lg ${user.isBlocked ? 'opacity-75' : ''}`}
          >
            <div className="flex items-center gap-4">
              <Avatar src={user.avatar || undefined} alt={user.name} size="md" />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-white font-semibold">{user.name}</h2>
                      {user.isBlocked && (
                        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">Blocked</span>
                      )}
                    </div>
                    <p className="text-gray-400">@{user.username}</p>
                    <p className="text-gray-400">{user.email}</p>
                    <p className="text-gray-400">Role: {user.role}</p>
                    <div className="flex gap-4 mt-2">
                      <p className="text-gray-500 text-sm">Posts: {user.postCount || 0}</p>
                      <p className="text-gray-500 text-sm">Total Likes: {user.totalLikes || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-500 text-sm">
                      Joined: {formatDate(user.createdAt)}
                    </p>
                    {canManageUser(user) && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleToggleBlock(user.id, user.isBlocked || false)}
                          disabled={actionInProgress === user.id}
                          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#2d2d2d] transition-colors"
                          title={user.isBlocked ? 'Unblock User' : 'Block User'}
                        >
                          {user.isBlocked ? <Unlock size={18} /> : <Lock size={18} />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={actionInProgress === user.id}
                          className="p-2 text-red-400 hover:text-red-500 rounded-lg hover:bg-[#2d2d2d] transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserList; 