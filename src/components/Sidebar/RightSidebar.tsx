import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { User, Users, Bell, Gamepad2, BarChart3, HelpCircle, Settings, ShieldCheck, LogOut, ChevronDown, Shield, AlertTriangle, Skull, Ghost, Flame } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import QuickActions from './QuickActions';
import GamingDashboard from './GamingDashboard';
import PurgeDashboard from './PurgeDashboard';
import { useSurvival } from '../../context/SurvivalContext';
import { SurvivalNotifications, ThreatMeter } from '../Survival';
import { SURVIVAL_STATE_COLORS, SURVIVAL_STATE_LABELS, SurvivalState } from '../../types/survival';

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
    followers: 0
  });
  const [loading, setLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) return;
      try {
        const response = await api.get(`/users/${user.id}/stats`);
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserStats();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { survivalState, loading: survivalLoading } = useSurvival();
  const state = (survivalState?.current_survival_state || 'SAFE') as SurvivalState;

  const STATE_ICONS: Record<string, React.ReactNode> = {
    SAFE: <Shield size={14} />,
    WARNING: <AlertTriangle size={14} />,
    HUNTED: <Flame size={14} />,
    COLLAPSING: <Skull size={14} />,
    GHOSTED: <Ghost size={14} />,
  };

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'superadmin';

  const handleLogout = async () => {
    const { supabase } = await import('../../lib/supabaseClient');
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.success('Logged out');
      navigate('/login');
    } catch {
      toast.error('Failed to log out');
    }
  };

  const moreOptions = [
    { icon: <Bell size={16} />, label: 'Notifications', to: '/notifications' },
    { icon: <Gamepad2 size={16} />, label: 'Games', to: '/puurga-games' },
    { icon: <BarChart3 size={16} />, label: 'Dashboard', to: '/puurga-dashboard' },
    { icon: <HelpCircle size={16} />, label: 'Help', to: '/help' },
    { icon: <Settings size={16} />, label: 'Settings', to: '/settings' },
  ];

  if (isSuperAdmin) {
    moreOptions.push({ icon: <ShieldCheck size={16} />, label: 'Super Admin', to: '/super-admin' });
  }


  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col overflow-hidden"
    >
      {/* Quick Actions Section */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-sm font-bold text-foreground">{t('rightSidebar.quickActions')}</h2>
          <QuickActions />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Link to="/home" className="px-3 py-2.5 rounded-lg bg-card hover:bg-highlight-light text-foreground shadow-theme-sm hover:shadow-theme-md transition-all text-xs font-medium text-center truncate border border-border hover:border-highlight">
            {t('rightSidebar.createPost')}
          </Link>
          <Link to="/groups" className="px-3 py-2.5 rounded-lg bg-card hover:bg-highlight-light text-foreground transition-all text-xs font-medium text-center truncate border border-border hover:border-highlight shadow-theme-sm hover:shadow-theme-md">
            {t('rightSidebar.exploreGroups')}
          </Link>
          <Link to="/notifications" className="px-3 py-2.5 rounded-lg bg-card hover:bg-highlight-light text-foreground transition-all text-xs font-medium text-center truncate border border-border hover:border-highlight shadow-theme-sm hover:shadow-theme-md">
            {t('rightSidebar.notifications')}
          </Link>
          <Link to="/settings" className="px-3 py-2.5 rounded-lg bg-card hover:bg-highlight-light text-foreground transition-all text-xs font-medium text-center truncate border border-border hover:border-highlight shadow-theme-sm hover:shadow-theme-md">
            {t('rightSidebar.settings')}
          </Link>
        </div>
      </div>

      {/* User Profile Summary */}
      <div className="mb-3">
        <h2 className="text-sm font-bold text-foreground mb-3 px-1">{t('rightSidebar.myProfile')}</h2>
        <Link
          to="/profile"
          className="flex items-center space-x-3 hover:bg-highlight-light p-2 rounded-lg transition-colors group shadow-theme-sm hover:shadow-theme-md"
        >
          <img
            src={user.avatar || '/default-avatar.png'}
            alt={user.name}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-highlight"
            onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate group-hover:text-accent transition-colors">{user.name}</p>
            <p className="text-muted text-xs truncate">@{user.username}</p>
          </div>
        </Link>

        {/* Stats Section */}
        {loading ? (
          <div className="flex justify-between text-sm text-muted animate-pulse mt-4">
            <div className="h-4 w-16 bg-card-hover rounded"></div>
            <div className="h-4 w-16 bg-card-hover rounded"></div>
            <div className="h-4 w-16 bg-card-hover rounded"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-xs mt-3">
            <div className="text-center p-2 bg-card rounded-lg shadow-theme-sm border border-border hover:shadow-theme-md transition-shadow">
              <p className="text-muted text-[10px] uppercase tracking-wide">{t('rightSidebar.stats.posts')}</p>
              <p className="text-foreground font-bold">{stats.posts}</p>
            </div>
            <div className="text-center p-2 bg-card rounded-lg shadow-theme-sm border border-border hover:shadow-theme-md transition-shadow">
              <p className="text-muted text-[10px] uppercase tracking-wide">{t('rightSidebar.stats.following')}</p>
              <p className="text-foreground font-bold">{stats.following}</p>
            </div>
            <div className="text-center p-2 bg-card rounded-lg shadow-theme-sm border border-border hover:shadow-theme-md transition-shadow">
              <p className="text-muted text-[10px] uppercase tracking-wide">{t('rightSidebar.stats.followers')}</p>
              <p className="text-foreground font-bold">{stats.followers}</p>
            </div>
          </div>
        )}

        <div className="mt-3 space-y-1">
          <Link
            to="/profile"
            className="flex items-center gap-2 px-3 py-2 text-foreground/80 hover:text-foreground hover:bg-highlight-light rounded-lg transition-colors text-sm shadow-theme-sm hover:shadow-theme-md border border-transparent hover:border-highlight"
          >
            <User size={16} />
            <span>{t('rightSidebar.viewFullProfile')}</span>
          </Link>
          <Link
            to="/connections"
            className="flex items-center gap-2 px-3 py-2 text-foreground/80 hover:text-foreground hover:bg-highlight-light rounded-lg transition-colors text-sm shadow-theme-sm hover:shadow-theme-md border border-transparent hover:border-highlight"
          >
            <Users size={16} />
            <span>{t('rightSidebar.myConnections')}</span>
          </Link>
        </div>
      </div>

      {/* Survival Status Section */}
      {!survivalLoading && survivalState && (
        <div className="mb-3">
          <h2 className="text-sm font-bold text-foreground mb-2 px-1">Survival Status</h2>
          <div className="bg-card rounded-lg border border-border/60 p-2.5 space-y-2">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold ${SURVIVAL_STATE_COLORS[state]}`}>
              {STATE_ICONS[state]}
              <span>{SURVIVAL_STATE_LABELS[state]}</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted/70">Reputation</span>
                <span className={`font-semibold ${survivalState.reputation_score > 60 ? 'text-accent' : 'text-red-400'}`}>
                  {survivalState.reputation_score}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted/70">Threat</span>
                <span className="font-semibold text-muted">{survivalState.threat_level}%</span>
              </div>
              <ThreatMeter threatLevel={survivalState.threat_level} />
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted/70">Purges</span>
                <span className="font-semibold text-muted tabular-nums">{survivalState.purge_count}</span>
              </div>
              {survivalState.social_rank !== 'UNKNOWN' && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted/70">Rank</span>
                  <span className="font-semibold text-accent">{survivalState.social_rank}</span>
                </div>
              )}
              {survivalState.inactivity_level > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-amber-400">
                  <AlertTriangle size={10} />
                  <span>Inactive: Level {survivalState.inactivity_level}</span>
                </div>
              )}
            </div>
          </div>
          <SurvivalNotifications />
        </div>
      )}

      {/* Gaming Dashboard */}
      <GamingDashboard />

      {/* Purge Dashboard */}
      <PurgeDashboard />

      {/* More Options */}
      <div className="mb-3" ref={moreRef}>
        <h2 className="text-sm font-bold text-foreground mb-3 px-1">More</h2>
        <button
          onClick={() => setShowMore(!showMore)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-card hover:bg-highlight-light text-foreground shadow-theme-sm hover:shadow-theme-md transition-all text-sm font-medium border border-border hover:border-highlight"
        >
          <span>More options</span>
          <ChevronDown size={15} className={`transition-transform duration-200 ${showMore ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showMore && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.15 }}
                className="mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
              >
                <div className="py-1">
                  {moreOptions.map((option) => (
                    <Link
                      key={option.to}
                      to={option.to}
                      onClick={() => setShowMore(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-card-hover transition-colors"
                    >
                      <span className="text-muted">{option.icon}</span>
                      <span>{option.label}</span>
                    </Link>
                  ))}
                  <div className="border-t border-border my-1 mx-3" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              </motion.div>
              <div className="fixed inset-0 z-0" onClick={() => setShowMore(false)} />
            </>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
};

export default RightSidebar;