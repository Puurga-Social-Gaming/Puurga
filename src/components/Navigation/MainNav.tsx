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
import { updateUserLanguage } from '../../services/languageService';
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
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'zu', name: 'Zulu', nativeName: 'isiZulu' },
    { code: 'ss', name: 'Siswati', nativeName: 'SiSwati' },
  ];

  const handleLanguageChange = async (code: string) => {
    if (isChangingLanguage) return;

    try {
      setIsChangingLanguage(true);
      // First change the language in i18n (instant UI update)
      await i18n.changeLanguage(code);
      
      // Then update on backend
      try {
        await updateUserLanguage(code);
        toast.success(`Language changed to ${languages.find(l => l.code === code)?.name}`);
      } catch (error) {
        // Language changed in UI but failed on backend - still acceptable
        console.warn('Language updated locally but failed to save on backend:', error);
        toast.success(`Language changed to ${languages.find(l => l.code === code)?.name}`);
      }
    } catch (error) {
      console.error('Failed to change language:', error);
      toast.error('Failed to change language');
    } finally {
      setIsChangingLanguage(false);
      setLanguageMenuOpen(false);
      setMoreMenuOpen(false);
    }
  };

  // Close more menu and language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
        setLanguageMenuOpen(false);
      }
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setLanguageMenuOpen(false);
      }
    };

    if (moreMenuOpen || languageMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreMenuOpen, languageMenuOpen]);

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
        {/* Home */}
        <NavLink
          to="/home"
          className={({ isActive }) => `
            flex flex-col items-center gap-0.5 px-2 py-1.5 transition-colors relative
            ${isActive ? 'text-accent' : 'text-muted hover:text-foreground'}
          `}
        >
          <Home size={20} />
        </NavLink>

        {/* Profile */}
        <NavLink
          to="/profile"
          className={({ isActive }) => `
            flex flex-col items-center gap-0.5 px-2 py-1.5 text-muted transition-colors relative
            ${isActive ? 'text-accent' : 'hover:text-foreground'}
          `}
        >
          <UserCircle size={20} />
        </NavLink>

        {/* Notifications */}
        <NavLink
          to="/notifications"
          className={({ isActive }) => `
            flex flex-col items-center gap-0.5 px-2 py-1.5 text-muted transition-colors relative
            ${isActive ? 'text-accent' : 'hover:text-foreground'}
          `}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-1 bg-blue-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </NavLink>

        {/* Messages */}
        <NavLink
          to="/messages"
          className={({ isActive }) => `
            flex flex-col items-center gap-0.5 px-2 py-1.5 text-muted transition-colors relative
            ${isActive ? 'text-accent' : 'hover:text-foreground'}
          `}
        >
          <MessageSquare size={20} />
        </NavLink>

        {/* More Menu Button */}
        <div className="relative" ref={moreMenuRef}>
          <button
            onClick={() => {
              setMoreMenuOpen(!moreMenuOpen);
              setLanguageMenuOpen(false);
            }}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 text-muted transition-colors relative ${moreMenuOpen ? 'text-accent' : 'hover:text-foreground'}`}
          >
            {moreMenuOpen ? <X size={20} /> : <MoreHorizontal size={20} />}
          </button>

          {/* More Menu Dropdown - Compact */}
          {moreMenuOpen && (
            <div className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-lg shadow-lg min-w-[160px] overflow-hidden z-50">
              {/* Groups */}
              <NavLink
                to="/groups"
                onClick={() => setMoreMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-2 px-3 py-2 text-xs text-foreground transition-colors w-full text-left hover:bg-card-hover
                  ${isActive ? 'bg-card-hover' : ''}
                `}
              >
                <Users size={16} />
                <span>{t('navigation.groups')}</span>
              </NavLink>

              {/* Games */}
              <NavLink
                to="/puurga-games"
                onClick={() => setMoreMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-2 px-3 py-2 text-xs text-foreground transition-colors w-full text-left hover:bg-card-hover
                  ${isActive ? 'bg-card-hover' : ''}
                `}
              >
                <Gamepad2 size={16} />
                <span>{t('navigation.games')}</span>
              </NavLink>

              {/* Dashboard */}
              <NavLink
                to="/puurga-dashboard"
                onClick={() => setMoreMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-2 px-3 py-2 text-xs text-foreground transition-colors w-full text-left hover:bg-card-hover
                  ${isActive ? 'bg-card-hover' : ''}
                `}
              >
                <BarChart3 size={16} />
                <span>{t('navigation.dashboard')}</span>
              </NavLink>

              {/* Help */}
              <NavLink
                to="/help"
                onClick={() => setMoreMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-2 px-3 py-2 text-xs text-foreground transition-colors w-full text-left hover:bg-card-hover
                  ${isActive ? 'bg-card-hover' : ''}
                `}
              >
                <HelpCircle size={16} />
                <span>{t('navigation.help')}</span>
              </NavLink>

              {/* Settings */}
              <NavLink
                to="/settings"
                onClick={() => setMoreMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-2 px-3 py-2 text-xs text-foreground transition-colors w-full text-left hover:bg-card-hover
                  ${isActive ? 'bg-card-hover' : ''}
                `}
              >
                <Settings size={16} />
                <span>{t('navigation.settings')}</span>
              </NavLink>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Light/Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2 text-xs text-foreground transition-colors w-full text-left hover:bg-card-hover"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                <span>{theme === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}</span>
              </button>

              {/* Notifications Link */}
              <NavLink
                to="/notifications"
                onClick={() => setMoreMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-2 px-3 py-2 text-xs text-foreground transition-colors relative
                  hover:bg-card-hover
                  ${isActive ? 'bg-card-hover' : ''}
                `}
              >
                <Bell size={16} />
                <span>{t('navigation.notifications')}</span>
                {unreadCount > 0 && (
                  <span className="ml-auto bg-blue-500 text-white text-[10px] rounded-full h-3.5 w-3.5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>

              {/* Language Selector */}
              <div className="relative border-t border-border" ref={languageMenuRef}>
                <button
                  onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-foreground transition-colors w-full text-left hover:bg-card-hover"
                >
                  <Globe size={16} />
                  <span>{t('settings.language')}</span>
                </button>
                
                {/* Language Options Dropdown */}
                {languageMenuOpen && (
                  <div className="bg-background-secondary border-t border-border">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        disabled={isChangingLanguage}
                        className={`block w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-card-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          i18n.language === lang.code ? 'bg-card-hover font-medium' : ''
                        }`}
                      >
                        {lang.nativeName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MainNav;