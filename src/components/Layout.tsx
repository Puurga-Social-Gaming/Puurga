import React from 'react';
import { Outlet } from 'react-router-dom';
import MainNav from './Navigation/MainNav';
import RightSidebar from './Sidebar/RightSidebar';
import SuggestedFriends from '../components/SuggestedFriends/SuggestedFriends';

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      {/* Main layout with fixed sidebars */}
      <div className="flex">
        {/* Left Sidebar - Logo and Main Navigation */}
        <div className="fixed left-0 top-0 bottom-0 w-[220px] lg:w-[240px] bg-[var(--card)] border-r border-[var(--border)] overflow-y-auto z-40 transition-all">
          <MainNav />
        </div>

        {/* Main Content - Adjusted padding and margins */}
        <div className="flex-1 ml-[220px] lg:ml-[240px] mr-[260px] xl:mr-[300px] transition-all">
          <div className="p-6 space-y-6">
            <Outlet />
          </div>
        </div>

        {/* Right Sidebar - Profile & Suggestions */}
        <div className="fixed right-0 top-0 bottom-0 w-[260px] xl:w-[300px] bg-[var(--card)] border-l border-[var(--border)] overflow-y-auto z-40 transition-all">
          <div className="p-4 space-y-6">
            <RightSidebar />
            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <SuggestedFriends />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Layout;