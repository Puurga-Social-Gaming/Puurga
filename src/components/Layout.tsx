import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header/Header';
import MainNav from './Navigation/MainNav';
import RightSidebar from './Sidebar/RightSidebar';
import GhostModeOverlay from './GhostMode/GhostModeOverlay';
import { useGhostMode } from '../hooks/useGhostMode';
import { useSurvival } from '../context/SurvivalContext';
import { EmotionalFeedback } from './Survival';
import { useDesktopWidthStore } from '../store/desktopWidthStore';
import StablePageOutlet, { usePreloadMainRoutes } from './StablePageOutlet';

/** Chat / immersive pages need edge-to-edge layout (no page-shell padding) */
function isFullBleedPath(pathname: string): boolean {
  if (pathname.startsWith('/messages')) return true;
  if (/^\/groups\/[^/]+$/.test(pathname)) return true;
  if (pathname.startsWith('/games')) return true;
  if (pathname === '/puurga-games') return true;
  return false;
}

/** Admin / dense dashboards need the full center column (no right rail content) */
function hideAsidePath(pathname: string): boolean {
  return pathname.startsWith('/super-admin');
}

const Layout: React.FC = () => {
  const { isGhost, purgeCount, ghostedAt, loading } = useGhostMode();
  const { survivalState } = useSurvival();
  const { pathname } = useLocation();
  const fullBleed = isFullBleedPath(pathname);
  const hideAside = hideAsidePath(pathname);
  const mode = useDesktopWidthStore((s) => s.mode);
  const [hideMobileNav, setHideMobileNav] = React.useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  usePreloadMainRoutes();

  useEffect(() => {
    document.documentElement.setAttribute('data-desktop-width', mode);
  }, [mode]);

  // Lock document scroll so only the center column moves — chrome stays put
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.classList.add('app-chrome-locked');
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.classList.remove('app-chrome-locked');
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  useEffect(() => {
    if (survivalState?.purgatory_status) {
      document.documentElement.classList.add('purgatory-mode');
    } else {
      document.documentElement.classList.remove('purgatory-mode');
    }
    return () => {
      document.documentElement.classList.remove('purgatory-mode');
    };
  }, [survivalState?.purgatory_status]);

  useEffect(() => {
    const onChat = (e: Event) => {
      const detail = (e as CustomEvent<{ open?: boolean }>).detail;
      setHideMobileNav(Boolean(detail?.open));
    };
    window.addEventListener('puurga:messages-chat', onChat);
    return () => {
      window.removeEventListener('puurga:messages-chat', onChat);
      setHideMobileNav(false);
    };
  }, [pathname]);

  useEffect(() => {
    if (!pathname.startsWith('/messages')) {
      setHideMobileNav(false);
    }
  }, [pathname]);

  // Only the center column scrolls / resets — left menu & right rail stay put
  useEffect(() => {
    const el = mainScrollRef.current;
    if (el) el.scrollTop = 0;
  }, [pathname]);

  return (
    <>
      {survivalState?.purgatory_status && <div className="purgatory-vignette" />}

      <Header />

      <EmotionalFeedback />

      {!loading && isGhost && ghostedAt && (
        <GhostModeOverlay
          purgeCount={purgeCount}
          ghostedAt={ghostedAt}
        />
      )}

      <div className="desktop-app-shell flex h-[100dvh] max-h-[100dvh] bg-background text-foreground overflow-hidden">
        {/* Desktop left menu — permanent column, never unmounts with routes */}
        <aside
          className="hidden lg:flex desktop-nav-col flex-col shrink-0 h-full border-r border-border/60 bg-background pt-14 overflow-hidden"
          data-ghost-allow="true"
        >
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide overscroll-contain">
            <MainNav />
          </div>
        </aside>

        {/* Center content — sole scrolling / swapping region */}
        <main
          ref={mainScrollRef}
          className={`app-main-scroll flex-1 min-w-0 pt-14 overscroll-contain ${
            fullBleed ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'
          }`}
        >
          <div
            className={`min-w-0 ${
              fullBleed
                ? 'h-[calc(100dvh-3.5rem)] flex flex-col overflow-hidden'
                : 'pb-20 lg:pb-0 page-shell'
            } ${!fullBleed || hideMobileNav ? '' : 'pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-0'} ${
              !loading && isGhost ? 'pointer-events-none select-none' : ''
            }`}
          >
            <StablePageOutlet />
          </div>
        </main>

        {/* Desktop right rail — hidden entirely on dense admin pages (2 cols: menu + content) */}
        {!hideAside && (
          <aside
            className="hidden lg:flex desktop-aside-col flex-col shrink-0 h-full border-l border-border/60 bg-background pt-14 overflow-hidden"
            data-ghost-allow="true"
          >
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide overscroll-contain">
              <div className="pt-4 pb-4 px-2 desktop-aside-pad">
                <RightSidebar />
              </div>
            </div>
          </aside>
        )}

        <div
          className={`lg:hidden fixed bottom-0 left-0 right-0 w-full max-w-full bg-background border-t border-border z-toast overflow-hidden pb-[env(safe-area-inset-bottom,0px)] transition-transform duration-200 ${
            hideMobileNav ? 'translate-y-full pointer-events-none' : 'translate-y-0'
          }`}
          data-ghost-allow="true"
        >
          <MainNav />
        </div>
      </div>
    </>
  );
};

export default Layout;
