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
  BarChart3,
  Monitor,
  Ban,
  Unlock,
  AlertTriangle,
  BadgeCheck,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import SuperAdminAnalytics from '../../components/SuperAdmin/SuperAdminAnalytics';
import ProfileLink from '../../components/Profile/ProfileLink';
import CertificationBadges from '../../components/Profile/CertificationBadges';
import {
  CERTIFICATION_TYPES,
  formatCertPrice,
  getCertification,
  PREMIUM_CHECK_SLUGS,
} from '../../constants/certifications';
import { formatCdf, formatUsd } from '../../constants/paymentMethods';
import { useDesktopWidthStore } from '../../store/desktopWidthStore';

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
  is_blocked?: boolean;
  created_at: string;
  last_login?: string;
  posts_count: number;
  purges_count: number;
  avatar_url?: string;
  bio?: string;
  credits?: number;
  purga_points?: number;
  certification_slug?: string | null;
  logo_certified?: boolean;
  certified_at?: string | null;
}

// --- Sub-components ---

const StatCard = ({ title, value, icon: Icon, trend, description }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2 }}
    className="rounded-2xl border border-border bg-card p-4 flex items-start justify-between"
  >
    <div className="min-w-0">
      <p className="text-muted text-[10px] font-semibold mb-1 uppercase tracking-[0.14em]">{title}</p>
      <h3 className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">{Number(value || 0).toLocaleString()}</h3>
      <p className="text-[11px] text-muted mt-1.5 flex items-center gap-1 flex-wrap">
        {trend && <span className="text-emerald-500 font-bold flex items-center mr-1"><TrendingUp size={12} className="mr-0.5" /> {trend}</span>}
        {description}
      </p>
    </div>
    <div className="p-2.5 rounded-xl text-accent border border-accent/20 bg-accent/10 shrink-0">
      <Icon size={18} />
    </div>
  </motion.div>
);


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
    is_ghost: user.is_ghost,
    is_blocked: Boolean(user.is_blocked),
    certification_slug: user.certification_slug || 'none',
    logo_certified: Boolean(user.logo_certified),
  });
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const userPoints = Number(user.purga_points ?? user.credits ?? 0);
  const userPosts = Number(user.posts_count || 0);

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
        <div className="p-4 border-b border-border flex justify-between items-center bg-accent/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-accent/10 rounded-lg text-accent">
              <Edit2 size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Manage User</h2>
              <p className="text-xs text-muted-light">Editing {user.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-border/50 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 flex-1 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-muted uppercase tracking-widest">Profile Information</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-light mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-input/50 border border-input-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-light mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full bg-input/50 border border-input-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-light mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full bg-input/50 border border-input-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-light mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full bg-input/50 border border-input-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent outline-none appearance-none text-sm"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-light mb-1">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={e => setFormData({...formData, bio: e.target.value})}
                  className="w-full bg-input/50 border border-input-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent outline-none h-24 resize-none text-sm"
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-accent/5 rounded-xl border border-accent/10">
                <div>
                  <p className="font-semibold text-foreground">Ghost Mode</p>
                  <p className="text-xs text-muted-light">Freeze user activities</p>
                </div>
                <button
                  onClick={() => setFormData({...formData, is_ghost: !formData.is_ghost})}
                  className={`w-11 h-5 rounded-full transition-all relative ${formData.is_ghost ? 'bg-red-500' : 'bg-gray-600'}`}
                >
                  <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all ${formData.is_ghost ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-500/5 rounded-xl border border-red-500/15">
                <div>
                  <p className="font-semibold text-foreground">Blocked</p>
                  <p className="text-xs text-muted-light">Prevent login / access</p>
                </div>
                <button
                  onClick={() => setFormData({...formData, is_blocked: !formData.is_blocked})}
                  className={`w-11 h-5 rounded-full transition-all relative ${formData.is_blocked ? 'bg-red-500' : 'bg-gray-600'}`}
                >
                  <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all ${formData.is_blocked ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              {/* Certifications */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-1.5">
                  <BadgeCheck size={12} className="text-accent" />
                  Certifications
                </h3>
                <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-3">
                  <div className="flex items-center gap-2 text-[11px] text-muted">
                    <span className="font-semibold text-foreground tabular-nums">{userPoints.toLocaleString()} pts</span>
                    <span>·</span>
                    <span className="tabular-nums">{userPosts} posts</span>
                    <span className="ml-auto inline-flex items-center gap-1">
                      Preview
                      <CertificationBadges
                        certificationSlug={
                          formData.certification_slug === 'none'
                            ? null
                            : formData.certification_slug
                        }
                        logoCertified={formData.logo_certified}
                        size="sm"
                      />
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-light mb-1">
                      Premium check badge
                    </label>
                    <select
                      value={formData.certification_slug}
                      onChange={(e) =>
                        setFormData({ ...formData, certification_slug: e.target.value })
                      }
                      className="w-full bg-input/50 border border-input-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent outline-none appearance-none text-sm"
                    >
                      <option value="none">None</option>
                      {PREMIUM_CHECK_SLUGS.map((slug) => {
                        const c = getCertification(slug)!;
                        return (
                          <option key={slug} value={slug}>
                            {c.title} — {formatCertPrice(c.price)}
                            {c.minPoints ? ` (suggest ≥${c.minPoints} pts)` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-accent/5 rounded-xl border border-accent/15">
                    <div className="min-w-0 pr-3">
                      <p className="font-semibold text-foreground text-sm">Puurga Official logo</p>
                      <p className="text-[11px] text-muted-light leading-snug">
                        Loyalty badge beside the name · not for sale · stacks with a check
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, logo_certified: !formData.logo_certified })
                      }
                      className={`w-11 h-5 rounded-full transition-all relative shrink-0 ${
                        formData.logo_certified ? 'bg-accent' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all ${
                          formData.logo_certified ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-accent hover:opacity-90 text-black py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-theme-button disabled:opacity-50 text-sm"
            >
              {isSaving ? <RefreshCcw className="animate-spin" size={16} /> : <Save size={16} />}
              Save Changes
            </button>
          </div>

            <div className="space-y-6">
              <h3 className="text-xs font-bold text-muted uppercase tracking-widest">Security</h3>

              <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-red-500 mb-2">
                  <Lock size={16} />
                  <p className="font-bold text-xs">Force Password Reset</p>
                </div>
                <p className="text-xs text-muted-light leading-relaxed">
                  Enter a new password for this user. They will be able to log in with this password immediately.
                </p>
                <input
                  type="password"
                  placeholder="New secure password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-input/50 border border-input-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 outline-none text-sm"
                />
                <button
                  onClick={handleResetPassword}
                  disabled={isResetting || !newPassword}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm"
                >
                  {isResetting ? <RefreshCcw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Reset Password
                </button>
              </div>

              <div className="p-4 bg-card border border-border rounded-2xl space-y-2">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Account Metrics</h4>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-light">Joined</span>
                  <span className="text-foreground">{format(new Date(user.created_at), 'PPP')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-light">Posts</span>
                  <span className="text-foreground font-bold">{user.posts_count}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-light">Purges Received</span>
                  <span className="text-foreground font-bold">{user.purges_count}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-light">User ID</span>
                  <span className="text-xs font-mono text-muted-light truncate ml-4" title={user.id}>{user.id}</span>
                </div>
              </div>

              <div className="p-4 bg-red-900/10 border border-red-500/20 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-red-500 mb-2">
                  <AlertCircle size={16} />
                  <p className="font-bold text-xs">Danger Zone</p>
                </div>
                <p className="text-xs text-muted-light leading-relaxed">
                  Permanently delete this user from the Puurga network. This action cannot be reversed.
                </p>
                <button
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm"
                >
                  {isSaving ? <RefreshCcw className="animate-spin" size={16} /> : <X size={16} />}
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
  const desktopWidth = useDesktopWidthStore((s) => s.mode);
  const toggleDesktopWidth = useDesktopWidthStore((s) => s.toggleMode);

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
  const [, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'certs' | 'logs' | 'system'>('users');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [totalLogPages, setTotalLogPages] = useState(1);
  const [systemPage, setSystemPage] = useState(1);
  const [totalSystemPages, setTotalSystemPages] = useState(1);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [certRequests, setCertRequests] = useState<any[]>([]);
  const [certRequestsLoading, setCertRequestsLoading] = useState(false);
  const [reviewingCertId, setReviewingCertId] = useState<string | null>(null);
  const [certPricing, setCertPricing] = useState<any[]>([]);
  const [pricingSaving, setPricingSaving] = useState(false);
  const limit = 25;

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

  const fetchCertRequests = useCallback(async () => {
    try {
      setCertRequestsLoading(true);
      const [reqRes, priceRes] = await Promise.all([
        api.get('/admin/certification-requests'),
        api.get('/admin/certification-pricing'),
      ]);
      setCertRequests(reqRes.data.requests || []);
      setCertPricing(priceRes.data.pricing || []);
    } catch (error: any) {
      const msg =
        error?.response?.data?.error || 'Failed to load certification requests';
      toast.error(msg);
      setCertRequests([]);
    } finally {
      setCertRequestsLoading(false);
      setLoading(false);
    }
  }, []);

  const saveCertPricing = async () => {
    setPricingSaving(true);
    try {
      await api.put('/admin/certification-pricing', {
        pricing: certPricing.map((p) => ({
          slug: p.slug,
          price_points: Number(p.price_points ?? p.price ?? 0),
          price_cdf: Number(p.price_cdf ?? 0),
          price_usd: Number(p.price_usd ?? 0),
          enabled: p.enabled !== false,
        })),
      });
      toast.success('Certification prices saved — public catalog updated');
      await fetchCertRequests();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to save prices');
    } finally {
      setPricingSaving(false);
    }
  };

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
    } else if (activeTab === 'analytics') {
      // overview cards still useful — light fetch
      api.get('/admin/stats').then((r) => setStats(r.data)).catch(() => undefined);
      setLoading(false);
    } else if (activeTab === 'certs') {
      fetchCertRequests();
    }
  }, [fetchData, fetchLogs, fetchSystemLogs, fetchCertRequests, activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'users') {
      await fetchData();
    } else if (activeTab === 'logs') {
      await fetchLogs();
    } else if (activeTab === 'system') {
      await fetchSystemLogs();
    } else if (activeTab === 'analytics') {
      try {
        const r = await api.get('/admin/stats');
        setStats(r.data);
      } catch {
        // ignore
      }
    } else if (activeTab === 'certs') {
      await fetchCertRequests();
    }
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleReviewCertRequest = async (
    id: string,
    action: 'approve' | 'reject'
  ) => {
    let admin_note: string | undefined;
    if (action === 'reject') {
      const note = window.prompt('Optional note for the user (reason):');
      if (note === null) return;
      admin_note = note.trim() || undefined;
    }

    setReviewingCertId(id);
    try {
      await api.post(`/admin/certification-requests/${id}/review`, {
        action,
        admin_note,
      });
      toast.success(action === 'approve' ? 'Certification approved' : 'Request declined');
      await fetchCertRequests();
      if (activeTab === 'users') await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Review failed');
    } finally {
      setReviewingCertId(null);
    }
  };

  const handleUpdateUser = async (data: any) => {
    try {
      await api.put(`/admin/users/${selectedUser?.id}`, data);
      toast.success('User updated successfully');
      fetchData();
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ||
        error?.message ||
        'Failed to update user';
      toast.error(msg);
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

  const handleBlockToggle = async (user: UserAdminInfo) => {
    const next = !user.is_blocked;
    const confirm = window.confirm(
      next
        ? `Block @${user.username}? They will lose access.`
        : `Unblock @${user.username}?`
    );
    if (!confirm) return;

    try {
      await api.put(`/admin/users/${user.id}/toggle-block`);
      toast.success(next ? 'User blocked' : 'User unblocked');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update block status');
    }
  };

  const handleWarnUser = async (user: UserAdminInfo) => {
    const message = window.prompt(
      `Warning message for @${user.username}:`,
      'You have received an official warning from Puurga Super Admin. Please follow the community guidelines.'
    );
    if (message === null) return;
    if (!message.trim()) {
      toast.error('Warning message cannot be empty');
      return;
    }

    try {
      await api.post(`/admin/users/${user.id}/warn`, { message: message.trim() });
      toast.success(`Warning sent to @${user.username}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send warning');
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
    <div className="super-admin-page relative w-full text-foreground overflow-x-hidden">
      {/* Soft ambient — works in light & dark */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-0">
        <div className="absolute -top-28 -right-20 w-[380px] h-[380px] rounded-full bg-accent/10 dark:bg-amber-500/10 blur-[90px]" />
        <div className="absolute top-1/3 -left-28 w-[320px] h-[320px] rounded-full bg-emerald-500/8 blur-[100px]" />
      </div>

      <div className="w-full relative z-10 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="inline-flex items-center gap-2 text-accent font-bold uppercase tracking-[0.18em] text-[10px] mb-2 px-2.5 py-1 rounded-full border border-accent/25 bg-accent/10"
            >
              <ShieldCheck size={12} />
              Super Admin Control
            </motion.div>
            <motion.h1
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-2xl md:text-3xl font-black tracking-tight text-foreground"
            >
              Command Center
            </motion.h1>
            <p className="text-xs text-muted mt-1">Live platform intelligence · users · games · engagement</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddModal(true)}
              className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-black transition-all flex items-center gap-2"
            >
              <Plus size={16} />
              <span className="hidden sm:inline font-bold uppercase text-xs">Add User</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 bg-background-secondary border border-border rounded-xl hover:bg-card transition-all flex items-center gap-2 text-foreground"
            >
              <RefreshCcw className={refreshing ? 'animate-spin' : ''} size={16} />
              <span className="hidden sm:inline font-bold text-xs">Refresh</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const data = activeTab === 'users' ? users : activeTab === 'logs' ? auditLogs : systemLogs;
                exportToJSON(data, `${activeTab}_full_export`);
              }}
              className="p-2.5 bg-accent/10 border border-accent/25 text-accent rounded-xl hover:bg-accent hover:text-black transition-all flex items-center gap-2"
            >
              <Download size={16} />
              <span className="hidden sm:inline font-bold uppercase text-xs">Export</span>
            </motion.button>

            <button
              type="button"
              onClick={toggleDesktopWidth}
              className="hidden lg:inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-background-secondary text-foreground text-xs font-semibold hover:bg-card transition-colors"
              title="Toggle desktop content width"
            >
              <Monitor size={14} />
              <span>{desktopWidth === 'compact' ? '80%' : '100%'}</span>
            </button>

            <div className="h-8 w-px bg-border mx-1 hidden md:block" />
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-foreground/80">System Health</span>
              <div className="flex items-center gap-2 justify-end text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase">
                <Activity size={10} className="animate-pulse" />
                {stats?.health || 'Optimal'}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="sa-stats-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            title="Total Posts" 
            value={stats?.totalPosts || 0} 
            icon={Layers} 
            trend={`+${stats?.newUsersToday || 0}`}
            description="new users today"
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

        {/* Tab Switcher — Citizens first (manage everyone) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-sm whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-accent text-black'
                : 'bg-background-secondary border border-border text-muted hover:text-foreground'
            }`}
          >
            <Users size={16} />
            Citizens
          </button>
          <button
            onClick={() => setActiveTab('certs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-sm whitespace-nowrap ${
              activeTab === 'certs'
                ? 'bg-accent text-black'
                : 'bg-background-secondary border border-border text-muted hover:text-foreground'
            }`}
          >
            <BadgeCheck size={16} />
            Certifications
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-sm whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-accent text-black'
                : 'bg-background-secondary border border-border text-muted hover:text-foreground'
            }`}
          >
            <BarChart3 size={16} />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-sm whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-accent text-black'
                : 'bg-background-secondary border border-border text-muted hover:text-foreground'
            }`}
          >
            <ShieldAlert size={16} />
            Activity Logs
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-sm whitespace-nowrap ${
              activeTab === 'system'
                ? 'bg-rose-500 text-white'
                : 'bg-background-secondary border border-border text-muted hover:text-foreground'
            }`}
          >
            <Activity size={16} />
            System Health
          </button>
        </div>

        {activeTab === 'analytics' && <SuperAdminAnalytics />}

        {activeTab === 'certs' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-1">Pending requests</h2>
                  <p className="text-sm text-muted">
                    Users request from Profile → Verified. Check points/posts, then approve or decline.
                    Paid refusals are refunded automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchCertRequests()}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-bold uppercase tracking-wider text-muted hover:text-foreground"
                >
                  <RefreshCcw size={14} className={certRequestsLoading ? 'animate-spin' : ''} />
                  Refresh queue
                </button>
              </div>

              {certRequestsLoading ? (
                <div className="py-10 flex justify-center">
                  <RefreshCcw className="animate-spin text-accent" size={24} />
                </div>
              ) : certRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
                  No open certification requests.
                </div>
              ) : (
                <div className="space-y-3">
                  {certRequests.map((req) => {
                    const profile = req.profiles || {};
                    const pts = Number(profile.purga_points ?? 0);
                    const posts = Number(profile.posts_count ?? 0);
                    const cert = req.certification || getCertification(req.certification_slug);
                    const minPts = cert?.minPoints || 0;
                    const minPosts = cert?.minPosts || 0;
                    const eligible = pts >= minPts && posts >= minPosts;
                    return (
                      <div
                        key={req.id}
                        className="rounded-2xl border border-border/70 bg-background/40 p-4 flex flex-col lg:flex-row lg:items-center gap-4"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <img
                            src={
                              profile.avatar_url ||
                              `https://ui-avatars.com/api/?name=${profile.username || 'U'}&background=random`
                            }
                            alt=""
                            className="w-11 h-11 rounded-xl object-cover border border-border shrink-0"
                          />
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-foreground truncate">
                                {profile.full_name || profile.username || 'User'}
                              </p>
                              <span className="text-xs text-muted">@{profile.username}</span>
                              {req.certification_slug === 'official' ? (
                                <CertificationBadges logoCertified size="sm" />
                              ) : (
                                <CertificationBadges
                                  certificationSlug={req.certification_slug}
                                  size="sm"
                                />
                              )}
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                  req.status === 'paid_pending' || req.status === 'payment_pending'
                                    ? 'border-accent/40 text-accent bg-accent/10'
                                    : 'border-border text-muted'
                                }`}
                              >
                                {req.status === 'payment_pending'
                                  ? 'Money pending'
                                  : req.status === 'paid_pending'
                                    ? 'Paid pending'
                                    : 'Review'}
                              </span>
                              {eligible ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                  Eligible
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                  Below threshold
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted">
                              Wants <span className="text-foreground font-semibold">{cert?.title || req.certification_slug}</span>
                              {' · '}
                              <span className="tabular-nums">{pts.toLocaleString()} pts</span>
                              {' · '}
                              <span className="tabular-nums">{posts} posts</span>
                              {req.payment_method && req.payment_method !== 'review' ? (
                                <>
                                  {' · '}
                                  <span className="text-accent font-semibold capitalize">
                                    {req.payment_method.replace('_', ' ')}
                                  </span>
                                </>
                              ) : null}
                              {req.paid && Number(req.amount_paid) > 0 ? (
                                <>
                                  {' · '}
                                  <span className="text-accent font-semibold">
                                    paid {formatCertPrice(req.amount_paid || 0)}
                                  </span>
                                </>
                              ) : null}
                              {Number(req.amount_cdf) > 0 ? (
                                <>
                                  {' · '}
                                  <span className="text-accent font-semibold">
                                    {formatCdf(req.amount_cdf)}
                                  </span>
                                </>
                              ) : null}
                            </p>
                            {(req.payment_phone || req.card_last4 || req.payment_reference) && (
                              <p className="text-[11px] text-foreground/80">
                                {req.payment_network ? `${req.payment_network} · ` : ''}
                                {req.payment_phone || ''}
                                {req.card_brand ? `${req.card_brand} •••• ${req.card_last4}` : ''}
                                {req.cardholder_name ? ` · ${req.cardholder_name}` : ''}
                                {req.payment_reference ? ` · ref ${req.payment_reference}` : ''}
                              </p>
                            )}
                            {req.message && (
                              <p className="text-xs text-foreground/80 italic">“{req.message}”</p>
                            )}
                            <p className="text-[10px] text-muted">
                              Suggest ≥{minPts.toLocaleString()} pts · {minPosts}+ posts ·{' '}
                              {format(new Date(req.created_at), 'dd MMM yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={reviewingCertId === req.id}
                            onClick={() => handleReviewCertRequest(req.id, 'approve')}
                            className="px-3 py-2 rounded-xl bg-emerald-500 text-black text-xs font-bold disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={reviewingCertId === req.id}
                            onClick={() => handleReviewCertRequest(req.id, 'reject')}
                            className="px-3 py-2 rounded-xl border border-red-500/40 text-red-400 text-xs font-bold disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-1">Configure prices</h2>
                  <p className="text-sm text-muted">
                    Set points + money (CDF / USD). Public Profile → Verified uses these prices for
                    points pay and Visa / Mobile Money RDC checkout.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => saveCertPricing()}
                  disabled={pricingSaving || certPricing.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-black text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {pricingSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
                  Save prices
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {(certPricing.length ? certPricing : CERTIFICATION_TYPES).map((cert: any) => (
                  <div
                    key={cert.slug}
                    className="rounded-2xl border border-border/70 bg-background/50 p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-foreground">{cert.title}</p>
                        <p className="text-[11px] text-muted mt-0.5 leading-snug">{cert.description}</p>
                      </div>
                      {cert.kind === 'logo' || cert.slug === 'official' ? (
                        <CertificationBadges logoCertified size="md" />
                      ) : (
                        <CertificationBadges certificationSlug={cert.slug} size="md" />
                      )}
                    </div>
                    {cert.slug === 'official' || cert.purchasable === false ? (
                      <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-3 text-xs text-muted leading-relaxed">
                        <span className="font-semibold text-foreground">Loyalty / merit only.</span>{' '}
                        No price — grant from Manage User or approve a review request when the
                        citizen has earned it.
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <label className="text-[10px] text-muted uppercase tracking-wider space-y-1">
                            <span>Points</span>
                            <input
                              type="number"
                              min={0}
                              value={cert.price_points ?? cert.price ?? 0}
                              onChange={(e) =>
                                setCertPricing((prev) =>
                                  (prev.length
                                    ? prev
                                    : CERTIFICATION_TYPES.map((t) => ({
                                        ...t,
                                        price_points: t.price,
                                        price_cdf: 0,
                                        price_usd: 0,
                                      }))
                                  ).map((row) =>
                                    row.slug === cert.slug
                                      ? { ...row, price_points: Number(e.target.value) }
                                      : row
                                  )
                                )
                              }
                              className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-bold tabular-nums outline-none focus:ring-2 focus:ring-accent/30"
                            />
                          </label>
                          <label className="text-[10px] text-muted uppercase tracking-wider space-y-1">
                            <span>CDF</span>
                            <input
                              type="number"
                              min={0}
                              value={cert.price_cdf ?? 0}
                              onChange={(e) =>
                                setCertPricing((prev) =>
                                  prev.map((row) =>
                                    row.slug === cert.slug
                                      ? { ...row, price_cdf: Number(e.target.value) }
                                      : row
                                  )
                                )
                              }
                              className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-bold tabular-nums outline-none focus:ring-2 focus:ring-accent/30"
                            />
                          </label>
                          <label className="text-[10px] text-muted uppercase tracking-wider space-y-1">
                            <span>USD</span>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={cert.price_usd ?? 0}
                              onChange={(e) =>
                                setCertPricing((prev) =>
                                  prev.map((row) =>
                                    row.slug === cert.slug
                                      ? { ...row, price_usd: Number(e.target.value) }
                                      : row
                                  )
                                )
                              }
                              className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-bold tabular-nums outline-none focus:ring-2 focus:ring-accent/30"
                            />
                          </label>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-border/50">
                          <span>
                            Preview {formatCertPrice(Number(cert.price_points ?? cert.price ?? 0))} ·{' '}
                            {formatCdf(Number(cert.price_cdf ?? 0))} ·{' '}
                            {formatUsd(Number(cert.price_usd ?? 0))}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-accent/30 bg-accent/5 p-4 text-sm text-muted">
              Users buy from <span className="text-foreground font-semibold">Profile → Verified</span>
              {' '}with points, Visa/Mastercard, or Mobile Money RDC (Airtel, M-Pesa, Orange, Africell).
              Run{' '}
              <code className="text-[11px] text-accent">20260725_user_certifications.sql</code>,{' '}
              <code className="text-[11px] text-accent">20260725_certification_requests.sql</code> and{' '}
              <code className="text-[11px] text-accent">20260725_certification_pricing_payments.sql</code>.
            </div>
          </div>
        )}        {activeTab === 'users' && (
          <div className="space-y-5">
            {/* Filters & Actions Bar */}

        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-5">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div className="flex-1 relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <input
                type="text"
                placeholder="Search name, email, or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-background-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-accent/30 outline-none transition-all placeholder:text-muted text-foreground text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 p-1 bg-background-secondary rounded-xl border border-border">
                {['all', 'active', 'ghosted', 'blocked'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      statusFilter === status
                        ? 'bg-accent text-black'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-muted tracking-widest whitespace-nowrap">Filter Role</span>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="bg-background-secondary border border-border rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-accent/30 transition-all text-foreground"
              >
                <option value="all">All Roles</option>
                <option value="user">Citizens</option>
                <option value="super_admin">Admins</option>
                <option value="moderator">Moderators</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-muted tracking-widest whitespace-nowrap">Registered Between</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-background-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-accent/30 transition-all text-foreground"
                />
                <span className="text-muted text-xs">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-background-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-accent/30 transition-all text-foreground"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 border-l border-border pl-4">
              <span className="text-xs font-black uppercase text-muted tracking-widest whitespace-nowrap">Activity Level</span>
              <select
                value={minPosts}
                onChange={e => setMinPosts(e.target.value)}
                className="bg-background-secondary border border-border rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-accent/30 transition-all text-foreground"
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
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse table-fixed">
              <colgroup>
                <col className="w-12" />
                <col className="w-[22%]" />
                <col className="w-[22%]" />
                <col className="w-[22%]" />
                <col className="w-[12%]" />
                <col className="w-[160px]" />
              </colgroup>
              <thead>
                <tr className="bg-background-secondary/80 text-muted uppercase text-xs font-black tracking-[0.15em] border-b border-border">
                  <th className="px-3 py-3.5 text-left align-middle">
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={selectedUserIds.length === users.length && users.length > 0}
                      className="w-4 h-4 rounded border-border bg-background-secondary text-accent focus:ring-accent"
                    />
                  </th>
                  <th className="px-4 py-3.5 text-left align-middle cursor-pointer hover:bg-accent/10 transition-colors" onClick={() => toggleSort('username')}>
                    <div className="flex items-center gap-2">
                       Citizen
                       {sortBy === 'username' ? (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="opacity-30"/>}
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left align-middle cursor-pointer hover:bg-accent/10 transition-colors" onClick={() => toggleSort('created_at')}>
                    <div className="flex items-center gap-2">
                      Contact & Dates
                      {sortBy === 'created_at' ? (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="opacity-30"/>}
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-center align-middle cursor-pointer hover:bg-accent/10 transition-colors" onClick={() => toggleSort('posts_count')}>
                    <div className="flex items-center justify-center gap-2">
                      Activities
                      {sortBy === 'posts_count' ? (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="opacity-30"/>}
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-center align-middle">Status</th>
                  <th className="px-4 py-3.5 text-right align-middle whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <RefreshCcw className="animate-spin text-accent" size={32} />
                        <span className="text-muted font-bold tracking-widest text-xs uppercase">Synchronizing Citizens...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-muted">
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
                      <td className="px-3 py-3.5 align-middle">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={() => toggleSelectUser(u.id)}
                          className="w-4 h-4 rounded border-border bg-background-secondary text-accent focus:ring-accent"
                        />
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-3 min-w-0">
                          <ProfileLink username={u.username} className="relative rounded-xl shrink-0">
                            <img
                              src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}&background=random`}
                              alt={u.username}
                              className="w-10 h-10 rounded-xl object-cover border-2 border-border group-hover:border-accent/50 transition-colors"
                            />
                            {u.is_ghost && <div className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-lg text-white"><Ghost size={10} /></div>}
                          </ProfileLink>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <ProfileLink username={u.username} className="font-black text-sm text-foreground leading-tight hover:text-accent transition-colors truncate">
                                {u.full_name || u.username}
                              </ProfileLink>
                              <CertificationBadges
                                certificationSlug={u.certification_slug}
                                logoCertified={u.logo_certified}
                                size="sm"
                              />
                            </div>
                            <ProfileLink username={u.username} className="text-xs text-muted hover:text-accent block truncate">
                              @{u.username}
                            </ProfileLink>
                            <div className="mt-1 inline-flex px-1.5 py-0.5 bg-background-secondary rounded-lg text-[9px] uppercase font-bold text-accent tracking-tighter">
                              {u.role}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle text-xs">
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <div className="flex items-center gap-2 text-foreground font-medium min-w-0">
                            <Mail size={12} className="text-muted shrink-0" />
                            <span className="truncate" title={u.email || undefined}>
                              {u.email || <span className="text-muted italic">No email</span>}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-light text-xs uppercase font-bold tracking-wider">
                            <Calendar size={10} className="shrink-0" />
                            <span className="truncate">Joined {format(new Date(u.created_at), 'dd MMM yyyy')}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center justify-center gap-4">
                          <div className="text-center min-w-[2.5rem]">
                            <div className="text-sm font-black text-foreground tabular-nums leading-none">
                              {Number(u.purga_points ?? u.credits ?? 0).toLocaleString()}
                            </div>
                            <div className="text-[9px] uppercase font-bold text-muted-light mt-1">Pts</div>
                          </div>
                          <div className="w-px h-7 bg-border/50 shrink-0" />
                          <div className="text-center min-w-[2rem]">
                            <div className="text-sm font-black text-foreground tabular-nums leading-none">{u.posts_count}</div>
                            <div className="text-[9px] uppercase font-bold text-muted-light mt-1">Posts</div>
                          </div>
                          <div className="w-px h-7 bg-border/50 shrink-0" />
                          <div className="text-center min-w-[2rem]">
                            <div className="text-sm font-black text-foreground tabular-nums leading-none">{u.purges_count}</div>
                            <div className="text-[9px] uppercase font-bold text-muted-light mt-1">Purges</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            u.is_ghost
                              ? 'bg-red-500/10 text-red-500 border-red-500/20'
                              : 'bg-green-500/10 text-green-500 border-green-500/20'
                          }`}>
                            {u.is_ghost ? 'GHOSTED' : 'ACTIVE'}
                          </span>
                          {u.is_blocked && (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25">
                              Blocked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="p-2 bg-card border border-border rounded-lg text-muted hover:text-accent hover:border-accent/40 transition-colors"
                            title="Edit User"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleWarnUser(u)}
                            className="p-2 bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-500 hover:text-black transition-colors"
                            title="Warn User"
                          >
                            <AlertTriangle size={15} />
                          </button>
                          <button
                            onClick={() => handleBlockToggle(u)}
                            className={`p-2 border rounded-lg transition-colors ${
                              u.is_blocked
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 hover:bg-emerald-500 hover:text-black'
                                : 'bg-orange-500/10 text-orange-600 border-orange-500/25 hover:bg-orange-500 hover:text-black'
                            }`}
                            title={u.is_blocked ? 'Unblock User' : 'Block User'}
                          >
                            {u.is_blocked ? <Unlock size={15} /> : <Ban size={15} />}
                          </button>
                          <button
                            onClick={() => handleGhostToggle(u)}
                            className={`p-2 border rounded-lg transition-colors ${
                              u.is_ghost
                                ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500 hover:text-white'
                                : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'
                            }`}
                            title={u.is_ghost ? "Unghost User" : "Ghost User"}
                          >
                            {u.is_ghost ? <UserCheck size={15} /> : <UserX size={15} />}
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
          <div className="p-5 border-t border-border flex items-center justify-between bg-background-secondary/50">
            <p className="text-xs font-medium text-muted">
              Showing <span className="text-foreground">{users.length}</span> of {stats?.totalUsers || 0} Citizens
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-card border border-border rounded-xl text-muted hover:text-accent disabled:opacity-30 disabled:hover:text-muted transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center px-3 font-bold text-xs">
                Page <span className="text-accent mx-1.5">{page}</span> of {totalPages}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-card border border-border rounded-xl text-muted hover:text-accent disabled:opacity-30 disabled:hover:text-muted transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
        )}

        {activeTab === 'logs' && (
          /* Logs Table Container */
          <div className="space-y-8">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-background-secondary/80 text-muted uppercase text-xs font-black tracking-[0.15em] border-b border-border">
                    <th className="px-6 py-4 text-left">Supervisor</th>
                    <th className="px-6 py-4 text-left">Action</th>
                    <th className="px-6 py-4 text-left">Target ID</th>
                    <th className="px-6 py-4 text-left">Metadata</th>
                    <th className="px-6 py-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <RefreshCcw className="animate-spin text-accent" size={32} />
                          <span className="text-muted font-bold tracking-widest text-xs uppercase">Retrieving Audit Logs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-muted">
                        No logs recorded yet
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-accent/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <ProfileLink username={log.profiles?.username} className="rounded-xl shrink-0">
                              <img
                                src={log.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${log.profiles?.username}&background=random`}
                                className="w-10 h-10 rounded-xl"
                              />
                            </ProfileLink>
                            <div>
                              <ProfileLink username={log.profiles?.username} className="font-bold text-foreground hover:text-accent block">
                                @{log.profiles?.username || 'System'}
                              </ProfileLink>
                              <div className="text-[10px] text-muted">{log.ip_address}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            log.action.includes('DELETE') ? 'bg-red-500/10 text-red-500' :
                            log.action.includes('UPDATE') ? 'bg-blue-500/10 text-blue-500' :
                            'bg-accent/10 text-accent'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-muted-light truncate max-w-[120px]">
                          {log.target_id}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted leading-tight">
                          {JSON.stringify(log.details)}
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-foreground font-medium">
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

            <div className="p-5 border-t border-border flex items-center justify-between bg-accent/5">
              <p className="text-xs font-medium text-muted">
                Audit Log History
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLogPage(p => Math.max(1, p - 1))}
                  disabled={logPage === 1}
                  className="p-2 bg-card border border-border rounded-xl text-muted hover:text-accent disabled:opacity-30 disabled:hover:text-muted transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center px-3 font-bold text-xs">
                  Page <span className="text-accent mx-1.5">{logPage}</span> of {totalLogPages}
                </div>
                <button
                  onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                  disabled={logPage === totalLogPages}
                  className="p-2 bg-card border border-border rounded-xl text-muted hover:text-accent disabled:opacity-30 disabled:hover:text-muted transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'system' && (
          /* System Health Container */
          <div className="space-y-8">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-background-secondary/80 text-muted uppercase text-xs font-black tracking-[0.15em] border-b border-border">
                    <th className="px-6 py-4 text-left">Level</th>
                    <th className="px-6 py-4 text-left">Error Message</th>
                    <th className="px-6 py-4 text-left">Endpoint</th>
                    <th className="px-6 py-4 text-left">Stack</th>
                    <th className="px-6 py-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <RefreshCcw className="animate-spin text-accent" size={32} />
                          <span className="text-muted font-bold tracking-widest text-xs uppercase">Checking System Health...</span>
                        </div>
                      </td>
                    </tr>
                  ) : systemLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-muted">
                        No system errors reported. Dashboard Optimal.
                      </td>
                    </tr>
                  ) : (
                    systemLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-accent/5 transition-colors group">
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            log.level === 'CRITICAL' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' :
                            log.level === 'ERROR' ? 'bg-red-500/10 text-red-500' :
                            'bg-yellow-500/10 text-yellow-500'
                          }`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-md">
                          <div className="font-bold text-foreground truncate" title={log.message}>
                            {log.message}
                          </div>
                          <div className="text-[10px] text-muted flex items-center gap-2 mt-1">
                            <span className="font-mono">{log.ip_address}</span>
                            {log.profiles?.username && (
                              <span>
                                •{' '}
                                <ProfileLink username={log.profiles.username} className="hover:text-accent">
                                  @{log.profiles.username}
                                </ProfileLink>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <span className="px-2 py-0.5 bg-accent/10 rounded text-[10px] font-black text-accent">{log.method}</span>
                             <span className="text-xs font-mono text-muted truncate max-w-[150px]">{log.path}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <button
                            onClick={() => alert(log.stack)}
                            className="text-[10px] font-bold text-accent hover:underline uppercase tracking-widest"
                           >
                            View Stack
                           </button>
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-foreground font-medium">
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

            <div className="p-5 border-t border-border flex items-center justify-between bg-accent/5">
              <p className="text-xs font-medium text-muted">
                System Incident Logs
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSystemPage(p => Math.max(1, p - 1))}
                  disabled={systemPage === 1}
                  className="p-2 bg-card border border-border rounded-xl text-muted hover:text-accent disabled:opacity-30 disabled:hover:text-muted transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center px-3 font-bold text-xs">
                  Page <span className="text-accent mx-1.5">{systemPage}</span> of {totalSystemPages}
                </div>
                <button
                  onClick={() => setSystemPage(p => Math.min(totalSystemPages, p + 1))}
                  disabled={systemPage === totalSystemPages}
                  className="p-2 bg-card border border-border rounded-xl text-muted hover:text-accent disabled:opacity-30 disabled:hover:text-muted transition-all"
                >
                  <ChevronRight size={16} />
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
          className="p-4 bg-accent/5 border border-accent/15 rounded-2xl flex items-start gap-4"
        >
          <div className="p-1.5 bg-accent/10 rounded-lg text-accent mt-1">
            <AlertCircle size={16} />
          </div>
          <div>
            <h4 className="font-bold text-foreground text-xs">Audit Logging Active</h4>
            <p className="text-xs text-muted-light leading-relaxed max-w-2xl">
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
              <div className="bg-card border border-border rounded-2xl p-3 flex items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-4 px-4 border-r border-border mr-2">
                  <div className="bg-accent text-black w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs">
                    {selectedUserIds.length}
                  </div>
                  <div>
                    <div className="text-foreground font-bold text-xs">Selected</div>
                    <div className="text-muted text-[10px] uppercase font-bold">Citizens</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => handleBulkGhost(true)}
                    className="flex-1 p-2 bg-red-500/10 text-red-500 rounded-lg font-bold text-xs uppercase hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Ghost size={14} /> Bulk Ghost
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Block ${selectedUserIds.length} users?`)) return;
                      try {
                        await api.post('/admin/users/bulk-update', {
                          ids: selectedUserIds,
                          updates: { is_blocked: true },
                        });
                        toast.success('Users blocked');
                        fetchData();
                      } catch {
                        toast.error('Bulk block failed');
                      }
                    }}
                    className="flex-1 p-2 bg-orange-500/10 text-orange-600 rounded-lg font-bold text-xs uppercase hover:bg-orange-500 hover:text-black transition-all flex items-center justify-center gap-2"
                  >
                    <Ban size={14} /> Bulk Block
                  </button>
                  <button
                    onClick={handleBulkResetPassword}
                    className="flex-1 p-2 bg-blue-500/10 text-blue-500 rounded-lg font-bold text-xs uppercase hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Lock size={14} /> Bulk Pass
                  </button>
                  <button
                    onClick={() => exportToCSV(users.filter(u => selectedUserIds.includes(u.id)), 'selected_citizens')}
                    className="p-2 bg-accent/10 text-accent rounded-lg font-bold text-xs uppercase hover:bg-accent hover:text-black transition-all flex items-center justify-center gap-2"
                    title="Export Selected to CSV"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() => handleBulkGhost(false)}
                    className="flex-1 p-2 bg-green-500/10 text-green-500 rounded-lg font-bold text-xs uppercase hover:bg-green-500 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <UserCheck size={14} /> Bulk Active
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="p-2 bg-card border border-border text-red-500 rounded-lg font-bold text-xs uppercase hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                    title="Bulk Permanent Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <button
                  onClick={() => setSelectedUserIds([])}
                  className="p-2 text-muted hover:text-foreground transition-colors mr-2"
                >
                  <X size={16} />
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
    </div>
  );
};

export default SuperAdmin;