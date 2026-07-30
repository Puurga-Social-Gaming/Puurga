import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingAudioStore } from '../../store/onboardingAudioStore';
import {
  getIntroVideoUrl,
  MOBILE_FILE,
  DESKTOP_FILE,
} from '../../services/introVideoService';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const EXIT_FADE_MS = 200;

const VideoScreen = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const proceedLocked = useRef(false);
  const playbackStarted = useRef(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const videoFile = isDesktop ? DESKTOP_FILE : MOBILE_FILE;

  const proceedToNext = useCallback(async () => {
    if (proceedLocked.current) return;
    proceedLocked.current = true;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setIsExiting(true);
    useOnboardingAudioStore.getState().startAudio();

    setTimeout(() => {
      navigate('/onboarding/gif');
    }, EXIT_FADE_MS);
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    getIntroVideoUrl(videoFile).then((url) => {
      if (cancelled) return;
      if (url) {
        setVideoUrl(url);
      } else {
        proceedToNext();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [videoFile, proceedToNext]);

  useEffect(() => {
    playbackStarted.current = false;
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    let disposed = false;
    let removeTapListener: (() => void) | undefined;

    const requestFs = () => {
      if (isDesktop && !document.fullscreenElement) {
        video.requestFullscreen().catch(() => {});
      }
    };

    const enableSoundAndFs = () => {
      video.muted = false;
      video.volume = 1;
      void video.play();
      requestFs();
    };

    const startPlayback = () => {
      if (disposed || playbackStarted.current) return;
      playbackStarted.current = true;

      video.muted = true;
      video.volume = 1;

      void video.play().catch(() => {
        // Autoplay blocked — unmute + fullscreen only after user gesture
      });

      document.addEventListener('pointerdown', enableSoundAndFs, { once: true });
      removeTapListener = () =>
        document.removeEventListener('pointerdown', enableSoundAndFs);
    };

    // canplay = enough buffered to start — much faster than canplaythrough
    const onCanPlay = () => startPlayback();
    const onEnded = () => proceedToNext();
    const onError = () => {
      console.error('Intro video failed to load or play');
      proceedToNext();
    };

    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);

    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      startPlayback();
    } else {
      video.load();
    }

    return () => {
      disposed = true;
      if (removeTapListener) removeTapListener();
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
    };
  }, [videoUrl, proceedToNext, isDesktop]);

  const videoProps = {
    ref: videoRef,
    src: videoUrl ?? undefined,
    autoPlay: true as const,
    muted: true,
    playsInline: true,
    preload: 'auto' as const,
    disablePictureInPicture: true,
  };

  return (
    <div
      className="fixed inset-0"
      style={{
        backgroundColor: 'rgb(var(--bg))',
        color: 'rgb(var(--fg))',
        opacity: isExiting ? 0 : 1,
        transition: `opacity ${EXIT_FADE_MS}ms ease-in-out`,
      }}
    >
      <video
        {...videoProps}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default VideoScreen;
