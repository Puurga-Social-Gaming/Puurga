import React, { Suspense, type ComponentType } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { PuurgaGameProps } from './types';
import {
  INTEGRATED_GAME_ROOT_CLASS,
  useIntegratedGameViewportLock,
} from './useViewportLock';
import './mobile.css';

interface GameShellProps extends PuurgaGameProps {
  /** Lazy-loaded game component */
  gameLoader: () => Promise<{ default: ComponentType }>;
  /** Accent color for loading fallback */
  accentColor?: string;
  /** Label shown while loading */
  loadingLabel?: string;
}

const DefaultLoadingFallback: React.FC<{ accent?: string; label?: string }> = ({
  accent = 'text-orange-400',
  label = 'LOADING...',
}) => (
  <div className="flex min-h-screen items-center justify-center bg-neutral-950">
    <div className={`flex flex-col items-center gap-3 ${accent}`}>
      <Loader2 className="h-10 w-10 animate-spin" />
      <p className="text-sm font-mono tracking-widest">{label}</p>
    </div>
  </div>
);

const GameShell: React.FC<GameShellProps> = ({
  onExit,
  gameLoader,
  accentColor = 'text-orange-400',
  loadingLabel = 'LOADING...',
}) => {
  useIntegratedGameViewportLock();

  const GameComponent = React.lazy(gameLoader);

  return (
    <div className={`relative isolate w-full ${INTEGRATED_GAME_ROOT_CLASS}`}>
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          className="absolute top-[max(0.5rem,env(safe-area-inset-top))] left-3 z-[10000] flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-black/80"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Games</span>
        </button>
      )}
      <Suspense
        fallback={<DefaultLoadingFallback accent={accentColor} label={loadingLabel} />}
      >
        <GameComponent />
      </Suspense>
    </div>
  );
};

export default GameShell;
