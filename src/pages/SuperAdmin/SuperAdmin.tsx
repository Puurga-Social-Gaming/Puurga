import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import { 
  Users, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  RefreshCcw, 
  Edit2, 
  Ghost, 
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Mail,
  Calendar,
  Layers,
  Activity,
  UserCheck,
  UserX,
  X,
  Save,
  CheckCircle2,
  Trash2,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

// --- Types ---
interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  totalPurges: number;
  newUsersToday: number;
  postsPerDay: { date: string; count: number }[];
  health: string;
}

interface UserAdminInfo {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  is_ghost: boolean;
  created_at: string;
  last_login?: string;
  posts_count: number;
  purges_count: number;
  avatar_url?: string;
  bio?: string;
}

// --- Sub-components ---

const StatCard = ({ title, value, icon: Icon, trend, description, color = 'accent' }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5 }}
    className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 flex items-start justify-between shadow-theme-lg transition-all hover:border-accent/30"
  >
    <div>
      <p className="text-muted-light text-sm font-medium mb-1 uppercase tracking-wider">{title}</p>
      <h3 className="text-4xl font-extrabold tracking-tight text-foreground">{value.toLocaleString()}</h3>
      <p className="text-sm text-muted-light mt-2 flex items-center gap-1">
        {trend && <span className="text-green-500 font-bold flex items-center mr-1"><TrendingUp size={14} className="mr-0.5" /> {trend}</span>}
        {description}
      </p>
    </div>
    <div className={`p-4 bg-${color}/10 rounded-2xl text-${color} border border-${color}/20`}>
      <Icon size={28} />
    </div>
  </motion.div>
);

const AddUserModal = ({ onClose, onCreate }: { onClose: () => void, onCreate: (data: any) => Promise<void> }) => {
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = async () => {
    if (!formData.username || !formData.email || !formData.password || !formData.full_name) {
      toast.error('All fields are required');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setIsSaving(true);
    try {
      await onCreate(formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-card border border-border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-border flex justify-between items-center bg-accent/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-xl text-accent"><Plus size={24} /></div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Add User</h2>
              <p className="text-sm text-muted-light">Create a new user account</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-border/50 rounded-full transition-colors"><X size={24} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-light mb-1.5">Full Name</label>
            <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full bg-input/50 border border-input-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent outline-none" placeholder="E.g. John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-light mb-1.5">Username</label>
            <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})} className="w-full bg-input/50 border border-input-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent outline-none" placeholder="john_doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-light mb-1.5">Email</label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-input/50 border border-input-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent outline-none" placeholder="john@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-light mb-1.5">Secure Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-input/50 border border-input-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent outline-none pr-10" placeholder="min 8 chars" />
              <button
                 type="button"
                 onClick={() => setShowPassword(!showPassword)}
                 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-foreground"
              >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-light mb-1.5">Role</label>
            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-input/50 border border-input-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent outline-none appearance-none">
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
              <option value="moderator">Moderator</option>
              <option value="business">Business</option>
            </select>
          </div>
          <button onClick={handleSave} disabled={isSaving} className="w-full bg-accent hover:bg-accent-hover text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-theme-button mt-4 disabled:opacity-50">
            {isSaving ? <RefreshCcw className="animate-spin" size={20} /> : <Save size={20} />} Create User
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const UserDetailsModal = ({ user, onClose, onUpdate, onResetPassword, onDelete }: { 
  user: UserAdminInfo, 
  onClose: () => void, 
  onUpdate: (data: any) => Promise<void>,
  onResetPassword: (pwd: string) => Promise<void>,
  onDelete: () => Promise<void>
}) => {
  const [formData, setFormData] = useState({
    email: user.email || '',
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    bio: user.bio || '',
    is_ghost: user.is_ghost
  });
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setIsResetting(true);
    try {
      await onResetPassword(newPassword);
      setNewPassword('');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDelete = async () => {
    const confirmText = prompt(`Type "${user.username}" to confirm permanent deletion of this account.`);
    if (confirmText !== user.username) {
      if (confirmText !== null) toast.error('Confirmation failed');
      return;
    }
    
    setIsSaving(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-card border border-border w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-border flex justify-between items-center bg-accent/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-xl text-accent">
              <Edit2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Manage User</h2>
              <p className="text-sm text-muted-light">Editing {user.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-border/50 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-8 flex-1 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-muted uppercase tracking-widest">Profile Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-light mb-1.5">Email</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-input/50 border border-input-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-light mb-1.5">Username</label>
                <input 
                  type="text" 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full bg-input/50 border border-input-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-light mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full bg-input/50 border border-input-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-light mb-1.5">Role</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full bg-input/50 border border-input-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent outline-none appearance-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-light mb-1.5">Bio</label>
                <textarea 
                  value={formData.bio}
                  onChange={e => setFormData({...formData, bio: e.target.value})}
                  className="w-full bg-input/50 border border-input-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent outline-none h-24 resize-none"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-accent/5 rounded-2xl border border-accent/10">
                <div>
                  <p className="font-semibold text-foreground">Ghost Mode</p>
                  <p className="text-xs text-muted-light">Freeze user activities</p>
                </div>
                <button 
                  onClick={() => setFormData({...formData, is_ghost: !formData.is_ghost})}
                  className={`w-12 h-6 rounded-full transition-all relative ${formData.is_ghost ? 'bg-red-500' : 'bg-gray-600'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.is_ghost ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>
            
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-accent hover:bg-accent-hover text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-theme-button disabled:opacity-50"
            >
              {isSaving ? <RefreshCcw className="animate-spin" size={20} /> : <Save size={20} />}
              Save Changes
            </button>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-bold text-muted uppercase tracking-widest">Security</h3>
            
            <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-red-500 mb-2">
                <Lock size={18} />
                <p className="font-bold text-sm">Force Password Reset</p>
              </div>
              <p className="text-xs text-muted-light leading-relaxed">
                Enter a new password for this user. They will be able to log in with this password immediately.
              </p>
              <input 
                type="password" 
                placeholder="New secure password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-input/50 border border-input-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-red-500 outline-none"
              />
              <button 
                onClick={handleResetPassword}
                disabled={isResetting || !newPassword}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isResetting ? <RefreshCcw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                Reset Password
              </button>
            </div>

            <div className="p-6 bg-card border border-border rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Account Metrics</h4>
              <div className="flex justify-between text-sm">
                <span className="text-muted-light">Joined</span>
                <span className="text-foreground">{format(new Date(user.created_at), 'PPP')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-light">Posts</span>
                <span className="text-foreground font-bold">{user.posts_count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-light">Purges Received</span>
                <span className="text-foreground font-bold">{user.purges_count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-light">User ID</span>
                <span className="text-xs font-mono text-muted-light truncate ml-4" title={user.id}>{user.id}</span>
              </div>
            </div>
            
            <div className="p-6 bg-red-900/10 border border-red-500/20 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-red-500 mb-2">
                <AlertCircle size={18} />
                <p className="font-bold text-sm">Danger Zone</p>
              </div>
              <p className="text-xs text-muted-light leading-relaxed">
                Permanently delete this user from the Puurga network. This action cannot be reversed.
              </p>
              <button 
                onClick={handleDelete}
                disabled={isSaving}
                className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSaving ? <RefreshCcw className="animate-spin" size={18} /> : <X size={18} />}
                Delete User Account
              </button>
            </div>
          </div>
        </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Main Page Component ---

const SuperAdmin: React.FC = () => {
  const { user: currentUser } = useUser();
  const navigate = useNavigate();

  // State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserAdminInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minPosts, setMinPosts] = useState<string>('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUser, setSelectedUser] = useState<UserAdminInfo | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'system'>('users');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [totalLogPages, setTotalLogPages] = useState(1);
  const [systemPage, setSystemPage] = useState(1);
  const [totalSystemPages, setTotalSystemPages] = useState(1);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const limit = 10;

  useEffect(() => {
    // Auth Check
    if (currentUser && currentUser.role !== 'super_admin' && currentUser.role !== 'superadmin') {
      toast.error('Access Denied: Super Admin Only');
      navigate('/home');
    }
  }, [currentUser, navigate]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users', { 
          params: { 
            page, 
            limit, 
            search, 
            status: statusFilter,
            role: roleFilter,
            startDate,
            endDate,
            minPosts,
            sortBy,
            sortOrder
          } 
        })
      ]);
      
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setTotalPages(Math.ceil(usersRes.data.total / limit));
    } catch (error: any) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setSelectedUserIds([]);
      setLoading(false);
    }
  }, [page, search, statusFilter, roleFilter, startDate, endDate, minPosts, sortBy, sortOrder, limit]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/logs', { params: { page: logPage, limit: 20 } });
      setAuditLogs(res.data.logs);
      setTotalLogPages(Math.ceil(res.data.total / 20));
    } catch (error) {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [logPage]);

  const fetchSystemLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/error-logs', { params: { page: systemPage, limit: 20 } });
      setSystemLogs(res.data.logs);
      setTotalSystemPages(Math.ceil(res.data.total / 20));
    } catch (error) {
      toast.error('Failed to load system health data');
    } finally {
      setLoading(false);
    }
  }, [systemPage]);

  useEffect(() => {
    if (activeTab === 'users') {
      const delayDebounceFn = setTimeout(() => {
        fetchData();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    } else if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'system') {
      fetchSystemLogs();
    }
  }, [fetchData, fetchLogs, fetchSystemLogs, activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'users') {
      await fetchData();
    } else if (activeTab === 'logs') {
      await fetchLogs();
    } else if (activeTab === 'system') {
      await fetchSystemLogs();
    }
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleUpdateUser = async (data: any) => {
    try {
      await api.put(`/admin/users/${selectedUser?.id}`, data);
      toast.success('User updated successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    }
  };

  const handleCreateUser = async (data: any) => {
    try {
      await api.post('/admin/users', data);
      toast.success('User created successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    }
  };

  const handleResetPassword = async (password: string) => {
    try {
      await api.post(`/admin/users/${selectedUser?.id}/reset-password`, { password });
      toast.success('Password reset successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    }
  };

  const handleGhostToggle = async (user: UserAdminInfo) => {
    const action = user.is_ghost ? 'unghost' : 'ghost';
    const confirm = window.confirm(`Are you sure you want to ${action} ${user.username}?`);
    if (!confirm) return;

    try {
      await api.put(`/admin/users/${user.id}`, { is_ghost: !user.is_ghost });
      toast.success(`User ${action}ed successfully`);
      fetchData();
    } catch (error: any) {
      toast.error(`Failed to ${action} user`);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await api.delete(`/admin/users/${selectedUser.id}`);
      toast.success('User permanently deleted');
      setSelectedUser(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    }
  };
  const exportToCSV = (data: any[], fileName: string) => {
    if (!data.length) return toast.error('No data to export');
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => 
      Object.values(obj).map(val => 
        typeof val === 'object' ? `"${JSON.stringify(val).replace(/"/g, '""')}"` : `"${val}"`
      ).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${fileName}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Exported');
  };

  const exportToJSON = (data: any[], fileName: string) => {
    if (!data.length) return toast.error('No data to export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${fileName}_${new Date().getTime()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('JSON Exported');
  };


  const handleBulkGhost = async (ghost: boolean) => {
    if (selectedUserIds.length === 0) return;
    const action = ghost ? 'ghost' : 'unghost';
    if (!window.confirm(`Are you sure you want to bulk ${action} ${selectedUserIds.length} users?`)) return;

    try {
      setRefreshing(true);
      await api.post('/admin/users/bulk-update', { 
        ids: selectedUserIds, 
        updates: { is_ghost: ghost } 
      });
      toast.success(`Bulk ${action} successful`);
      fetchData();
    } catch (error: any) {
      toast.error('Bulk operation failed');
    } finally {
      setRefreshing(false);
    }
  };

  const handleBulkResetPassword = async () => {
    if (selectedUserIds.length === 0) return;
    const newPass = prompt(`Enter a new temporary password for ${selectedUserIds.length} users:`);
    if (!newPass) return;
    if (newPass.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setRefreshing(true);
      await api.post('/admin/users/bulk-reset-password', { 
        ids: selectedUserIds, 
        password: newPass 
      });
      toast.success('Bulk password reset complete');
      fetchData();
    } catch (error: any) {
      toast.error('Bulk password reset failed');
    } finally {
      setRefreshing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    const confirm = prompt(`To delete ${selectedUserIds.length} users permanently, type "DELETE ALL"`);
    if (confirm !== 'DELETE ALL') return;

    try {
      setRefreshing(true);
      await api.post('/admin/users/bulk-delete', { ids: selectedUserIds });
      toast.success(`Permanently deleted ${selectedUserIds.length} users`);
      fetchData();
    } catch (error: any) {
      toast.error('Bulk deletion failed');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === users.length && users.length > 0) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map(u => u.id));
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };


  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-2 text-accent font-bold uppercase tracking-widest text-sm mb-2"
            >
              <ShieldCheck size={16} />
              Super Admin Control
            </motion.div>
            <motion.h1 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-black tracking-tight"
            >
              Dashboard
            </motion.h1>
          </div>
          
          <div className="flex items-center gap-3">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddModal(true)}
              className="p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-2xl hover:bg-green-500 hover:text-white transition-all flex items-center gap-2 shadow-theme-md"
            >
              <Plus size={20} />
              <span className="hidden sm:inline font-bold uppercase text-xs">Add User</span>
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-4 bg-card border border-border rounded-2xl hover:bg-card-hover transition-all flex items-center gap-2 shadow-theme-md"
            >
              <RefreshCcw className={refreshing ? 'animate-spin' : ''} size={20} />
              <span className="hidden sm:inline font-bold">Refresh</span>
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const data = activeTab === 'users' ? users : activeTab === 'logs' ? auditLogs : systemLogs;
                exportToJSON(data, `${activeTab}_full_export`);
              }}
              className="p-4 bg-accent/10 border border-accent/20 text-accent rounded-2xl hover:bg-accent hover:text-white transition-all flex items-center gap-2 shadow-theme-md"
            >
              <Download size={20} />
              <span className="hidden sm:inline font-bold uppercase text-xs">Export</span>
            </motion.button>
            <div className="h-10 w-px bg-border mx-2 hidden md:block" />
            <div className="flex flex-col text-right">
              <span className="text-sm font-bold text-foreground">System Health</span>
              <div className="flex items-center gap-2 justify-end text-green-500 text-xs font-bold uppercase">
                <Activity size={12} className="animate-pulse" />
                {stats?.health || 'Optimal'}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard 
            title="Total Citizens" 
            value={stats?.totalUsers || 0} 
            icon={Users} 
            description="Across all regions" 
          />
          <StatCard 
            title="Active Now" 
            value={stats?.activeUsers || 0} 
            icon={UserCheck} 
            description={`${Math.round(((stats?.activeUsers || 0) / (stats?.totalUsers || 1)) * 100)}% of total population`}
            color="green-500"
          />
          <StatCard 
            title="Posts Today" 
            value={stats?.totalPosts || 0} 
            icon={Layers} 
            trend={`+${stats?.newUsersToday || 0}`}
            description="new posts added"
            color="blue-500"
          />
          <StatCard 
            title="Total Purges" 
            value={stats?.totalPurges || 0} 
            icon={Ghost} 
            description="System purification level"
            color="purple-500"
          />
        </div>

        {/* Activity Visualization */}
        {stats?.postsPerDay && stats.postsPerDay.length > 0 && (
          <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-8 mb-8 shadow-theme-xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">System Pulse</h3>
                <p className="text-sm text-muted">Daily citizen activity for the last 7 days</p>
              </div>
              <div className="flex items-center gap-2 text-accent font-bold text-sm">
                <TrendingUp size={16} />
                Global Activity
              </div>
            </div>
            
            <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 px-4 overflow-hidden">
              {stats.postsPerDay.map((day, idx) => {
                const maxCount = Math.max(...stats.postsPerDay.map(d => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    <div className="w-full relative min-h-[4px]">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 1, delay: idx * 0.1 }}
                        className={`w-full rounded-t-xl transition-all duration-500 relative ${
                          idx === stats.postsPerDay.length - 1 
                            ? 'bg-gradient-to-t from-accent/40 to-accent shadow-[0_0_20px_-5px_rgba(255,107,0,0.5)]' 
                            : 'bg-muted/30 group-hover:bg-accent/40'
                        }`}
                      >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-border shadow-xl">
                          {day.count} POSTS
                        </div>
                      </motion.div>
                    </div>
                    <div className="mt-4 text-[10px] sm:text-xs font-bold text-muted uppercase tracking-tighter truncate w-full text-center">
                      {idx === stats.postsPerDay.length - 1 ? 'Today' : format(new Date(day.date), 'EEE')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* Tab Switcher */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
              activeTab === 'users' 
                ? 'bg-accent text-white shadow-theme-button' 
                : 'bg-card border border-border text-muted hover:text-foreground'
            }`}
          >
            <Users size={20} />
            Citizens List
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
              activeTab === 'logs' 
                ? 'bg-accent text-white shadow-theme-button' 
                : 'bg-card border border-border text-muted hover:text-foreground'
            }`}
          >
            <ShieldAlert size={20} />
            Activity Logs
          </button>
          <button 
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
              activeTab === 'system' 
                ? 'bg-red-500 text-white shadow-theme-button' 
                : 'bg-card border border-border text-muted hover:text-foreground'
            }`}
          >
            <Activity size={20} />
            System Health
          </button>
        </div>

        {activeTab === 'users' ? (
          <div className="space-y-8">
            {/* Filters & Actions Bar */}

        <div className="bg-card/30 backdrop-blur-md border border-border/50 rounded-3xl p-6 mb-8 shadow-theme-xl space-y-6">
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div className="flex-1 relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
              <input 
                type="text" 
                placeholder="Search name, email, or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-input/40 border border-input-border/50 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-accent outline-none transition-all placeholder:text-muted/60"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 p-1 bg-background-secondary rounded-2xl border border-border/50">
                {['all', 'active', 'ghosted'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
                      statusFilter === status 
                        ? 'bg-accent text-white shadow-theme-button' 
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-border/30">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase text-muted tracking-widest whitespace-nowrap">Filter Role</span>
              <select 
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="bg-background-secondary border border-border rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-accent transition-all"
              >
                <option value="all">All Roles</option>
                <option value="user">Citizens</option>
                <option value="super_admin">Admins</option>
                <option value="moderator">Moderators</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase text-muted tracking-widest whitespace-nowrap">Registered Between</span>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-background-secondary border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-accent transition-all color-scheme-dark"
                />
                <span className="text-muted text-xs">to</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-background-secondary border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-accent transition-all color-scheme-dark"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 border-l border-border/30 pl-6">
              <span className="text-xs font-black uppercase text-muted tracking-widest whitespace-nowrap">Activity Level</span>
              <select 
                value={minPosts}
                onChange={e => setMinPosts(e.target.value)}
                className="bg-background-secondary border border-border rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-accent transition-all"
              >
                <option value="">Any Activity</option>
                <option value="1">Active (1+ Posts)</option>
                <option value="10">High (10+ Posts)</option>
                <option value="50">Elite (50+ Posts)</option>
              </select>
            </div>

            <button 
              onClick={() => {
                setRoleFilter('all');
                setStartDate('');
                setEndDate('');
                setMinPosts('');
                setStatusFilter('all');
                setSearch('');
              }}
              className="ml-auto text-xs font-bold text-accent hover:underline uppercase tracking-widest"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-card/50 backdrop-blur-xl border border-border rounded-3xl overflow-hidden shadow-theme-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-accent/5 text-muted uppercase text-xs font-black tracking-[0.2em] border-b border-border">
                  <th className="px-6 py-6 text-left w-12">
                    <input 
                      type="checkbox" 
                      onChange={toggleSelectAll}
                      checked={selectedUserIds.length === users.length && users.length > 0}
                      className="w-5 h-5 rounded border-border bg-background-secondary text-accent focus:ring-accent"
                    />
                  </th>
                  <th className="px-8 py-6 text-left cursor-pointer hover:bg-accent/10 transition-colors" onClick={() => toggleSort('username')}>
                    <div className="flex items-center gap-2">
                       Citizen
                       {sortBy === 'username' ? (sortOrder === 'asc' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>) : <ArrowUpDown size={14} className="opacity-30"/>}
                    </div>
                  </th>
                  <th className="px-8 py-6 text-left cursor-pointer hover:bg-accent/10 transition-colors" onClick={() => toggleSort('created_at')}>
                    <div className="flex items-center gap-2">
                      Contact & Dates
                      {sortBy === 'created_at' ? (sortOrder === 'asc' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>) : <ArrowUpDown size={14} className="opacity-30"/>}
                    </div>
                  </th>
                  <th className="px-8 py-6 text-center cursor-pointer hover:bg-accent/10 transition-colors" onClick={() => toggleSort('posts_count')}>
                    <div className="flex items-center justify-center gap-2">
                      Activities
                      {sortBy === 'posts_count' ? (sortOrder === 'asc' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>) : <ArrowUpDown size={14} className="opacity-30"/>}
                    </div>
                  </th>
                  <th className="px-8 py-6 text-center">Status</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <RefreshCcw className="animate-spin text-accent" size={40} />
                        <span className="text-muted font-bold tracking-widest text-sm uppercase">Synchronizing Citizens...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-muted">
                      No citizens found matching your criteria
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <motion.tr 
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-accent/5 transition-colors group"
                    >
                      <td className="px-6 py-6">
                        <input 
                          type="checkbox" 
                          checked={selectedUserIds.includes(u.id)}
                          onChange={() => toggleSelectUser(u.id)}
                          className="w-5 h-5 rounded border-border bg-background-secondary text-accent focus:ring-accent"
                        />
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img 
                              src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}&background=random`} 
                              alt={u.username}
                              className="w-14 h-14 rounded-2xl object-cover border-2 border-border group-hover:border-accent/50 transition-all"
                            />
                            {u.is_ghost && <div className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-lg text-white"><Ghost size={12} /></div>}
                          </div>
                          <div>
                            <div className="font-black text-lg text-foreground leading-tight group-hover:text-accent transition-colors">
                              {u.full_name || u.username}
                            </div>
                            <div className="text-sm text-muted">@{u.username}</div>
                            <div className="mt-1 inline-flex px-2 py-0.5 bg-background-secondary rounded-lg text-[10px] uppercase font-bold text-accent tracking-tighter">
                              {u.role}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-foreground font-medium">
                            <Mail size={14} className="text-muted" />
                            {/* Email extracted from metadata if possible, else hidden */}
                            <span className="text-muted/50 italic text-xs">Private Maildrop</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-light text-xs uppercase font-bold tracking-wider">
                            <Calendar size={12} />
                            Born: {format(new Date(u.created_at), 'dd MMM yyyy')}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-center gap-6">
                          <div className="text-center">
                            <div className="text-xl font-black text-foreground">{u.posts_count}</div>
                            <div className="text-[10px] uppercase font-bold text-muted-light">Posts</div>
                          </div>
                          <div className="w-px h-6 bg-border/50" />
                          <div className="text-center">
                            <div className="text-xl font-black text-foreground">{u.purges_count}</div>
                            <div className="text-[10px] uppercase font-bold text-muted-light">Purges</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                          u.is_ghost 
                            ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15px_-5px_#ef4444]' 
                            : 'bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_15px_-5px_#22c55e]'
                        }`}>
                          {u.is_ghost ? 'GHOSTED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setSelectedUser(u)}
                            className="p-3 bg-card border border-border rounded-xl text-muted hover:text-accent hover:border-accent/40 transition-all"
                            title="Edit User"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleGhostToggle(u)}
                            className={`p-3 border rounded-xl transition-all ${
                              u.is_ghost 
                                ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500 hover:text-white' 
                                : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'
                            }`}
                            title={u.is_ghost ? "Unghost User" : "Ghost User"}
                          >
                            {u.is_ghost ? <UserCheck size={18} /> : <UserX size={18} />}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-8 border-t border-border flex items-center justify-between bg-accent/5">
            <p className="text-sm font-medium text-muted">
              Showing <span className="text-foreground">{users.length}</span> of {stats?.totalUsers || 0} Citizens
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-3 bg-card border border-border rounded-xl text-muted hover:text-accent disabled:opacity-30 disabled:hover:text-muted transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center px-4 font-bold text-sm">
                Page <span className="text-accent mx-1.5">{page}</span> of {totalPages}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-3 bg-card border border-border rounded-xl text-muted hover:text-accent disabled:opacity-30 disabled:hover:text-muted transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    ) : activeTab === 'logs' ? (
          /* Logs Table Container */
          <div className="space-y-8">
            <div className="bg-card/50 backdrop-blur-xl border border-border rounded-3xl overflow-hidden shadow-theme-xl">
              <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-accent/5 text-muted uppercase text-xs font-black tracking-[0.2em] border-b border-border">
                    <th className="px-8 py-6 text-left">Supervisor</th>
                    <th className="px-8 py-6 text-left">Action</th>
                    <th className="px-8 py-6 text-left">Target ID</th>
                    <th className="px-8 py-6 text-left">Metadata</th>
                    <th className="px-8 py-6 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <RefreshCcw className="animate-spin text-accent" size={40} />
                          <span className="text-muted font-bold tracking-widest text-sm uppercase">Retrieving Audit Logs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-muted">
                        No logs recorded yet
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-accent/5 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <img 
                              src={log.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${log.profiles?.username}&background=random`} 
                              className="w-10 h-10 rounded-xl"
                            />
                            <div>
                              <div className="font-bold text-foreground">@{log.profiles?.username || 'System'}</div>
                              <div className="text-[10px] text-muted">{log.ip_address}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            log.action.includes('DELETE') ? 'bg-red-500/10 text-red-500' :
                            log.action.includes('UPDATE') ? 'bg-blue-500/10 text-blue-500' :
                            'bg-accent/10 text-accent'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-8 py-6 font-mono text-xs text-muted-light truncate max-w-[120px]">
                          {log.target_id}
                        </td>
                        <td className="px-8 py-6 text-xs text-muted leading-tight">
                          {JSON.stringify(log.details)}
                        </td>
                        <td className="px-8 py-6 text-right text-sm text-foreground font-medium">
                          {format(new Date(log.created_at), 'HH:mm:ss')}
                          <div className="text-[10px] text-muted-light tracking-widest uppercase">
                            {format(new Date(log.created_at), 'dd MMM yyyy')}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-8 border-t border-border flex items-center justify-between bg-accent/5">
              <p className="text-sm font-medium text-muted">
                Audit Log History
              </p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setLogPage(p => Math.max(1, p - 1))}
                  disabled={logPage === 1}
                  className="p-3 bg-card border border-border rounded-xl text-muted hover:text-accent disabled:opacity-30 disabled:hover:text-muted transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center px-4 font-bold text-sm">
                  Page <span className="text-accent mx-1.5">{logPage}</span> of {totalLogPages}
                </div>
                <button 
                  onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                  disabled={logPage === totalLogPages}
                  className="p-3 bg-card border border-border rounded-xl text-muted hover:text-accent disabled:opacity-30 disabled:hover:text-muted transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
          /* System Health Container */
          <div className="space-y-8">
            <div className="bg-card/50 backdrop-blur-xl border border-border rounded-3xl overflow-hidden shadow-theme-xl">
              <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-accent/5 text-muted uppercase text-xs font-black tracking-[0.2em] border-b border-border">
                    <th className="px-8 py-6 text-left">Level</th>
                    <th className="px-8 py-6 text-left">Error Message</th>
                    <th className="px-8 py-6 text-left">Endpoint</th>
                    <th className="px-8 py-6 text-left">Stack</th>
                    <th className="px-8 py-6 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <RefreshCcw className="animate-spin text-accent" size={40} />
                          <span className="text-muted font-bold tracking-widest text-sm uppercase">Checking System Health...</span>
                        </div>
                      </td>
                    </tr>
                  ) : systemLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-muted">
                        No system errors reported. Dashboard Optimal.
                      </td>
                    </tr>
                  ) : (
                    systemLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-accent/5 transition-colors group">
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            log.level === 'CRITICAL' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' :
                            log.level === 'ERROR' ? 'bg-red-500/10 text-red-500' :
                            'bg-yellow-500/10 text-yellow-500'
                          }`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="px-8 py-6 max-w-md">
                          <div className="font-bold text-foreground truncate" title={log.message}>
                            {log.message}
                          </div>
                          <div className="text-[10px] text-muted flex items-center gap-2 mt-1">
                            <span className="font-mono">{log.ip_address}</span>
                            {log.profiles?.username && <span>• @{log.profiles.username}</span>}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                             <span className="px-2 py-0.5 bg-accent/10 rounded text-[10px] font-black text-accent">{log.method}</span>
                             <span className="text-xs font-mono text-muted truncate max-w-[150px]">{log.path}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <button 
                            onClick={() => alert(log.stack)}
                            className="text-[10px] font-bold text-accent hover:underline uppercase tracking-widest"
                           >
                            View Stack
                           </button>
                        </td>
                        <td className="px-8 py-6 text-right text-sm text-foreground font-medium">
                          {format(new Date(log.created_at), 'HH:mm:ss')}
                          <div className="text-[10px] text-muted-light tracking-widest uppercase">
                            {format(new Date(log.created_at), 'dd MMM yyyy')}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-8 border-t border-border flex items-center justify-between bg-accent/5">
              <p className="text-sm font-medium text-muted">
                System Incident Logs
              </p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSystemPage(p => Math.max(1, p - 1))}
                  disabled={systemPage === 1}
                  className="p-3 bg-card border border-border rounded-xl text-muted hover:text-accent disabled:opacity-30 disabled:hover:text-muted transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center px-4 font-bold text-sm">
                  Page <span className="text-accent mx-1.5">{systemPage}</span> of {totalSystemPages}
                </div>
                <button 
                  onClick={() => setSystemPage(p => Math.min(totalSystemPages, p + 1))}
                  disabled={systemPage === totalSystemPages}
                  className="p-3 bg-card border border-border rounded-xl text-muted hover:text-accent disabled:opacity-30 disabled:hover:text-muted transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


        {/* Audit Log Hint */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 p-6 bg-accent/5 border border-accent/10 rounded-3xl flex items-start gap-4"
        >
          <div className="p-2 bg-accent/10 rounded-xl text-accent mt-1">
            <AlertCircle size={20} />
          </div>
          <div>
            <h4 className="font-bold text-foreground">Audit Logging Active</h4>
            <p className="text-sm text-muted-light leading-relaxed max-w-2xl">
              All administrative actions including password resets, profile updates, and status changes are being recorded with timestamp, IP address, and supervisor ID. Security is our top priority.
            </p>
          </div>
        </motion.div>

      </div>

      {/* Bulk Actions Floating Bar */}
      <AnimatePresence>
        {selectedUserIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
          >
            <div className="bg-popover border border-accent/20 rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4 backdrop-blur-xl">
              <div className="flex items-center gap-4 px-4 border-r border-border mr-2">
                <div className="bg-accent text-white w-10 h-10 rounded-xl flex items-center justify-center font-black">
                  {selectedUserIds.length}
                </div>
                <div>
                  <div className="text-foreground font-bold text-sm">Selected</div>
                  <div className="text-muted text-[10px] uppercase font-bold">Citizens</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-1">
                <button 
                  onClick={() => handleBulkGhost(true)}
                  className="flex-1 p-3 bg-red-500/10 text-red-500 rounded-xl font-bold text-xs uppercase hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Ghost size={16} /> Bulk Ghost
                </button>
                <button 
                  onClick={handleBulkResetPassword}
                  className="flex-1 p-3 bg-blue-500/10 text-blue-500 rounded-xl font-bold text-xs uppercase hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Lock size={16} /> Bulk Pass
                </button>
                <button 
                  onClick={() => exportToCSV(users.filter(u => selectedUserIds.includes(u.id)), 'selected_citizens')}
                  className="p-3 bg-accent/10 text-accent rounded-xl font-bold text-xs uppercase hover:bg-accent hover:text-white transition-all flex items-center justify-center gap-2"
                  title="Export Selected to CSV"
                >
                  <Download size={16} />
                </button>
                <button 
                  onClick={() => handleBulkGhost(false)}
                  className="flex-1 p-3 bg-green-500/10 text-green-500 rounded-xl font-bold text-xs uppercase hover:bg-green-500 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <UserCheck size={16} /> Bulk Active
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="p-3 bg-card border border-border text-red-500 rounded-xl font-bold text-xs uppercase hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                  title="Bulk Permanent Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <button 
                onClick={() => setSelectedUserIds([])}
                className="p-2 text-muted hover:text-foreground transition-colors mr-2"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {selectedUser && (
          <UserDetailsModal 
            user={selectedUser as UserAdminInfo} 
            onClose={() => setSelectedUser(null)}
            onUpdate={handleUpdateUser}
            onResetPassword={handleResetPassword}
            onDelete={handleDeleteUser}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <AddUserModal 
            onClose={() => setShowAddModal(false)}
            onCreate={handleCreateUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperAdmin;