import { supabase } from '../lib/supabaseClient';

const INTRO_BUCKET = 'Gif';
export const MOBILE_FILE = 'mbgif.mp4';
export const DESKTOP_FILE = 'Desktopv.mp4';
const SIGNED_URL_TTL_SEC = 3600;
const CACHE_MAX_AGE_MS = (SIGNED_URL_TTL_SEC - 120) * 1000;
const SESSION_CACHE_KEY = 'puurga_intro_video_urls';

const memoryCache = new Map<string, { url: string; at: number }>();
const inflightMap = new Map<string, Promise<string | null>>();
const warmedUrls = new Set<string>();
let preconnectDone = false;

function readSessionCache(): Record<string, { url: string; at: number }> {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeSessionCache(file: string, url: string): void {
  try {
    const cache = readSessionCache();
    cache[file] = { url, at: Date.now() };
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // sessionStorage may be unavailable
  }
}

function getCachedUrl(file: string): string | null {
  const now = Date.now();
  const mem = memoryCache.get(file);
  if (mem && now - mem.at < CACHE_MAX_AGE_MS) return mem.url;

  const session = readSessionCache()[file];
  if (session && now - session.at < CACHE_MAX_AGE_MS) {
    memoryCache.set(file, session);
    return session.url;
  }
  return null;
}

function storeUrl(file: string, url: string): void {
  memoryCache.set(file, { url, at: Date.now() });
  writeSessionCache(file, url);
}

function ensurePreconnect(): void {
  if (preconnectDone || typeof document === 'undefined') return;
  preconnectDone = true;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (supabaseUrl) {
    const origin = new URL(supabaseUrl).origin;
    for (const rel of ['preconnect', 'dns-prefetch'] as const) {
      if (document.querySelector(`link[rel="${rel}"][href="${origin}"]`)) continue;
      const link = document.createElement('link');
      link.rel = rel;
      link.href = origin;
      if (rel === 'preconnect') link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  }
}

/** Start fetching video bytes into HTTP cache before VideoScreen mounts */
export function warmIntroVideoBuffer(url: string): void {
  if (typeof document === 'undefined' || warmedUrls.has(url)) return;
  warmedUrls.add(url);

  // Hidden video element — browsers don't support rel=preload as=video
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  video.style.cssText = 'position:fixed;width:0;height:0;opacity:0;pointer-events:none';
  document.body.appendChild(video);
  video.load();

  // First ~512 KB — enough to start playback quickly
  void fetch(url, {
    headers: { Range: 'bytes=0-524287' },
    mode: 'cors',
  }).catch(() => {});
}

export function pickIntroVideoFile(): string {
  if (typeof window === 'undefined') return MOBILE_FILE;
  return window.matchMedia('(min-width: 1024px)').matches ? DESKTOP_FILE : MOBILE_FILE;
}

export async function getIntroVideoUrl(
  fileName?: string
): Promise<string | null> {
  ensurePreconnect();

  const file = fileName ?? pickIntroVideoFile();
  const cached = getCachedUrl(file);
  if (cached) {
    warmIntroVideoBuffer(cached);
    return cached;
  }

  if (inflightMap.has(file)) return inflightMap.get(file)!;

  const promise = (async () => {
    try {
      if (!supabase) return null;

      const { data, error } = await supabase.storage
        .from(INTRO_BUCKET)
        .createSignedUrl(file, SIGNED_URL_TTL_SEC);

      if (error || !data?.signedUrl) {
        console.error('Failed to get signed URL for intro video:', error);
        return null;
      }

      storeUrl(file, data.signedUrl);
      warmIntroVideoBuffer(data.signedUrl);
      return data.signedUrl;
    } finally {
      inflightMap.delete(file);
    }
  })();

  inflightMap.set(file, promise);
  return promise;
}

/** Prefetch intro video URL(s) as early as possible */
export function prefetchIntroVideoUrl(): void {
  if (localStorage.getItem('hasSeenIntro')) return;
  ensurePreconnect();

  const primary = pickIntroVideoFile();
  const secondary = primary === DESKTOP_FILE ? MOBILE_FILE : DESKTOP_FILE;

  void getIntroVideoUrl(primary);
  // Secondary variant — low priority, helps if user resizes or cache miss
  setTimeout(() => void getIntroVideoUrl(secondary), 100);
}
