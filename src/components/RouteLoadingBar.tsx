import React from 'react';

const RouteLoadingBar: React.FC = () => (
  <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] overflow-hidden bg-transparent">
    <div className="h-full w-full bg-gradient-to-r from-transparent via-accent to-transparent animate-pulse" />
  </div>
);

export default RouteLoadingBar;
