import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, MessageSquare, Bell, Settings, User, Coins, Gamepad2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCredits } from '../hooks/useCredits';

const Dashboard: React.FC = () => {
  const { balance } = useCredits();

  const stats = [
    { icon: <Coins className="w-6 h-6" />, label: 'Perga Credits', value: balance.toLocaleString(), highlight: true },
    { icon: <Users className="w-6 h-6" />, label: 'Total Followers', value: '1.2K' },
    { icon: <TrendingUp className="w-6 h-6" />, label: 'Engagement Rate', value: '4.8%' },
    { icon: <MessageSquare className="w-6 h-6" />, label: 'Active Conversations', value: '24' },
    { icon: <Bell className="w-6 h-6" />, label: 'Notifications', value: '12' }
  ];

  const quickActions = [
    { icon: <User className="w-5 h-5" />, label: 'Edit Profile', path: '/profile' },
    { icon: <Gamepad2 className="w-5 h-5" />, label: 'Play Games', path: '/puurga-games' },
    { icon: <Settings className="w-5 h-5" />, label: 'App Settings', path: '/settings' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 space-y-6"
    >
      {/* Welcome Section */}
      <div className="bg-[#1a1a1a] rounded-xl p-6">
        <h1 className="text-2xl font-bold text-white">Welcome to PUURGA</h1>
        <p className="text-gray-400 mt-2">Your social hub for meaningful connections</p>
      </div>

      {/* Credits Highlight Card */}
      <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-xl p-6 border border-orange-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-orange-500/20 rounded-lg">
              <Coins className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Your Perga Credits</p>
              <p className="text-3xl font-bold text-orange-500">{balance.toLocaleString()}</p>
            </div>
          </div>
          <Link
            to="/puurga-games"
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <Gamepad2 className="w-5 h-5" />
            Earn More
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`rounded-xl p-6 ${stat.highlight
              ? 'bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20'
              : 'bg-[#1a1a1a]'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.highlight
                ? 'bg-orange-500/20 text-orange-500'
                : 'bg-orange-500/10 text-orange-500'}`}>
                {stat.icon}
              </div>
              <div>
                <p className={`text-2xl font-bold ${stat.highlight ? 'text-orange-500' : 'text-white'}`}>
                  {stat.value}
                </p>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-[#1a1a1a] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.path}
              className="flex items-center gap-3 p-4 bg-[#2d2d2d] rounded-lg hover:bg-orange-500/10 transition-colors"
            >
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                {action.icon}
              </div>
              <span className="text-white">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#1a1a1a] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="p-4 bg-[#2d2d2d] rounded-lg">
            <p className="text-gray-400">No recent activity</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
