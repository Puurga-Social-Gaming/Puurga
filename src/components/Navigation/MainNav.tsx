import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  X,
  Sun,
  Moon,
  Globe,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
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
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
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
    relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
    ${isActive
      ? 'nav-active' // This class is defined in theme.css for both light and dark modes
      : 'text-muted hover:text-foreground hover:bg-card-hover hover:shadow-theme-sm'
    }
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
      { to: '/home', icon: Home, label: t('navigation.home') },
      { to: '/profile', icon: UserCircle, label: t('navigation.profile') },
      { to: '/messages', icon: MessageSquare, label: t('navigation.messages') },
      { to: '/groups', icon: Users, label: t('navigation.groups') },
      { to: '/puurga-games', icon: Gamepad2, label: t('navigation.games') },
      { to: '/puurga-dashboard', icon: BarChart3, label: t('navigation.dashboard') },
      { to: '/help', icon: HelpCircle, label: t('navigation.help') },
      { to: '/notifications', icon: Bell, label: t('navigation.notifications') },
      { to: '/settings', icon: Settings, label: t('navigation.settings') },
    ];

    const roleBasedItems: NavigationItem[] = [];

    return [...commonItems, ...roleBasedItems];
  };

  const navigationItems = getNavigationItems();

  return (
    <>
      {/* Desktop Sidebar Layout */}
      <div className="hidden lg:flex flex-col h-full sidebar justify-center">
        {/* Logo at the top */}
        <div className="p-6 pb-8 flex items-center justify-center gap-3">
          <PuurgaLogo size={40} className="text-accent" />
          <span className="text-xl font-bold tracking-wide text-accent">PUURGA</span>
        </div>



        {/* Navigation items with extra top spacing */}
        <div className="px-4 space-y-6 mt-8">
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
            <span>{t('navigation.logout')}</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden flex justify-around items-center w-full">
        {[
          { to: '/home', icon: Home, label: t('navigation.home') },
          { to: '/profile', icon: UserCircle, label: t('navigation.profile') },
          { to: '/puurga-games', icon: Gamepad2, label: t('navigation.gaming') },
          { to: '/groups', icon: Users, label: t('navigation.groups') },
          { to: '/puurga-dashboard', icon: BarChart3, label: t('navigation.dashboard') },
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
            <span className="text-[10px]">{t('navigation.more')}</span>
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
                <span>{t('navigation.notifications')}</span>
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
                <span>{t('navigation.settings')}</span>
              </NavLink>
              <div className="border-t border-border my-1" />
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 px-4 py-3 text-foreground-secondary transition-colors w-full text-left hover:bg-card-hover hover:text-foreground"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <div className="relative">
                <button
                  className="flex items-center gap-3 px-4 py-3 text-foreground-secondary transition-colors w-full text-left hover:bg-card-hover hover:text-foreground"
                  onClick={() => {
                    const langMenu = document.getElementById('language-menu');
                    if (langMenu) langMenu.classList.toggle('hidden');
                  }}
                >
                  <Globe size={18} />
                  <span>{t('settings.language')}</span>
                </button>
                <div id="language-menu" className="hidden absolute bottom-0 right-full mr-2 bg-card border border-border rounded-lg shadow-theme-lg min-w-[120px] overflow-hidden">
                  <button onClick={() => { i18n.changeLanguage('en'); }} className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-card-hover">English</button>
                  <button onClick={() => { i18n.changeLanguage('fr'); }} className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-card-hover">Français</button>
                  <button onClick={() => { i18n.changeLanguage('zu'); }} className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-card-hover">Zulu</button>
                  <button onClick={() => { i18n.changeLanguage('ss'); }} className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-card-hover">Swati</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MainNav;