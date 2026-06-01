import { create } from 'zustand';

interface State {
  isEnabled: boolean;
  isPlaying: boolean;
  isFading: boolean;
  playbackBlocked: boolean;
  audioUrl: string | null;

  initialize: (enabled: boolean) => void;
  setAudioUrl: (url: string) => void;

  startAudio: () => void;
  fadeOutAudio: () => void;
  stopAudio: () => void;

  setPlaybackBlocked: (v: boolean) => void;
}

export const useOnboardingAudioStore = create<State>((set, get) => ({
  isEnabled: false,
  isPlaying: false,
  isFading: false,
  playbackBlocked: false,
  audioUrl: null,

  initialize: (enabled) => set({ isEnabled: enabled }),

  setAudioUrl: (url) => set({ audioUrl: url }),

  startAudio: () => {
    const state = get();
    if (state.isPlaying || state.isFading) return;
    set({ isPlaying: true, isFading: false });
  },

  fadeOutAudio: () => {
    const state = get();
    if (state.isFading || !state.isPlaying) return;
    set({ isFading: true });
  },

  stopAudio: () =>
    set({
      isPlaying: false,
      isFading: false,
      playbackBlocked: false,
    }),

  setPlaybackBlocked: (v) => set({ playbackBlocked: v }),
}));

// Legacy alias so old imports don't break during migration
export const useOnboardingAudio = useOnboardingAudioStore;
