import React from 'react';
import { Outlet } from 'react-router-dom';
import MainNav from './Navigation/MainNav';
import RightSidebar from './Sidebar/RightSidebar';
import GhostModeOverlay from './GhostMode/GhostModeOverlay';
import { useGhostMode } from '../hooks/useGhostMode';

const Layout: React.FC = () => {
  const { isGhost, purgeCount, ghostedAt, loading } = useGhostMode();

  return (
    <div className="flex min-h-screen bg-black text-white overflow-hidden">
      {/* Ghost Mode Overlay */}
      {!loading && isGhost && ghostedAt && (
        <GhostModeOverlay
          purgeCount={purgeCount}
          ghostedAt={ghostedAt}
        />
      )}
      {/* Left Sidebar - Hidden on mobile, visible on large screens */}
      <div className="hidden lg:flex lg:flex-shrink-0 lg:w-[220px] xl:w-[240px]">
        <div className="fixed left-0 top-0 bottom-0 w-[220px] xl:w-[240px] bg-black border-r border-gray-800 overflow-y-auto z-[10000]">
          <MainNav />
        </div>
      </div>

      {/* Main Content Container - Properly constrained */}
      <div className="flex-1 min-w-0 relative">
        {/* Main Content - Full width on mobile, constrained on desktop */}
        <div className="w-full h-full pb-20 lg:pb-0 overflow-x-hidden">
          <Outlet />
        </div>
      </div>

      {/* Right Sidebar - Hidden on mobile and tablet, visible on large screens */}
      <div className="hidden lg:flex lg:flex-shrink-0 lg:w-[260px] xl:w-[300px]">
        <div className="fixed right-0 top-0 bottom-0 w-[260px] xl:w-[300px] bg-black border-l border-gray-800 overflow-y-auto z-40">
          <div className="p-4 space-y-6">
            <RightSidebar />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Fixed to viewport, outside main flex container */}
      <div 
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-[10000]"
        style={{ 
          position: 'fixed',
          transform: 'none',
          willChange: 'auto',
          backfaceVisibility: 'hidden'
        }}
      >
        <div className="flex justify-around items-center py-2">
          <MainNav />
        </div>
      </div>
    </div>
  );
};

export default Layout;