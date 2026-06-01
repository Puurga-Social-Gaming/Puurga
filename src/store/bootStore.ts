import { create } from 'zustand';

interface AppBootState {
  stage: 'loading' | 'welcome' | 'done';
  setStage: (stage: 'loading' | 'welcome' | 'done') => void;
}

export const useAppBoot = create<AppBootState>((set) => ({
  stage: 'loading',
  setStage: (stage) => set({ stage }),
}));
