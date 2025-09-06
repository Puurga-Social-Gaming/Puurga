import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, MessageCircle, AtSign, Settings as SettingsIcon } from 'lucide-react';

type NotificationTab = 'all' | 'unread' | 'mentions' | 'requests';

const Notifications: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');

  const mockNotifications = [
    {
      id: '1',
      type: 'like',
      message: 'John Doe liked your post.',
      time: '2 hours ago',
      read: false,
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
    },
    {
      id: '2',
      type: 'comment',
      message: 'Jane Smith commented on your photo.',
      time: '5 hours ago',
      read: false,
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
    },
    {
      id: '3',
      type: 'mention',
      message: 'Alex (@alex_code) mentioned you in a post.',
      time: '1 day ago',
      read: true,
      avatar: 'https://randomuser.me/api/portraits/men/12.jpg'
    },
    {
      id: '4',
      type: 'follow',
      message: 'Sarah Brown started following you.',
      time: '2 days ago',
      read: true,
      avatar: 'https://randomuser.me/api/portraits/women/65.jpg'
    },
    {
      id: '5',
      type: 'request',
      message: 'Michael Green sent you a friend request.',
      time: '3 days ago',
      read: false,
      avatar: 'https://randomuser.me/api/portraits/men/77.jpg'
    },
  ];

  const filteredNotifications = mockNotifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.read;
    if (activeTab === 'mentions') return notification.type === 'mention';
    if (activeTab === 'requests') return notification.type === 'request';
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto p-4"
    >
      <h1 className="text-3xl font-bold mb-6 text-white">Notifications</h1>
      
      {/* Tabs for notification categories */}
      <div className="flex border-b border-gray-700 mb-6">
        <TabButton
          label="All"
          icon={<Bell size={18} />}
          isActive={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
        />
        <TabButton
          label="Unread"
          icon={<MessageCircle size={18} />}
          isActive={activeTab === 'unread'}
          onClick={() => setActiveTab('unread')}
        />
        <TabButton
          label="Mentions"
          icon={<AtSign size={18} />}
          isActive={activeTab === 'mentions'}
          onClick={() => setActiveTab('mentions')}
        />
        <TabButton
          label="Requests"
          icon={<SettingsIcon size={18} />}
          isActive={activeTab === 'requests'}
          onClick={() => setActiveTab('requests')}
        />
      </div>

      {filteredNotifications.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No notifications in this category.</p>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      )}
    </motion.div>
  );
};

interface TabButtonProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, icon, isActive, onClick }) => (
  <button
    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium focus:outline-none transition-colors duration-200
      ${isActive
        ? 'text-orange-500 border-b-2 border-orange-500'
        : 'text-gray-400 hover:text-gray-200 hover:border-gray-500 border-b-2 border-transparent'
      }`}
    onClick={onClick}
  >
    {icon}
    <span>{label}</span>
  </button>
);

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    message: string;
    time: string;
    read: boolean;
    avatar: string;
  };
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={`flex items-center gap-4 p-4 rounded-lg shadow-md transition-colors duration-200
      ${notification.read ? 'bg-[#1a1a1a] text-gray-400' : 'bg-orange-600/20 text-white'}
    `}
  >
    <img src={notification.avatar} alt="User Avatar" className="w-12 h-12 rounded-full object-cover" />
    <div className="flex-1">
      <p className={`font-medium ${notification.read ? 'text-gray-300' : 'text-white'}`}>
        {notification.message}
      </p>
      <p className={`text-sm mt-1 ${notification.read ? 'text-gray-500' : 'text-orange-200'}`}>
        {notification.time}
      </p>
    </div>
    {!notification.read && (
      <span className="w-3 h-3 bg-orange-500 rounded-full flex-shrink-0" title="Unread"></span>
    )}
  </motion.div>
);

export default Notifications; 