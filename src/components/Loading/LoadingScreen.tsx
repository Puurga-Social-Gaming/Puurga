import React from 'react';
import PuurgaLogo from '../Icons/PuurgaLogo';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center">
      <div className="relative">
        <PuurgaLogo size={64} className="animate-bounce text-foreground" />
        <div className="absolute -inset-4 bg-foreground/5 rounded-full blur-xl animate-pulse" />
      </div>
      <div className="mt-8 space-y-3">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-foreground text-2xl font-bold tracking-wider animate-pulse">
          PUURGA
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
