import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, MessageSquare, Bell, Settings, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const stats = [
    { icon: <Users className="w-6 h-6" />, label: 'Total Followers', value: '1.2K' },
    { icon: <TrendingUp className="w-6 h-6" />, label: 'Engagement Rate', value: '4.8%' },
    { icon: <MessageSquare className="w-6 h-6" />, label: 'Active Conversations', value: '24' },
    { icon: <Bell className="w-6 h-6" />, label: 'Notifications', value: '12' }
  ];

  const quickActions = [
    { icon: <User className="w-5 h-5" />, label: 'Edit Profile', path: '/profile' },

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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-lg text-orange-500">
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-[#1a1a1a] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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