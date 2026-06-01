import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header/Header';
import MainNav from './Navigation/MainNav';
import RightSidebar from './Sidebar/RightSidebar';
import GhostModeOverlay from './GhostMode/GhostModeOverlay';
import { useGhostMode } from '../hooks/useGhostMode';
import { useSurvival } from '../context/SurvivalContext';
import { SurvivalStatusBar, EmotionalFeedback } from './Survival';

const Layout: React.FC = () => {
  const { isGhost, purgeCount, ghostedAt, loading } = useGhostMode();
  const { survivalState } = useSurvival();

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

  return (
    <>
      {/* Purgatory vignette overlay */}
      {survivalState?.purgatory_status && <div className="purgatory-vignette" />}

      {/* Header — fixed to top, z-50, theme-aware */}
      <Header />

      {/* Survival Status Bar */}
      <div className="fixed top-[56px] left-0 right-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border/30">
        <SurvivalStatusBar />
      </div>

      {/* Emotional Feedback Effects */}
      <EmotionalFeedback />

      {/* Ghost Mode Overlay (legacy) */}
      {!loading && isGhost && ghostedAt && (
        <GhostModeOverlay
          purgeCount={purgeCount}
          ghostedAt={ghostedAt}
        />
      )}

       {/* Main body below header — full page scroll, sticky sidebars */}
       <div className="flex h-screen max-h-screen bg-background text-foreground overflow-hidden">
        {/* Left Sidebar — Hidden on mobile, sticky on large screens */}
        <div className="hidden lg:flex lg:flex-shrink-0 lg:w-[220px] xl:w-[240px]">
          <div
            className="w-full h-screen overflow-y-auto scrollbar-hide pt-[94px]"
            data-ghost-allow="true"
          >
            <MainNav />
          </div>
        </div>

        {/* Main Content — independently scrollable */}
        <div className="flex-1 min-w-0 pt-[94px] overflow-y-auto">
          <div className={`pb-20 lg:pb-0 ${!loading && isGhost ? 'pointer-events-none select-none' : ''}`}>
            <Outlet />
          </div>
        </div>

        {/* Right Sidebar — Hidden on mobile/tablet, sticky on large screens */}
        <div className="hidden lg:flex lg:flex-shrink-0 lg:w-[260px] xl:w-[300px]">
          <div className="w-full h-screen overflow-y-auto scrollbar-hide pt-[94px]" data-ghost-allow="true">
            <div className="pt-4 pb-4 px-3">
              <RightSidebar />
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation — Fixed to viewport */}
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 w-full max-w-full bg-background border-t border-border z-toast overflow-hidden"
          data-ghost-allow="true"
        >
          <MainNav />
        </div>
      </div>
    </>
  );
};

export default Layout;