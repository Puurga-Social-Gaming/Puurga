import { supabase } from '../lib/supabaseClient';

const INTRO_BUCKET = 'Gif';
export const MOBILE_FILE = 'mbgif.mp4';
export const DESKTOP_FILE = 'Desktopv.mp4';
const SIGNED_URL_TTL_SEC = 3600;
const CACHE_MAX_AGE_MS = (SIGNED_URL_TTL_SEC - 120) * 1000;

const cache = new Map<string, { url: string; at: number }>();
const inflightMap = new Map<string, Promise<string | null>>();

export async function getIntroVideoUrl(
  fileName?: string
): Promise<string | null> {
  const file = fileName ?? MOBILE_FILE;
  const now = Date.now();
  const entry = cache.get(file);

  if (entry && now - entry.at < CACHE_MAX_AGE_MS) {
    return entry.url;
  }

  if (inflightMap.has(file)) return inflightMap.get(file)!;

  const promise = (async () => {
    try {
      const { data, error } = await supabase.storage
        .from(INTRO_BUCKET)
        .createSignedUrl(file, SIGNED_URL_TTL_SEC);

      if (error || !data?.signedUrl) {
        console.error('Failed to get signed URL for intro video:', error);
        return null;
      }

      cache.set(file, { url: data.signedUrl, at: Date.now() });
      return data.signedUrl;
    } finally {
      inflightMap.delete(file);
    }
  })();

  inflightMap.set(file, promise);
  return promise;
}

/** Call at app startup so onboarding video URL is ready before VideoScreen mounts */
export function prefetchIntroVideoUrl(): void {
  if (localStorage.getItem('hasSeenIntro')) return;
  void getIntroVideoUrl(MOBILE_FILE);
}
