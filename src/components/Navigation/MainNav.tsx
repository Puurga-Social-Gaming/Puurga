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
  LogOut,
  Gamepad2,
  BarChart3,
  Settings,
  ShieldCheck,
  Ghost,
  MoreHorizontal,
  Compass,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useMessages } from '../../context/MessagesContext';
import { useUser } from '../../context/UserContext';
import { useSurvival } from '../../context/SurvivalContext';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import XPBar from '../Progression/XPBar';

const WELCOME_VIEWED_KEY = 'puurga_welcome_viewed';

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
  const { unreadTotal: unreadMessages } = useMessages();
  const { user: currentUser } = useUser();
  const { survivalState } = useSurvival();
  const isGhosted = survivalState?.purgatory_status === true;
  const navigate = useNavigate();
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'superadmin';
  const [showMore, setShowMore] = useState(false);
  const [welcomeViewed, setWelcomeViewed] = useState(() => localStorage.getItem(WELCOME_VIEWED_KEY) === 'true');
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const markWelcomeViewed = () => {
    localStorage.setItem(WELCOME_VIEWED_KEY, 'true');
    setWelcomeViewed(true);
    navigate('/welcome');
  };

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
    relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150
    border-l-[3px]
    ${isActive
      ? 'nav-active'
      : 'border-l-transparent text-muted hover:text-foreground hover:bg-highlight-light'
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
      { to: '/welcome', icon: Compass, label: 'Welcome', className: welcomeViewed ? '' : 'welcome-pulse' },
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
    { icon: Compass, label: 'Welcome', to: '/welcome' },
    { icon: Settings, label: t('navigation.settings'), to: '/settings' },
  );

  if (isSuperAdmin) {
    moreOptions.push({ icon: ShieldCheck, label: t('navigation.superAdmin'), to: '/super-admin' });
  }

  return (
    <>
      {/* Desktop Sidebar Layout — stable fixed column content */}
      <div className="hidden lg:flex flex-col h-full min-h-0 sidebar">
        <nav className="flex-1 px-3 pt-3 pb-2 space-y-0.5 overflow-y-auto scrollbar-hide">
          {navigationItems.map((item) => (
            item.to ? (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/home' || item.to === '/profile'}
                onClick={item.to === '/welcome' ? markWelcomeViewed : undefined}
                onMouseEnter={() => {
                  // Prefetch route chunk on hover for instant navigation
                  const path = item.to!;
                  if (path === '/home') void import('../../pages/Home');
                  else if (path === '/profile') void import('../../pages/Profile');
                  else if (path === '/messages') void import('../../pages/Messages');
                  else if (path === '/puurga-games') void import('../../pages/PurgaGames/PurgaGames');
                  else if (path === '/puurga-dashboard') void import('../../pages/PuurgaDashboard');
                  else if (path === '/purgatory') void import('../../pages/Purgatory');
                  else if (path === '/groups') void import('../../pages/Groups');
                  else if (path === '/notifications') void import('../../pages/Notifications/Notifications');
                  else if (path === '/settings') void import('../../pages/Settings/Settings');
                  else if (path === '/welcome') void import('../../pages/WelcomeCenter');
                  else if (path === '/help') void import('../../pages/Help');
                  else if (path === '/super-admin') void import('../../pages/SuperAdmin/SuperAdmin');
                }}
                className={({ isActive }) => `
                  ${navLinkClasses(isActive)}
                  ${item.className || ''}
                `}
              >
                <item.icon size={18} className="shrink-0" />
                <span className="text-sm font-medium truncate">{item.label}</span>
                {item.to === '/notifications' && unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                {item.to === '/messages' && unreadMessages > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </NavLink>
            ) : (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`w-full text-left ${navLinkClasses(false)} ${item.className || ''}`}
              >
                <item.icon size={18} className="shrink-0" />
                <span className="text-sm font-medium truncate">{item.label}</span>
              </button>
            )
          ))}
        </nav>

        <div className="px-3 pt-2 shrink-0">
          <XPBar compact />
        </div>

        <div className="px-3 pb-4 pt-2 border-t border-border/40 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 border-l-[3px] border-l-transparent text-muted hover:text-foreground hover:bg-highlight-light rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut size={18} className="shrink-0" />
            <span>{t('navigation.logout')}</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation — uses replace so tab switches don't clutter history stack */}
      <div className="lg:hidden grid grid-cols-5 items-center w-full max-w-full mx-auto px-0.5 py-0.5">
        <NavLink
          to="/home"
          replace
          end
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
          replace
          end
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
          replace
          end
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
          replace
          end
          className={({ isActive }) => `
            flex flex-col items-center justify-center gap-1 px-1 py-2 transition-colors relative min-w-0 overflow-hidden
            ${isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}
          `}
        >
          <span className="relative inline-flex">
            <MessageSquare size={18} />
            {unreadMessages > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-semibold rounded-full h-3.5 min-w-[14px] px-0.5 flex items-center justify-center leading-none">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            )}
          </span>
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
                       replace
                       end
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
