import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, TrendingUp, MessageSquare, Bell, Settings, User, Coins, Gamepad2,
  ArrowUpRight, Zap, Loader2, RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCredits } from '../hooks/useCredits';
import { useWebSocket } from '../hooks/useWebSocket';
import api from '../lib/axios';

interface DashboardStats {
  credits: number;
  friends: number;
  followers: number;
  posts: number;
  engagementRate: number;
  engagementRateLabel: string;
  activeConversations: number;
  unreadNotifications: number;
  display: {
    credits: string;
    friends: string;
    engagement: string;
    conversations: string;
    notifications: string;
  };
}

const EMPTY_STATS: DashboardStats = {
  credits: 0,
  friends: 0,
  followers: 0,
  posts: 0,
  engagementRate: 0,
  engagementRateLabel: '0%',
  activeConversations: 0,
  unreadNotifications: 0,
  display: {
    credits: '0',
    friends: '0',
    engagement: '0%',
    conversations: '0',
    notifications: '0',
  },
};

const Dashboard: React.FC = () => {
  const { balance } = useCredits();
  const [statsData, setStatsData] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data } = await api.get<DashboardStats>('/dashboard/stats');
      setStatsData({ ...EMPTY_STATS, ...data, display: { ...EMPTY_STATS.display, ...data.display } });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const onCreditUpdate = useCallback(() => {
    void fetchStats(true);
  }, [fetchStats]);

  const onNotification = useCallback(() => {
    void fetchStats(true);
  }, [fetchStats]);

  useWebSocket({ onCreditUpdate, onNotification });

  const creditsDisplay = balance > 0 ? balance.toLocaleString() : (statsData.display.credits || '0');

  const stats = [
    {
      icon: <Coins className="w-5 h-5" />,
      label: 'Purga Credits',
      value: loading ? '—' : creditsDisplay,
      highlight: true,
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: 'Friends',
      value: loading ? '—' : statsData.display.friends,
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: 'Engagement Rate',
      value: loading ? '—' : statsData.display.engagement,
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      label: 'Active Conversations',
      value: loading ? '—' : statsData.display.conversations,
    },
    {
      icon: <Bell className="w-5 h-5" />,
      label: 'Unread Notifications',
      value: loading ? '—' : statsData.display.notifications,
    },
  ];

  const quickActions = [
    { icon: <User className="w-5 h-5" />, label: 'Edit Profile', path: '/profile', desc: 'Update your info' },
    { icon: <Gamepad2 className="w-5 h-5" />, label: 'Play Games', path: '/puurga-games', desc: 'Earn credits' },
    { icon: <Settings className="w-5 h-5" />, label: 'App Settings', path: '/settings', desc: 'Customize your hub' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full space-y-5 min-h-full pb-8"
    >
      {/* Welcome Hero */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl p-6 sm:p-7 relative overflow-hidden border border-border bg-card"
      >
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-accent/15 text-accent text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-accent/25">
                <Zap className="w-3 h-3" /> LIVE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Welcome to Puurga</h1>
            <p className="text-muted mt-2 text-sm font-medium">Your social hub — real stats, updated live</p>
          </div>
          <button
            type="button"
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-border text-muted hover:text-foreground hover:bg-card-hover transition-colors disabled:opacity-50"
            aria-label="Refresh stats"
          >
            {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>
      </motion.div>

      {/* Credits Hero Card */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl p-6 sm:p-7 relative overflow-hidden border border-accent/20 bg-accent/5"
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-accent/15 border border-accent/25">
              <Coins className="w-7 h-7 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted font-semibold uppercase tracking-widest mb-0.5">Your Purga Credits</p>
              <p className="text-4xl sm:text-5xl font-bold text-foreground tabular-nums">
                {loading ? '—' : creditsDisplay}
              </p>
            </div>
          </div>
          <Link
            to="/puurga-games"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            <Gamepad2 className="w-4 h-4" />
            Earn More
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className={`rounded-xl p-4 sm:p-5 border border-border bg-card transition-colors ${
              stat.highlight ? 'border-accent/30 bg-accent/5' : 'hover:border-accent/20'
            }`}
          >
            <div className="flex flex-col gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  stat.highlight ? 'bg-accent/20 text-accent' : 'bg-background-secondary text-muted'
                }`}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold leading-none text-foreground tabular-nums">{stat.value}</p>
                <p className="text-xs text-muted mt-1.5 font-medium">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="rounded-2xl p-5 sm:p-6 border border-border bg-card">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-base font-semibold text-foreground">Quick Actions</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="rounded-xl p-4 border border-border bg-background-secondary/50 hover:bg-card-hover hover:border-accent/30 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
                  {action.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{action.label}</p>
                  <p className="text-xs text-muted">{action.desc}</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
            </Link>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="rounded-2xl p-5 sm:p-6 border border-border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-semibold text-foreground">More insights</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <p className="text-sm text-muted mb-4">
          Dive into survival, purges, and game performance on your Puurga Dashboard.
        </p>
        <Link
          to="/puurga-dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
        >
          Open Puurga Dashboard
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
