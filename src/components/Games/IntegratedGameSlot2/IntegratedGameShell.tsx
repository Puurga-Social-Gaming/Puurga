import React, { Suspense } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { PuurgaGameProps } from '../IntegratedGame/types';
import {
  INTEGRATED_GAME_ROOT_CLASS,
  useIntegratedGameViewportLock,
} from '../useIntegratedGameViewport';
import '../integratedGameMobile.css';

/** Explicit .tsx path avoids stale lazy chunks from old placeholder builds */
const Slot2Game = React.lazy(() => import('../../../games/cyber-runner'));

const GameLoadingFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-neutral-950">
    <div className="flex flex-col items-center gap-3 text-amber-400">
      <Loader2 className="h-10 w-10 animate-spin" />
      <p className="text-sm font-mono tracking-widest">LOADING...</p>
    </div>
  </div>
);

const IntegratedGameShellSlot2: React.FC<PuurgaGameProps> = ({ onExit }) => {
  useIntegratedGameViewportLock();

  return (
    <div className={`relative isolate w-full ${INTEGRATED_GAME_ROOT_CLASS}`}>
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          className="absolute top-[max(0.5rem,env(safe-area-inset-top))] left-3 z-[10000] flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-black/80"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Arena</span>
        </button>
      )}
      <Suspense fallback={<GameLoadingFallback />}>
        <Slot2Game />
      </Suspense>
    </div>
  );
};

export default IntegratedGameShellSlot2;
