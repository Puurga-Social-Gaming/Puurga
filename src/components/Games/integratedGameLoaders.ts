import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { IntegratedSlotId } from '../../games/catalog';
import type { PuurgaGameProps } from './IntegratedGame/types';

type IntegratedShell = ComponentType<PuurgaGameProps>;

export function loadIntegratedGameShell(
  slot: IntegratedSlotId,
): Promise<{ default: IntegratedShell }> {
  switch (slot) {
    case 'rift':
      return import('./IntegratedGame/IntegratedGameShell');
    case 'slot2':
      return import('./IntegratedGameSlot2/IntegratedGameShell');
    default:
      return import('./IntegratedGameSlot2/IntegratedGameShell');
  }
}

export function createIntegratedLazy(
  slot: IntegratedSlotId,
): LazyExoticComponent<IntegratedShell> {
  return lazy(() => loadIntegratedGameShell(slot));
}
