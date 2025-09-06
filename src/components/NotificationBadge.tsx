import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import NotificationPanel from './NotificationPanel';

const NotificationBadge: React.FC = () => {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white hover:bg-[#333] rounded-full transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </div>
        )}
      </button>

      <NotificationPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
};

export default NotificationBadge; 