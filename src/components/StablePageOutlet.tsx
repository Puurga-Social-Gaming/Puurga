import React, { Suspense, useEffect } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import RouteLoadingBar from './RouteLoadingBar';

/**
 * Page outlet with Suspense scoped to the CENTER COLUMN only.
 * Layout (header / left menu / right rail) stays mounted — never blanks.
 */
const StablePageOutlet: React.FC = () => {
  const outlet = useOutlet();
  const location = useLocation();

  return (
    <Suspense
      fallback={
        <div className="relative min-h-[50vh] flex items-center justify-center">
          <RouteLoadingBar />
          <div className="flex flex-col items-center gap-3 text-muted">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <span className="text-xs">Loading…</span>
          </div>
        </div>
      }
    >
      <div key={location.pathname} className="min-h-0">
        {outlet}
      </div>
    </Suspense>
  );
};

export default StablePageOutlet;

/** Warm the main nav chunks so clicks rarely suspend. */
export function preloadMainRoutes() {
  void import('../pages/Home');
  void import('../pages/Profile');
  void import('../pages/Messages');
  void import('../pages/PurgaGames/PurgaGames');
  void import('../pages/PuurgaDashboard');
  void import('../pages/Purgatory');
  void import('../pages/Groups');
  void import('../pages/Notifications/Notifications');
  void import('../pages/Settings/Settings');
  void import('../pages/Help');
  void import('../pages/UserProfile');
  void import('../pages/Connections');
}

export function usePreloadMainRoutes() {
  useEffect(() => {
    const run = () => preloadMainRoutes();
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, 300);
    return () => window.clearTimeout(t);
  }, []);
}
