import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import {
  User,
  Users,
  Bell,
  Gamepad2,
  BarChart3,
  HelpCircle,
  Settings,
  ShieldCheck,
  ChevronDown,
  PenSquare,
  UsersRound,
  X,
} from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import QuickActions from './QuickActions';
import GamingDashboard from './GamingDashboard';
import PurgeDashboard from './PurgeDashboard';
import CreatePost from '../Post/CreatePost';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';

interface UserStats {
  posts: number;
  following: number;
  followers: number;
}

const RightSidebar: React.FC = () => {
  const { user } = useUser();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const moreRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<UserStats>({
    posts: 0,
    following: 0,
    followers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user?.id) return;
      try {
        const response = await api.get(`/users/${user.id}/stats`);
        setStats(response.data);
      } catch {
        // Soft-fail — keep zeros, never spam console / break Home
      } finally {
        setLoading(false);
      }
    };
    fetchUserStats();
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'superadmin';

  const handleLogout = async () => {
    const { supabase } = await import('../../lib/supabaseClient');
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.success('Logged out');
      navigate('/onboarding/video');
    } catch {
      toast.error('Failed to log out');
    }
  };

  const moreOptions = [
    { icon: <Bell size={16} />, label: t('rightSidebar.notifications', 'Notifications'), to: '/notifications' },
    { icon: <Gamepad2 size={16} />, label: t('navigation.games', 'Games'), to: '/puurga-games' },
    { icon: <BarChart3 size={16} />, label: t('navigation.dashboard', 'Dashboard'), to: '/puurga-dashboard' },
    { icon: <HelpCircle size={16} />, label: t('navigation.help', 'Help'), to: '/help' },
    { icon: <Settings size={16} />, label: t('rightSidebar.settings', 'Settings'), to: '/settings' },
  ];

  if (isSuperAdmin) {
    moreOptions.push({
      icon: <ShieldCheck size={16} />,
      label: t('navigation.superAdmin', 'Super Admin'),
      to: '/super-admin',
    });
  }

  if (!user) return null;

  interface QuickLink {
    to?: string;
    icon: React.ElementType;
    label: string;
    onClick?: () => void;
  }

  const quickLinks: QuickLink[] = [
    {
      icon: PenSquare,
      label: t('rightSidebar.createPost', 'Create Post'),
      onClick: () => setCreatePostOpen(true),
    },
    {
      to: '/groups',
      icon: UsersRound,
      label: t('rightSidebar.exploreGroups', 'Explore Groups'),
    },
    {
      to: '/notifications',
      icon: Bell,
      label: t('rightSidebar.notifications', 'Notifications'),
    },
    {
      to: '/settings',
      icon: Settings,
      label: t('rightSidebar.settings', 'Settings'),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="right-sidebar flex flex-col overflow-x-hidden min-w-0 w-full"
    >
      <div className="mb-3 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
          <h2 className="text-sm font-bold text-foreground truncate min-w-0">
            {t('rightSidebar.quickActions', 'Quick Actions')}
          </h2>
          <div className="shrink-0">
            <QuickActions />
          </div>
        </div>
        <div className="rs-quick-grid grid grid-cols-2 gap-1.5 min-w-0">
          {quickLinks.map(({ to, onClick, icon: Icon, label }) => (
            to ? (
              <Link
                key={label}
                to={to}
                title={label}
                className="rs-quick-btn min-w-0 flex flex-col items-center justify-center gap-1 px-1.5 py-2.5 rounded-xl bg-card hover:bg-highlight-light text-foreground transition-colors border border-border hover:border-highlight"
              >
                <Icon size={15} className="text-muted shrink-0" />
                <span className="text-[10px] font-medium text-center leading-tight line-clamp-2 w-full break-words">
                  {label}
                </span>
              </Link>
            ) : (
              <button
                key={label}
                onClick={onClick}
                title={label}
                className="rs-quick-btn min-w-0 flex flex-col items-center justify-center gap-1 px-1.5 py-2.5 rounded-xl bg-card hover:bg-highlight-light text-foreground transition-colors border border-border hover:border-highlight"
              >
                <Icon size={15} className="text-muted shrink-0" />
                <span className="text-[10px] font-medium text-center leading-tight line-clamp-2 w-full break-words">
                  {label}
                </span>
              </button>
            )
          ))}
        </div>
      </div>

      <div className="mb-3 min-w-0">
        <h2 className="text-sm font-bold text-foreground mb-2 truncate">
          {t('rightSidebar.myProfile', 'My Profile')}
        </h2>
        <Link
          to="/profile"
          className="flex items-center gap-2.5 hover:bg-highlight-light p-2 rounded-xl transition-colors group border border-transparent hover:border-border min-w-0"
        >
          <img
            src={user.avatar || DEFAULT_IMAGES.avatar}
            alt={user.name}
            className="w-9 h-9 rounded-full object-cover shrink-0 border border-border"
            onError={(e) => {
              if (e.currentTarget.src !== DEFAULT_IMAGES.avatar) {
                e.currentTarget.src = DEFAULT_IMAGES.avatar;
              }
            }}
          />
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="font-semibold text-sm text-foreground truncate group-hover:text-accent transition-colors">
              {user.name}
            </p>
            <p className="text-muted text-xs truncate">@{user.username}</p>
          </div>
        </Link>

        {loading ? (
          <div className="flex justify-between text-sm text-muted animate-pulse mt-3 gap-1">
            <div className="h-10 flex-1 bg-card-hover rounded-xl" />
            <div className="h-10 flex-1 bg-card-hover rounded-xl" />
            <div className="h-10 flex-1 bg-card-hover rounded-xl" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 mt-2.5 min-w-0">
            {[
              { label: t('rightSidebar.stats.posts', 'Posts'), value: stats.posts },
              { label: t('rightSidebar.stats.following', 'Following'), value: stats.following },
              { label: t('rightSidebar.stats.followers', 'Followers'), value: stats.followers },
            ].map((s) => (
              <div
                key={s.label}
                className="min-w-0 text-center px-1 py-2 bg-card rounded-xl border border-border"
              >
                <p className="text-muted text-[9px] uppercase tracking-wide truncate leading-none mb-1">
                  {s.label}
                </p>
                <p className="text-foreground font-bold text-sm tabular-nums leading-none">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 space-y-0.5 min-w-0">
          <Link
            to="/profile"
            className="flex items-center gap-2 px-2.5 py-2 text-foreground/80 hover:text-foreground hover:bg-highlight-light rounded-xl transition-colors text-xs border border-transparent hover:border-border min-w-0"
          >
            <User size={14} className="shrink-0" />
            <span className="truncate">{t('rightSidebar.viewFullProfile', 'View Full Profile')}</span>
          </Link>
          <Link
            to="/connections"
            className="flex items-center gap-2 px-2.5 py-2 text-foreground/80 hover:text-foreground hover:bg-highlight-light rounded-xl transition-colors text-xs border border-transparent hover:border-border min-w-0"
          >
            <Users size={14} className="shrink-0" />
            <span className="truncate">{t('rightSidebar.myConnections', 'My Connections')}</span>
          </Link>
        </div>
      </div>

      <GamingDashboard />
      <PurgeDashboard />

      <div className="mb-3 min-w-0" ref={moreRef}>
        <h2 className="text-sm font-bold text-foreground mb-2 truncate">More</h2>
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-card hover:bg-highlight-light text-foreground transition-colors text-xs font-medium border border-border hover:border-highlight min-w-0"
        >
          <span className="truncate">More options</span>
          <ChevronDown
            size={14}
            className={`shrink-0 transition-transform duration-200 ${showMore ? 'rotate-180' : ''}`}
          />
        </button>
        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-1.5 space-y-0.5 rounded-xl border border-border bg-card p-1">
                {moreOptions.map((opt) => (
                  <Link
                    key={opt.to}
                    to={opt.to}
                    onClick={() => setShowMore(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-foreground hover:bg-highlight-light transition-colors min-w-0"
                  >
                    <span className="shrink-0 text-muted">{opt.icon}</span>
                    <span className="truncate">{opt.label}</span>
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <span className="truncate">Logout</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Post Modal Portal */}
      {createPostOpen && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCreatePostOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl z-10 max-h-[95dvh] flex flex-col border-t sm:border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-background px-4 py-4 flex items-center justify-between rounded-t-2xl z-20 shrink-0">
              <div className="w-10"></div>
              <h2 className="text-[18px] font-bold text-foreground">Create New Post</h2>
              <button
                onClick={() => setCreatePostOpen(false)}
                className="w-10 h-10 flex items-center justify-center bg-card hover:bg-card-hover text-muted hover:text-foreground rounded-full transition-colors active:scale-90"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-4 pb-6 flex-1 overflow-y-auto scrollbar-hide">
              <CreatePost
                onPostCreated={() => setCreatePostOpen(false)}
                autoExpand={true}
              />
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  );
};

export default RightSidebar;
