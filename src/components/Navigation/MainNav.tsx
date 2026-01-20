import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Bell,
  MessageSquare,
  Users,
  UserCircle,
  HelpCircle,
  LogOut,
  Gamepad2,
  BarChart3,
  Settings,
  MoreHorizontal,
  X
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
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    };

    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreMenuOpen]);

  const navLinkClasses = (isActive: boolean) => `
    relative flex items-center gap-3 px-4 py-3 text-muted rounded-lg transition-all duration-200
    hover:text-foreground hover:bg-card-hover hover:shadow-theme-sm
    ${isActive ? 'text-accent bg-card border-l-2 border-accent pl-3 shadow-theme-sm' : ''}
  `;

  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      // Clear all authentication data from localStorage
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('supabase.auth.token');
        console.log('Cleared authentication data from localStorage');
      } catch (storageError) {
        console.warn('Failed to clear localStorage (non-fatal):', storageError);
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
      { to: '/profile', icon: UserCircle, label: 'Profile' },
      { to: '/messages', icon: MessageSquare, label: 'Messages' },
      { to: '/groups', icon: Users, label: 'Groups' },
      { to: '/puurga-games', icon: Gamepad2, label: 'Puurga Games' },
      { to: '/puurga-dashboard', icon: BarChart3, label: 'Puurga Dashboard' },
      { to: '/help', icon: HelpCircle, label: 'Help' },
      { to: '/notifications', icon: Bell, label: 'Notifications' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ];

    const roleBasedItems: NavigationItem[] = [];

    return [...commonItems, ...roleBasedItems];
  };

  const navigationItems = getNavigationItems();

  return (
    <>
      {/* Desktop Sidebar Layout */}
      <div className="hidden lg:flex flex-col h-full">
        {/* Logo at the top */}
        <div className="p-6 pb-8 flex items-center justify-center gap-3">
          <PuurgaLogo size={40} className="text-accent" />
          <span className="text-xl font-bold tracking-wide text-accent">PUURGA</span>
        </div>

        {/* Navigation items */}
        <div className="px-4 space-y-1">
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
            className="w-full flex items-center gap-3 px-4 py-3 text-muted hover:text-foreground hover:bg-card-hover rounded-lg transition-colors"
          >
            <LogOut className="w-6 h-6" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden flex justify-around items-center w-full">
        {[
          { to: '/home', icon: Home, label: 'Home' },
          { to: '/profile', icon: UserCircle, label: 'Profile' },
          { to: '/puurga-games', icon: Gamepad2, label: 'Gaming' },
          { to: '/groups', icon: Users, label: 'Groups' },
          { to: '/puurga-dashboard', icon: BarChart3, label: 'Dashboard' },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex flex-col items-center gap-1 px-2 py-2 text-muted transition-colors relative
              ${isActive ? 'text-accent' : 'hover:text-foreground'}
            `}
          >
            <item.icon size={18} />
            <span className="text-[10px]">{item.label}</span>
          </NavLink>
        ))}

        {/* More Menu Button */}
        <div className="relative" ref={moreMenuRef}>
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={`flex flex-col items-center gap-1 px-2 py-2 text-muted transition-colors relative ${moreMenuOpen ? 'text-accent' : 'hover:text-foreground'}`}
          >
            {moreMenuOpen ? <X size={18} /> : <MoreHorizontal size={18} />}
            <span className="text-[10px]">More</span>
            {unreadCount > 0 && !moreMenuOpen && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* More Menu Dropdown */}
          {moreMenuOpen && (
            <div className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-lg shadow-theme-lg min-w-[160px] overflow-hidden">
              <NavLink
                to="/notifications"
                onClick={() => setMoreMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 text-foreground-secondary transition-colors relative
                  hover:bg-card-hover hover:text-foreground
                  ${isActive ? 'text-accent bg-card-hover' : ''}
                `}
              >
                <Bell size={18} />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>
              <NavLink
                to="/settings"
                onClick={() => setMoreMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 text-foreground-secondary transition-colors
                  hover:bg-card-hover hover:text-foreground
                  ${isActive ? 'text-accent bg-card-hover' : ''}
                `}
              >
                <Settings size={18} />
                <span>Settings</span>
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MainNav;