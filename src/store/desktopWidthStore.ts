import { create } from 'zustand';

export type DesktopWidthMode = 'compact' | 'full';

interface DesktopWidthState {
  mode: DesktopWidthMode;
  setMode: (mode: DesktopWidthMode) => void;
  toggleMode: () => void;
}

const STORAGE_KEY = 'puurga_desktop_width';

function getStoredMode(): DesktopWidthMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'compact' || stored === 'full') return stored;
  } catch {
    // ignore
  }
  return 'compact'; // 80% default on desktop
}

function applyDesktopWidth(mode: DesktopWidthMode) {
  const root = document.documentElement;
  root.setAttribute('data-desktop-width', mode);
  root.classList.toggle('desktop-width-compact', mode === 'compact');
  root.classList.toggle('desktop-width-full', mode === 'full');
}

applyDesktopWidth(getStoredMode());

export const useDesktopWidthStore = create<DesktopWidthState>((set, get) => ({
  mode: getStoredMode(),
  setMode: (mode) => {
    applyDesktopWidth(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
    set({ mode });
  },
  toggleMode: () => {
    const next: DesktopWidthMode = get().mode === 'compact' ? 'full' : 'compact';
    get().setMode(next);
  },
}));
