import React from 'react';
import { Outlet } from 'react-router-dom';
import MainNav from './Navigation/MainNav';
import RightSidebar from './Sidebar/RightSidebar';
import GhostModeOverlay from './GhostMode/GhostModeOverlay';
import { useGhostMode } from '../hooks/useGhostMode';

const Layout: React.FC = () => {
  const { isGhost, purgeCount, ghostedAt, loading } = useGhostMode();

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
      {/* Ghost Mode Overlay */}
      {!loading && isGhost && ghostedAt && (
        <GhostModeOverlay
          purgeCount={purgeCount}
          ghostedAt={ghostedAt}
        />
      )}
      {/* Left Sidebar - Hidden on mobile, visible on large screens */}
      <div className="hidden lg:flex lg:flex-shrink-0 lg:w-[220px] xl:w-[240px]">
        <div
          className="fixed left-0 top-0 bottom-0 w-[220px] xl:w-[240px] bg-background overflow-y-auto z-40"
          data-ghost-allow="true"
        >
          <MainNav />
        </div>
      </div>

      {/* Main Content Container - Properly constrained and scrollable */}
      <div className="flex-1 min-w-0 relative h-screen overflow-y-auto scrollbar-hide">
        {/* Main Content - Full width on mobile, constrained on desktop */}
        <div className={`w-full min-h-full pb-20 lg:pb-0 ${!loading && isGhost ? 'pointer-events-none select-none' : ''}`}>
          <Outlet />
        </div>
      </div>

      {/* Right Sidebar - Hidden on mobile and tablet, visible on large screens */}
      <div className="hidden lg:flex lg:flex-shrink-0 lg:w-[260px] xl:w-[300px] relative">
        {/* Subtle gradient overlay */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-black/5 dark:to-white/5 z-50 pointer-events-none"></div>
        <div className="fixed right-0 top-0 bottom-0 w-[260px] xl:w-[300px] sidebar overflow-y-auto z-40 scrollbar-hide">
          <div className="p-4">
            <RightSidebar />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Fixed to viewport, outside main flex container */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-[9999]"
        data-ghost-allow="true"
        style={{
          position: 'fixed',
          transform: 'none',
          willChange: 'auto',
          backfaceVisibility: 'hidden'
        }}
      >
        <div className="py-2.5">
          <MainNav />
        </div>
      </div>
    </div>
  );
};

export default Layout;