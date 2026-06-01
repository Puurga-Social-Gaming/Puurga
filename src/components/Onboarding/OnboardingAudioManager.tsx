import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useOnboardingAudioStore } from '../../store/onboardingAudioStore';
import { getOnboardingAudioUrl } from '../../services/onboardingAudioService';

const FADE_DURATION_MS = 2000;
const FADE_STEPS = 20;
const STEP_INTERVAL_MS = FADE_DURATION_MS / FADE_STEPS;

const OnboardingAudioManager: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);
  // Track whether we've already attempted (and failed) to play
  const hasAttemptedRef = useRef(false);
  const location = useLocation();

  const {
    isEnabled,
    isPlaying,
    isFading,
    playbackBlocked,
    audioUrl,
    setAudioUrl,
    startAudio,
    stopAudio,
    setPlaybackBlocked,
    fadeOutAudio,
  } = useOnboardingAudioStore();

  // ─── INIT: check localStorage, set enabled, fetch URL ─────────────────────
  useEffect(() => {
    // Create the audio element immediately
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }

    const seen = localStorage.getItem('hasSeenIntro');
    const enabled = !seen;
    useOnboardingAudioStore.getState().initialize(enabled);

    if (!enabled) return;

    getOnboardingAudioUrl().then((url) => {
      setAudioUrl(url);
    });

    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  // ─── SET SRC WHEN URL ARRIVES ─────────────────────────────────────────────
  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;
    audioRef.current.src = audioUrl;
    audioRef.current.load();
    hasAttemptedRef.current = false; // reset on new URL
  }, [audioUrl]);

  // ─── ACTUALLY PLAY WHEN isPlaying BECOMES TRUE ────────────────────────────
  useEffect(() => {
    if (!isEnabled || !isPlaying || !audioRef.current || !audioUrl) return;

    const audio = audioRef.current;
    if (!audio.paused) return; // already playing — nothing to do

    audio.volume = 1;
    hasAttemptedRef.current = true;

    audio.play().then(() => {
      // Play succeeded — clear any blocked state
      setPlaybackBlocked(false);
    }).catch(() => {
      // Browser blocked autoplay — wait for user interaction
      setPlaybackBlocked(true);
      // Do NOT call stopAudio() here — keep isPlaying:true so the
      // retry knows audio is "wanted" and will start it on next click
    });
  }, [isPlaying, isEnabled, audioUrl]);

  // ─── RETRY ON FIRST USER INTERACTION (AUTOPLAY BLOCKED) ──────────────────
  useEffect(() => {
    if (!playbackBlocked) return;

    const retry = () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.volume = 1;
      audio.play().then(() => {
        startAudio();
        setPlaybackBlocked(false);
      }).catch(() => {
        // Still blocked — wait for the next click (re-registers itself via effect)
      });
    };

    window.addEventListener('click', retry, { once: true });
    return () => window.removeEventListener('click', retry);
  }, [playbackBlocked]);

  // ─── STOP AUDIO ON NON-ONBOARDING ROUTES ──────────────────────────────────
  useEffect(() => {
    const ONBOARDING_ROUTES = ['/splash', '/onboarding/video', '/onboarding/language', '/onboarding/welcome'];
    if (!ONBOARDING_ROUTES.includes(location.pathname)) {
      if (audioRef.current && !audioRef.current.paused && !isFading) {
        fadeOutAudio();
      }
    }
  }, [location.pathname, isFading]);

  // ─── FADE ENGINE ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFading || !audioRef.current) return;

    const audio = audioRef.current;
    // Ensure we start fade from current volume (may not be at full 1.0)
    const startVol = audio.volume > 0 ? audio.volume : 1;
    const stepDecrement = startVol / FADE_STEPS;

    fadeIntervalRef.current = window.setInterval(() => {
      if (audio.volume > stepDecrement) {
        audio.volume = Math.max(0, audio.volume - stepDecrement);
      } else {
        clearInterval(fadeIntervalRef.current!);
        audio.pause();
        audio.currentTime = 0;
        stopAudio();
      }
    }, STEP_INTERVAL_MS);

    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    };
  }, [isFading]);

  return null;
};

export default OnboardingAudioManager;
