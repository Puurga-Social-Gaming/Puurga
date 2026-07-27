import { create } from 'zustand';

export type FontSizeOption = 'small' | 'medium' | 'large';

interface FontSizeState {
  fontSize: FontSizeOption;
  setFontSize: (size: FontSizeOption) => void;
}

const FONT_SCALE_MAP: Record<FontSizeOption, number> = {
  small: 0.875,
  medium: 1,
  large: 1.125,
};

const STORAGE_KEY = 'puurga_font_size';

function getStoredFontSize(): FontSizeOption {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'small' || stored === 'medium' || stored === 'large') return stored;
  } catch {
    // ignore read errors
  }
  return 'large';
}

function applyFontScale(size: FontSizeOption) {
  const scale = FONT_SCALE_MAP[size];
  document.documentElement.style.setProperty('--font-scale', String(scale));
  document.documentElement.setAttribute('data-font-size', size);
}

// Apply on module load so the stored preference takes effect immediately
applyFontScale(getStoredFontSize());

export const useFontSizeStore = create<FontSizeState>((set) => ({
  fontSize: getStoredFontSize(),
  setFontSize: (size: FontSizeOption) => {
    applyFontScale(size);
    try {
      localStorage.setItem(STORAGE_KEY, size);
    } catch {
      // ignore write errors
    }
    set({ fontSize: size });
  },
}));
