import React, { useState, useEffect } from 'react';
import { useUser, User } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import { Eye, EyeOff, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { AxiosError } from 'axios';

interface ApiError {
  message: string;
}

interface NewUserData {
  name: string;
  email: string;
  username: string;
  password: string;
  role: 'user' | 'admin' | 'super_admin' | 'business';
}

const SuperAdmin: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState<NewUserData>({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'user'
  });

  useEffect(() => {
    // Check if user is admin
    if (user?.email !== 'admin@gmail.com' && user?.role !== 'super_admin') {
      toast.error('Unauthorized access');
      navigate('/home');
      return;
    }
    fetchUsers();
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/users');
      setUsers(response.data);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      console.error('Error fetching users:', axiosError);
      toast.error(axiosError.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleCreateUser = async () => {
    try {
      // Validate input
      if (!newUser.name || !newUser.email || !newUser.username || !newUser.password) {
        toast.error('All fields are required');
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newUser.email)) {
        toast.error('Invalid email format');
        return;
      }

      // Password validation
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(newUser.password)) {
        toast.error('Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character');
        return;
      }

      const response = await api.post<User>('/api/admin/users', newUser);
      setUsers(prev => [...prev, response.data]);
      setShowCreateModal(false);
      setNewUser({
        name: '',
        email: '',
        username: '',
        password: '',
        role: 'user'
      });
      toast.success('User created successfully');
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      console.error('Error creating user:', axiosError);
      toast.error(axiosError.response?.data?.message || 'Failed to create user');
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleBlock = async (userId: string, isBlocked: boolean) => {
    try {
      await api.put(`/api/admin/users/${userId}/block`, { isBlocked: !isBlocked });
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, isBlocked: !isBlocked } : user
      ));
      toast.success(isBlocked ? 'User unblocked' : 'User blocked');
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      console.error('Error toggling block:', axiosError);
      toast.error(axiosError.response?.data?.message || 'Failed to toggle block');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await api.delete(`/api/admin/users/${userId}`);
      setUsers(prev => prev.filter(user => user.id !== userId));
      toast.success('User deleted');
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      console.error('Error deleting user:', axiosError);
      toast.error(axiosError.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="p-6 bg-[#111] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 rounded-lg bg-[#222] text-white border border-[#333] focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              Create User
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-white">Loading...</div>
        ) : (
          <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#222] text-gray-400 text-left">
                    <th className="px-4 py-3">User Info</th>
                    <th className="px-4 py-3">Account Details</th>
                    <th className="px-4 py-3">Privacy Settings</th>
                    <th className="px-4 py-3">Stats</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-t border-[#333] hover:bg-[#222] transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatar || '/default-avatar.png'}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <div className="text-white font-medium">{user.name}</div>
                            <div className="text-gray-400 text-sm">@{user.username}</div>
                            <div className="text-gray-400 text-sm">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="text-white text-sm">
                            Role: <span className="text-blue-400">{user.role}</span>
                          </div>
                          <div className="text-white text-sm">
                            Status: 
                            <span className={user.isBlocked ? 'text-red-400 ml-1' : 'text-green-400 ml-1'}>
                              {user.isBlocked ? 'Blocked' : 'Active'}
                            </span>
                          </div>
                          <div className="text-gray-400 text-sm">
                            Joined: {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400">Password:</span>
                            <div className="flex items-center">
                              <span className="font-mono text-white">
                                {showPasswords[user.id] ? "password" : '••••••••'}
                              </span>
                              <button
                                onClick={() => togglePasswordVisibility(user.id)}
                                className="p-1 ml-2 text-gray-400 hover:text-white"
                              >
                                {showPasswords[user.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1 text-sm">
                          <div className="text-gray-400">
                            Account: {user.isPrivate ? 'Private' : 'Public'}
                          </div>
                          <div className="text-gray-400">
                            Messages: {user.messageRequests}
                          </div>
                          <div className="text-gray-400">
                            Comments: {user.commentPrivacy}
                          </div>
                          <div className="text-gray-400">
                            Stories: {user.storyPrivacy}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1 text-sm">
                          <div className="text-gray-400">
                            Posts: {user.postCount}
                          </div>
                          <div className="text-gray-400">
                            Likes: {user.totalLikes}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleToggleBlock(user.id, user.isBlocked || false)}
                            className={`p-2 rounded-lg text-white ${
                              user.isBlocked ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                            }`}
                          >
                            {user.isBlocked ? 'Unblock' : 'Block'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="px-3 py-1 rounded text-sm bg-red-500 hover:bg-red-600 text-white transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#1a1a1a] rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Create New User</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#222] border border-[#333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#222] border border-[#333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter email"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#222] border border-[#333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter username"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#222] border border-[#333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter password"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as NewUserData['role'] }))}
                    className="w-full px-3 py-2 bg-[#222] border border-[#333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="business">Business</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                
                <button
                  onClick={handleCreateUser}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg mt-4"
                >
                  Create User
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdmin; 