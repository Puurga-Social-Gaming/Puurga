import React, { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
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
  X,
  Link2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { useNotifications } from '../../context/NotificationsContext';
import { useMessages } from '../../context/MessagesContext';
import { useSurvival } from '../../context/SurvivalContext';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';
import PuurgaLogo from '../Icons/PuurgaLogo';

interface MobileSideMenuProps {
  open: boolean;
  onClose: () => void;
}

interface MenuItem {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  accent?: string;
}

const MobileSideMenu: React.FC<MobileSideMenuProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { unreadCount } = useNotifications();
  const { unreadTotal: unreadMessages } = useMessages();
  const { survivalState } = useSurvival();
  const isGhosted = survivalState?.purgatory_status === true;
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'superadmin';

  const closeMenu = useCallback(() => {
    onClose();
  }, [onClose]);

  const goTo = useCallback(
    (path: string) => {
      onClose();
      // Defer navigation so state close paints immediately on mobile
      requestAnimationFrame(() => {
        if (location.pathname !== path) {
          navigate(path);
        }
      });
    },
    [onClose, navigate, location.pathname]
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeMenu]);

  const handleLogout = async () => {
    closeMenu();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('supabase.auth.token');
      } catch {
        /* ignore */
      }
      toast.success(t('navigation.logoutSuccess', 'Logged out successfully'));
      navigate('/login');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to log out';
      toast.error(msg);
    }
  };

  const items: MenuItem[] = [
    { to: '/home', icon: Home, label: t('navigation.home') },
    { to: '/profile', icon: UserCircle, label: t('navigation.profile') },
    { to: '/connections', icon: Link2, label: t('rightSidebar.myConnections', 'My Connections') },
    { to: '/puurga-games', icon: Gamepad2, label: t('navigation.games') },
    { to: '/puurga-dashboard', icon: BarChart3, label: t('navigation.dashboard') },
    {
      to: '/purgatory',
      icon: Ghost,
      label: t('navigation.purgatory'),
      accent: isGhosted ? 'text-muted' : undefined,
    },
  ];

  if (!isGhosted) {
    items.push(
      {
        to: '/messages',
        icon: MessageSquare,
        label: t('navigation.messages'),
        badge: unreadMessages > 0 ? unreadMessages : undefined,
      },
      { to: '/groups', icon: Users, label: t('navigation.groups') }
    );
  }

  items.push(
    {
      to: '/notifications',
      icon: Bell,
      label: t('navigation.notifications'),
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { to: '/settings', icon: Settings, label: t('navigation.settings') },
    { to: '/help', icon: HelpCircle, label: t('navigation.help') }
  );

  if (isSuperAdmin) {
    items.push({
      to: '/super-admin',
      icon: ShieldCheck,
      label: t('navigation.superAdmin'),
      accent: 'text-red-500',
    });
  }

  const displayName = user?.name || user?.full_name || 'User';
  const username = user?.username ? `@${user.username}` : '';
  const avatar = user?.avatar || DEFAULT_IMAGES.avatar;

  if (typeof document === 'undefined' || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10050] lg:hidden" data-mobile-side-menu="">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-black/50 border-0 p-0 cursor-default touch-manipulation"
        onClick={closeMenu}
      />

      {/* Drawer */}
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={t('navigation.menu', 'Menu')}
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'tween', duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
        className="absolute top-0 left-0 h-full w-[min(86vw,300px)] flex flex-col bg-card border-r border-border shadow-2xl z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <PuurgaLogo size={26} className="shrink-0" />
            <span className="text-sm font-bold tracking-[0.14em] uppercase text-foreground truncate">
              Puurga
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeMenu();
            }}
            className="p-2.5 -mr-1 rounded-full text-muted hover:text-foreground hover:bg-card-hover transition-colors touch-manipulation"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => goTo('/profile')}
          className="flex items-center gap-3 px-4 py-3.5 border-b border-border text-left hover:bg-card-hover/60 transition-colors shrink-0 touch-manipulation"
        >
          <img
            src={avatar}
            alt=""
            className="w-11 h-11 rounded-full object-cover border border-border shrink-0"
            onError={(e) => {
              e.currentTarget.src = DEFAULT_IMAGES.avatar;
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">
              {displayName}
            </p>
            {username && (
              <p className="text-xs text-muted truncate mt-0.5">{username}</p>
            )}
            <p className="text-[11px] text-accent mt-1 font-medium">
              {t('rightSidebar.viewFullProfile', 'View profile')}
            </p>
          </div>
        </button>

        <nav className="flex-1 overflow-y-auto overscroll-contain py-2 px-2 scrollbar-hide">
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active =
                location.pathname === item.to ||
                (item.to !== '/home' && location.pathname.startsWith(item.to));
              return (
                <li key={item.to}>
                  <button
                    type="button"
                    onClick={() => goTo(item.to)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors touch-manipulation ${
                      active
                        ? 'bg-accent/12 text-accent'
                        : 'text-foreground hover:bg-card-hover'
                    } ${item.accent || ''}`}
                  >
                    <item.icon size={18} className="shrink-0 opacity-90" />
                    <span className="flex-1 truncate text-left">{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-semibold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          className="shrink-0 border-t border-border px-2 pt-2"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors touch-manipulation"
          >
            <LogOut size={18} className="shrink-0" />
            <span>{t('navigation.logout')}</span>
          </button>
        </div>
      </motion.aside>
    </div>,
    document.body
  );
};

export default MobileSideMenu;
