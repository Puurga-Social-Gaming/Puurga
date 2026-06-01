import { supabase } from '../lib/supabaseClient';

export async function getOnboardingAudioUrl(): Promise<string> {
  const { data } = supabase.storage
    .from('Audio')
    .getPublicUrl('audio-assets/onboarding/intro-default.mp3');

  return data.publicUrl;
}

// Legacy object-style alias so old imports don't break during migration
export const onboardingAudioService = {
  getAudioUrl: getOnboardingAudioUrl,
};
