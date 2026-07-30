import React, { Suspense, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { PuurgaGameProps } from './types';
import { PURGA_RIFT_STYLES, PURGA_RIFT_STYLES_ID } from './riftGameStyles';
import {
  INTEGRATED_GAME_ROOT_CLASS,
  useIntegratedGameViewportLock,
} from '../useIntegratedGameViewport';
import '../integratedGameMobile.css';

const PurgaRiftGame = React.lazy(() => import('../../../games/purga-rift'));

const GameLoadingFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-neutral-950">
    <div className="flex flex-col items-center gap-3 text-violet-400">
      <Loader2 className="h-10 w-10 animate-spin" />
      <p className="text-sm font-mono tracking-widest">OPENING RIFT...</p>
    </div>
  </div>
);

const IntegratedGameShell: React.FC<PuurgaGameProps> = ({ onExit }) => {
  useIntegratedGameViewportLock();

  useEffect(() => {
    if (document.getElementById(PURGA_RIFT_STYLES_ID)) return;
    const style = document.createElement('style');
    style.id = PURGA_RIFT_STYLES_ID;
    style.textContent = PURGA_RIFT_STYLES;
    document.head.appendChild(style);
    return () => {
      document.getElementById(PURGA_RIFT_STYLES_ID)?.remove();
    };
  }, []);

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
      <Suspense fallback={<GameLoadingFallback />}>
        <PurgaRiftGame />
      </Suspense>
    </div>
  );
};

export default IntegratedGameShell;
