import { useEffect } from 'react';

/** Prevents Games / app shell from scrolling behind embedded games */
export function useIntegratedGameViewportLock(): void {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyHeight = body.style.height;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.height = '100%';

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.height = prevBodyHeight;
    };
  }, []);
}

export const INTEGRATED_GAME_ROOT_CLASS = 'puurga-integrated-game';
