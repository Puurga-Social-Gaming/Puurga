import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Bell, 
  MessageSquare, 
  Users, 
  UserCircle,
  HelpCircle,
  LogOut,
  Trophy,
  Wifi,
  Settings
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import PuurgaLogo from '../Icons/PuurgaLogo';

interface NavigationItem {
  to?: string;
  icon: LucideIcon;
  label: string;
  className?: string;
  onClick?: () => void;
}

const MainNav: React.FC = () => {
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const navLinkClasses = (isActive: boolean) => `
    relative flex items-center gap-3 px-4 py-3 text-gray-300 rounded-lg transition-colors
    hover:text-white hover:bg-[var(--surface)]
    ${isActive ? 'text-[var(--accent)] bg-[var(--surface)] border-l-2 border-[var(--accent)] pl-3' : ''}
  `;

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      toast.success('Logged out successfully!');
      navigate('/login');
    } catch (error: unknown) {
      console.error('Logout error:', error);
      let errorMessage = 'Failed to log out.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }
      toast.error(errorMessage);
    }
  };

  const getNavigationItems = (): NavigationItem[] => {
    const commonItems: NavigationItem[] = [
      { to: '/home', icon: Home, label: 'Home' },
      { to: '/messages', icon: MessageSquare, label: 'Messages' },
      { to: '/notifications', icon: Bell, label: 'Notifications' },
      { to: '/groups', icon: Users, label: 'Groups' },
      { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
      { to: '/profile', icon: UserCircle, label: 'Profile' },
      { to: '/help', icon: HelpCircle, label: 'Help' },
    ];

    const roleBasedItems: NavigationItem[] = [];

    return [...commonItems, ...roleBasedItems];
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="flex flex-col h-full">
      {/* Logo at the top */}
      <div className="p-6 pb-8 flex items-center justify-center gap-3">
        <PuurgaLogo size={40} className="text-orange-500" />
        <span className="text-xl font-bold tracking-wide text-[var(--accent)]">PUURGA</span>
      </div>

      {/* Secondary Action Button */}
      <div className="px-4 mb-8">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white bg-[var(--surface)] hover:bg-opacity-80 rounded-lg transition-colors">
          <Wifi className="w-5 h-5" />
          <span className="font-semibold">Go Live</span>
        </button>
      </div>

      {/* Navigation items with extra top spacing */}
      <div className="px-4 space-y-1 mt-8">
        {navigationItems.map((item) => (
          item.to ? (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                ${navLinkClasses(isActive)}
                ${item.className || ''}
              `}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.to === '/notifications' && unreadCount > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
          ) : (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full text-left ${navLinkClasses(false)} ${item.className || ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          )
        ))}
      </div>

      {/* Logout button at the bottom */}
      <div className="mt-auto p-4">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-[var(--surface)] rounded-lg transition-colors"
        >
          <LogOut className="w-6 h-6" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default MainNav;