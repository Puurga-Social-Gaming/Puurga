import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, MessageSquare, Bell, Settings, User, Coins, Gamepad2, ArrowUpRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCredits } from '../hooks/useCredits';

const Dashboard: React.FC = () => {
  const { balance } = useCredits();

  const stats = [
    { icon: <Coins className="w-5 h-5" />, label: 'Perga Credits', value: balance.toLocaleString(), highlight: true },
    { icon: <Users className="w-5 h-5" />, label: 'Total Followers', value: '1.2K' },
    { icon: <TrendingUp className="w-5 h-5" />, label: 'Engagement Rate', value: '4.8%' },
    { icon: <MessageSquare className="w-5 h-5" />, label: 'Active Conversations', value: '24' },
    { icon: <Bell className="w-5 h-5" />, label: 'Notifications', value: '12' }
  ];

  const quickActions = [
    { icon: <User className="w-5 h-5" />, label: 'Edit Profile', path: '/profile', desc: 'Update your info' },
    { icon: <Gamepad2 className="w-5 h-5" />, label: 'Play Games', path: '/puurga-games', desc: 'Earn credits' },
    { icon: <Settings className="w-5 h-5" />, label: 'App Settings', path: '/settings', desc: 'Customize your hub' }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 space-y-5 min-h-screen"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Bebas+Neue&display=swap');

        .glow-orange { box-shadow: 0 0 40px rgba(249,115,22,0.18), 0 0 0 1px rgba(249,115,22,0.15); }
        .stat-card { background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%); border: 1px solid rgba(255,255,255,0.07); backdrop-filter: blur(12px); }
        .stat-card:hover { border-color: rgba(249,115,22,0.3); background: linear-gradient(135deg, rgba(249,115,22,0.06) 0%, rgba(234,179,8,0.03) 100%); }
        .action-card { background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%); border: 1px solid rgba(255,255,255,0.07); }
        .action-card:hover { border-color: rgba(249,115,22,0.4); background: linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(0,0,0,0) 100%); transform: translateY(-2px); }
        .hero-card { background: linear-gradient(135deg, #1c1200 0%, #0d0d0d 50%, #120800 100%); border: 1px solid rgba(249,115,22,0.2); }
        .section-card { background: linear-gradient(135deg, rgba(255,255,255,0.035) 0%, rgba(0,0,0,0) 100%); border: 1px solid rgba(255,255,255,0.06); }
        .earn-btn { background: linear-gradient(135deg, #f97316, #ea580c); box-shadow: 0 4px 20px rgba(249,115,22,0.4); }
        .earn-btn:hover { box-shadow: 0 6px 28px rgba(249,115,22,0.55); transform: translateY(-1px); }
        .puurga-title { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.08em; }
        .dot-grid { background-image: radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px); background-size: 24px 24px; }
        .badge { background: rgba(249,115,22,0.15); border: 1px solid rgba(249,115,22,0.3); }
      `}</style>

      {/* Welcome Hero */}
      <motion.div variants={itemVariants} className="hero-card rounded-2xl p-7 relative overflow-hidden dot-grid">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge text-orange-400 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> LIVE
              </span>
            </div>
            <h1 className="puurga-title text-5xl text-white tracking-wider">WELCOME TO PUURGA</h1>
            <p className="text-gray-500 mt-2 text-sm font-medium">Your social hub for meaningful connections</p>
          </div>
        </div>
      </motion.div>

      {/* Credits Hero Card */}
      <motion.div variants={itemVariants} className="glow-orange rounded-2xl p-7 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(234,179,8,0.08) 60%, rgba(249,115,22,0.05) 100%)', border: '1px solid rgba(249,115,22,0.25)' }}>
        <div className="absolute inset-0 dot-grid opacity-30" />
        <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 70%)' }} />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl blur-md" style={{ background: 'rgba(249,115,22,0.4)' }} />
              <div className="relative p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.3), rgba(234,88,12,0.2))', border: '1px solid rgba(249,115,22,0.4)' }}>
                <Coins className="w-7 h-7 text-orange-400" />
              </div>
            </div>
            <div>
              <p className="text-xs text-orange-400/70 font-semibold uppercase tracking-widest mb-0.5">Your Perga Credits</p>
              <p className="puurga-title text-5xl text-orange-400">{balance.toLocaleString()}</p>
            </div>
          </div>
          <Link
            to="/puurga-games"
            className="earn-btn text-white px-5 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm"
          >
            <Gamepad2 className="w-4 h-4" />
            Earn More
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className={`stat-card rounded-xl p-5 transition-all duration-300 cursor-default ${stat.highlight ? 'border-orange-500/20' : ''}`}
          >
            <div className="flex flex-col gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.highlight ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-gray-400'}`}>
                {stat.icon}
              </div>
              <div>
                <p className={`text-2xl font-bold leading-none ${stat.highlight ? 'text-orange-400' : 'text-white'}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500 mt-1.5 font-medium">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="section-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-base font-semibold text-white">Quick Actions</h2>
          <div className="h-px flex-1 bg-white/5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.path}
              className="action-card rounded-xl p-4 transition-all duration-250 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center flex-shrink-0">
                  {action.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{action.label}</p>
                  <p className="text-xs text-gray-500">{action.desc}</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-orange-400 transition-colors" />
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants} className="section-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-base font-semibold text-white">Recent Activity</h2>
          <div className="h-px flex-1 bg-white/5" />
        </div>
        <div className="rounded-xl p-8 flex flex-col items-center justify-center gap-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}>
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
            <Zap className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-sm text-gray-600 font-medium">No recent activity yet</p>
          <p className="text-xs text-gray-700">Start connecting to see your activity here</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;