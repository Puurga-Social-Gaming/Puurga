import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  ShieldCheck,
  Ghost,
  MoreHorizontal,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useUser } from '../../context/UserContext';
import { useSurvival } from '../../context/SurvivalContext';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import PuurgaLogo from '../Icons/PuurgaLogo';

interface NavigationItem {
  to?: string;
  icon: LucideIcon;
  label: string;
  className?: string;
  onClick?: () => void;
}

const MainNav: React.FC = () => {
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();
  const { user: currentUser } = useUser();
  const { survivalState } = useSurvival();
  const isGhosted = survivalState?.purgatory_status === true;
  const navigate = useNavigate();
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'superadmin';
  const [showMore, setShowMore] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        moreBtnRef.current && !moreBtnRef.current.contains(e.target as Node)
      ) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const navLinkClasses = (isActive: boolean) => `
    relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
    ${isActive
      ? 'nav-active shadow-theme-sm'
      : 'text-muted hover:text-foreground hover:bg-highlight-light hover:shadow-theme-sm border border-transparent hover:border-highlight'
    }
  `;

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('supabase.auth.token');
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
    const items: NavigationItem[] = [
      { to: '/home', icon: Home, label: t('navigation.home') },
      { to: '/profile', icon: UserCircle, label: t('navigation.profile') },
      { to: '/puurga-games', icon: Gamepad2, label: t('navigation.games') },
      { to: '/puurga-dashboard', icon: BarChart3, label: t('navigation.dashboard') },
      { to: '/purgatory', icon: Ghost, label: t('navigation.purgatory'), className: isGhosted ? 'text-gray-400 hover:text-gray-200 border-gray-800' : undefined },
    ];

    if (!isGhosted) {
      items.push(
        { to: '/messages', icon: MessageSquare, label: t('navigation.messages') },
        { to: '/groups', icon: Users, label: t('navigation.groups') },
      );
    }

    items.push(
      { to: '/help', icon: HelpCircle, label: t('navigation.help') },
      { to: '/notifications', icon: Bell, label: t('navigation.notifications') },
      { to: '/settings', icon: Settings, label: t('navigation.settings') },
    );

    if (isSuperAdmin) {
      items.push({ to: '/super-admin', icon: ShieldCheck, label: t('navigation.superAdmin'), className: 'text-red-500 hover:text-red-400' });
    }

    return items;
  };

  const navigationItems = getNavigationItems();

  const moreOptions = [
    { icon: Ghost, label: t('navigation.purgatory'), to: '/purgatory' },
    { icon: Bell, label: t('navigation.notifications'), to: '/notifications' },
    { icon: Gamepad2, label: t('navigation.games'), to: '/puurga-games' },
    { icon: BarChart3, label: t('navigation.dashboard'), to: '/puurga-dashboard' },
  ];

  if (!isGhosted) {
    moreOptions.push({ icon: Users, label: t('navigation.groups'), to: '/groups' });
  }

  moreOptions.push(
    { icon: HelpCircle, label: t('navigation.help'), to: '/help' },
    { icon: Settings, label: t('navigation.settings'), to: '/settings' },
  );

  if (isSuperAdmin) {
    moreOptions.push({ icon: ShieldCheck, label: t('navigation.superAdmin'), to: '/super-admin' });
  }

  return (
    <>
      {/* Desktop Sidebar Layout */}
      <div className="hidden lg:flex flex-col h-full sidebar justify-center">
        <div className="p-6 pb-8 flex items-center justify-center gap-3">
          <PuurgaLogo size={40} className="text-accent" />
          <span className="text-xl font-bold tracking-wide text-accent">PUURGA</span>
        </div>

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

        <div className="mt-auto p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-muted hover:text-foreground hover:bg-highlight-light hover:shadow-theme-sm rounded-lg transition-all border border-transparent hover:border-highlight"
          >
            <LogOut className="w-6 h-6" />
            <span>{t('navigation.logout')}</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden grid grid-cols-5 items-center w-full max-w-full mx-auto px-0.5 py-0.5">
        <NavLink
          to="/home"
          className={({ isActive }) => `
            flex flex-col items-center justify-center gap-1 px-1 py-2 transition-colors relative min-w-0 overflow-hidden
            ${isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}
          `}
        >
          <Home size={18} />
          <span className="text-[9px] leading-none truncate w-full text-center">{t('navigation.home')}</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) => `
            flex flex-col items-center justify-center gap-1 px-1 py-2 transition-colors relative min-w-0 overflow-hidden
            ${isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}
          `}
        >
          <UserCircle size={18} />
          <span className="text-[9px] leading-none truncate w-full text-center">{t('navigation.profile')}</span>
        </NavLink>

        <NavLink
          to="/puurga-games"
          className={({ isActive }) => `
            flex flex-col items-center justify-center gap-1 px-1 py-2 transition-colors relative min-w-0 overflow-hidden
            ${isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}
          `}
        >
          <Gamepad2 size={18} />
          <span className="text-[9px] leading-none truncate w-full text-center">{t('navigation.games')}</span>
        </NavLink>

        <NavLink
          to="/messages"
          className={({ isActive }) => `
            flex flex-col items-center justify-center gap-1 px-1 py-2 transition-colors relative min-w-0 overflow-hidden
            ${isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}
          `}
        >
          <MessageSquare size={18} />
          <span className="text-[9px] leading-none truncate w-full text-center">{t('navigation.chat')}</span>
        </NavLink>

        <button
          ref={moreBtnRef}
          onClick={() => setShowMore(!showMore)}
          className={`flex flex-col items-center justify-center gap-1 px-1 py-2 transition-colors relative min-w-0 overflow-hidden ${showMore ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <MoreHorizontal size={18} />
          <span className="text-[9px] leading-none truncate w-full text-center">{t('navigation.more')}</span>
        </button>
      </div>

      {/* Mobile More Popover */}
      {createPortal(
        <>
          {showMore && (
            <div className="fixed inset-0 z-[9998]" onClick={() => setShowMore(false)} />
          )}
          <AnimatePresence>
            {showMore && (
              <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                className="fixed z-[9999] mx-auto bg-card border border-border rounded-xl shadow-xl overflow-hidden"
                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)', left: '50%', transform: 'translateX(-50%)', minWidth: '200px' }}
              >
                <div className="py-0.5">
                  {moreOptions.map((option) => (
                    <NavLink
                      key={option.to}
                      to={option.to!}
                      onClick={() => setShowMore(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-card-hover transition-colors"
                    >
                      <option.icon size={15} className="text-muted" />
                      <span>{option.label}</span>
                    </NavLink>
                  ))}
                  <div className="border-t border-border mx-2 my-0.5" />
                  <button
                    onClick={() => {
                      setShowMore(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={15} />
                    <span>{t('navigation.logout')}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </>
  );
};

export default MainNav;
