import { supabase } from '../lib/supabaseClient';

const FALLBACK_AUDIO = '/audio-assets/onboarding/intro-default.mp3';

export async function getOnboardingAudioUrl(): Promise<string> {
  if (!supabase) return FALLBACK_AUDIO;

  try {
    const { data } = supabase.storage
      .from('Audio')
      .getPublicUrl('audio-assets/onboarding/intro-default.mp3');

    return data?.publicUrl || FALLBACK_AUDIO;
  } catch {
    return FALLBACK_AUDIO;
  }
}

// Legacy object-style alias so old imports don't break during migration
export const onboardingAudioService = {
  getAudioUrl: getOnboardingAudioUrl,
};
