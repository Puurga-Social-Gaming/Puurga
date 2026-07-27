import { getMessageRingtone, MESSAGE_RINGTONES } from '../config/messageRingtones';
import { useMessageRingtoneStore } from '../store/messageRingtoneStore';

/** One Audio element per ringtone URL so switching always plays the right clip. */
const audioByUrl = new Map<string, HTMLAudioElement>();
let audioCtx: AudioContext | null = null;
let lastPlayedAt = 0;
let unlocked = false;
let playGeneration = 0;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

function getAudio(url: string): HTMLAudioElement {
  let audio = audioByUrl.get(url);
  if (!audio) {
    audio = new Audio(url);
    audio.preload = 'auto';
    audioByUrl.set(url, audio);
  }
  return audio;
}

function stopAllExcept(keepUrl?: string): void {
  for (const [url, audio] of audioByUrl) {
    if (url === keepUrl) continue;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore
    }
  }
}

function playBipFallback(): void {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();

    const playTone = (freq: number, start: number, duration: number, peak: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    };

    playTone(880, 0, 0.12, 0.14);
    playTone(1174.66, 0.1, 0.14, 0.11);
  } catch {
    // ignore
  }
}

function waitUntilReady(audio: HTMLAudioElement, timeoutMs = 2500): Promise<boolean> {
  if (audio.readyState >= 2) return Promise.resolve(true);

  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      audio.removeEventListener('canplaythrough', onOk);
      audio.removeEventListener('loadeddata', onOk);
      audio.removeEventListener('error', onErr);
      window.clearTimeout(timer);
      resolve(ok);
    };
    const onOk = () => finish(true);
    const onErr = () => finish(false);
    audio.addEventListener('canplaythrough', onOk, { once: true });
    audio.addEventListener('loadeddata', onOk, { once: true });
    audio.addEventListener('error', onErr, { once: true });
    try {
      audio.load();
    } catch {
      finish(false);
      return;
    }
    const timer = window.setTimeout(() => finish(audio.readyState >= 2), timeoutMs);
  });
}

async function playUrl(url: string, generation: number): Promise<void> {
  stopAllExcept(url);
  const audio = getAudio(url);
  audio.muted = false;
  audio.volume = 0.9;

  const ready = await waitUntilReady(audio);
  if (generation !== playGeneration) return; // a newer play superseded this one

  if (!ready) {
    playBipFallback();
    return;
  }

  try {
    audio.currentTime = 0;
  } catch {
    // ignore seek errors before metadata
  }

  try {
    await audio.play();
  } catch {
    // One retry after tiny delay (autoplay / race)
    await new Promise((r) => window.setTimeout(r, 80));
    if (generation !== playGeneration) return;
    try {
      audio.currentTime = 0;
      await audio.play();
    } catch {
      playBipFallback();
    }
  }
}

/** Unlock autoplay after a user gesture (click / key / touch). */
export function unlockMessageSound(): void {
  try {
    const ctx = getCtx();
    if (ctx?.state === 'suspended') void ctx.resume();

    // Touch every cached element once muted so later plays are allowed
    const { ringtoneId } = useMessageRingtoneStore.getState();
    const primary = getMessageRingtone(ringtoneId).url;
    const urls = new Set<string>([primary, ...MESSAGE_RINGTONES.map((r) => r.url)]);

    for (const url of urls) {
      const audio = getAudio(url);
      if (audio.readyState === 0) {
        try {
          audio.load();
        } catch {
          // ignore
        }
      }
    }

    const probe = getAudio(primary);
    const wasMuted = probe.muted;
    probe.muted = true;
    probe.volume = 0.001;
    const p = probe.play();
    const finish = () => {
      unlocked = true;
      try {
        probe.pause();
        probe.currentTime = 0;
      } catch {
        // ignore
      }
      probe.muted = wasMuted;
      probe.volume = 0.9;
    };
    if (p && typeof p.then === 'function') {
      void p.then(finish).catch(() => {
        unlocked = true;
        probe.muted = false;
        probe.volume = 0.9;
      });
    } else {
      finish();
    }
  } catch {
    unlocked = true;
  }
}

if (typeof window !== 'undefined') {
  const unlock = () => unlockMessageSound();
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
}

/**
 * Play the selected ringtone.
 * Pass `ringtoneId` to preview a specific tone; otherwise uses the saved preference.
 */
export function playMessageSound(options?: {
  force?: boolean;
  ringtoneId?: string;
}): void {
  const { enabled, ringtoneId } = useMessageRingtoneStore.getState();
  if (!options?.force && !enabled) return;

  const now = Date.now();
  // Previews always play; alerts are debounced lightly
  if (!options?.force && now - lastPlayedAt < 900) return;
  lastPlayedAt = now;

  const ringtone = getMessageRingtone(options?.ringtoneId || ringtoneId);
  const generation = ++playGeneration;

  try {
    const ctx = getCtx();
    if (ctx?.state === 'suspended') void ctx.resume();
  } catch {
    // ignore
  }

  if (!unlocked) {
    unlockMessageSound();
  }

  void playUrl(ringtone.url, generation);
}

/** Prefetch all ringtones so selection switches instantly. */
export function preloadAllRingtones(): void {
  for (const r of MESSAGE_RINGTONES) {
    const audio = getAudio(r.url);
    if (audio.readyState === 0) {
      try {
        audio.load();
      } catch {
        // ignore
      }
    }
  }
}
