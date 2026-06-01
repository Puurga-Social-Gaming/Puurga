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

  const proceedToNext = useCallback(() => {
    if (proceedLocked.current) return;
    proceedLocked.current = true;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setIsExiting(true);
    useOnboardingAudioStore.getState().startAudio();
    setTimeout(() => {
      navigate('/onboarding/language');
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

    const startPlayback = () => {
      if (disposed || playbackStarted.current) return;
      playbackStarted.current = true;

      video.volume = 1;
      video.muted = true;

      video
        .play()
        .then(() => {
          if (!disposed) video.muted = false;
        })
        .catch(() => {
          const unmuteOnTap = () => {
            video.muted = false;
            video.volume = 1;
            void video.play();
          };
          document.addEventListener('pointerdown', unmuteOnTap, { once: true });
          removeTapListener = () =>
            document.removeEventListener('pointerdown', unmuteOnTap);
        });
    };

    const onCanPlayThrough = () => {
      startPlayback();
      requestFs();
    };
    const onEnded = () => proceedToNext();
    const onError = () => {
      console.error('Intro video failed to load or play');
      proceedToNext();
    };

    video.addEventListener('canplaythrough', onCanPlayThrough);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);

    if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      startPlayback();
      requestFs();
    }

    return () => {
      disposed = true;
      if (removeTapListener) removeTapListener();
      video.removeEventListener('canplaythrough', onCanPlayThrough);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
    };
  }, [videoUrl, proceedToNext, isDesktop]);

  return (
    <div
      className={isDesktop ? 'fixed inset-0' : 'min-h-screen flex flex-col items-center justify-center p-4'}
      style={{
        backgroundColor: 'rgb(var(--bg))',
        color: 'rgb(var(--fg))',
        opacity: isExiting ? 0 : 1,
        transition: `opacity ${EXIT_FADE_MS}ms ease-in-out`,
      }}
    >
      {isDesktop ? (
        <video
          ref={videoRef}
          src={videoUrl ?? undefined}
          className="w-full h-full object-cover"
          playsInline
          preload="auto"
          disablePictureInPicture
        />
      ) : (
        <div className="w-full mx-auto max-w-sm aspect-[9/16]">
          <video
            ref={videoRef}
            src={videoUrl ?? undefined}
            className="w-full h-full rounded-xl object-contain"
            playsInline
            preload="auto"
            disablePictureInPicture
          />
        </div>
      )}
    </div>
  );
};

export default VideoScreen;
