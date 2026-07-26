import React, { Suspense, useLayoutEffect, useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import RouteLoadingBar from './RouteLoadingBar';

/**
 * Keeps the previous page visible while the next lazy route chunk loads.
 * Layout / menus never unmount — only the center content swaps when ready.
 */
const StableOutlet: React.FC = () => {
  const outlet = useOutlet();
  const location = useLocation();
  const [cachedOutlet, setCachedOutlet] = useState<React.ReactNode>(outlet);

  return (
    <Suspense
      fallback={
        <>
          <RouteLoadingBar />
          <div className="min-w-0" aria-busy="true">
            {cachedOutlet}
          </div>
        </>
      }
    >
      <CommitOutlet
        key={location.key}
        outlet={outlet}
        onReady={setCachedOutlet}
      />
    </Suspense>
  );
};

function CommitOutlet({
  outlet,
  onReady,
}: {
  outlet: React.ReactNode;
  onReady: (node: React.ReactNode) => void;
}) {
  useLayoutEffect(() => {
    onReady(outlet);
  }, [outlet, onReady]);

  return <>{outlet}</>;
}

export default StableOutlet;
