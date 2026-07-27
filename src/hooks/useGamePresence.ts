import { useEffect, useRef } from 'react';
import {
  setGamePresence,
  clearGamePresence,
  heartbeatGamePresence,
} from '../services/challengeService';

/** Announce "Playing {game}" to friends while a game view is open. */
export function useGamePresence(gameId: string | null, gameTitle?: string, active = true) {
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (!gameId || !active) return;

    let alive = true;
    void setGamePresence(gameId, gameTitle).catch(() => null);

    const beat = window.setInterval(() => {
      if (!alive || !activeRef.current) return;
      void heartbeatGamePresence().catch(() => null);
    }, 30000);

    return () => {
      alive = false;
      window.clearInterval(beat);
      void clearGamePresence().catch(() => null);
    };
  }, [gameId, gameTitle, active]);
}
