import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const VIDEO_URL =
  'https://vhvxfnxtyrgiydztsonz.supabase.co/storage/v1/object/sign/Gif/mbgif.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85MDhmM2I5Ni1jYmVmLTQ1OWYtYjhlOC01ZGNhYjU3NWQ2YTkiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJHaWYvbWJnaWYubXA0Iiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4NTQxMTk0OSwiZXhwIjoxODE2OTQ3OTQ5fQ.DSVmdlGwRwStRhYnVDsocXDsK4gZ-Dcwasu7pKhjh_s';

const EXIT_FADE_MS = 400;

const GifScreen: React.FC = () => {
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [exiting, setExiting] = useState(false);
  const proceedLocked = useRef(false);

  // Desktop users skip entirely
  useEffect(() => {
    if (isDesktop) {
      navigate('/onboarding/language');
    }
  }, [isDesktop, navigate]);

  const proceed = () => {
    if (proceedLocked.current) return;
    proceedLocked.current = true;
    setExiting(true);
    setTimeout(() => navigate('/onboarding/language'), EXIT_FADE_MS);
  };

  useEffect(() => {
    if (isDesktop) return;

    const video = videoRef.current;
    if (!video) return;

    const onEnded = () => proceed();
    const onError = () => proceed();

    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);

    video.play().catch(() => {});

    return () => {
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
    };
  }, [isDesktop]);

  const handleTap = () => {
    proceed();
  };

  if (isDesktop) return null;

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        backgroundColor: '#000',
        opacity: exiting ? 0 : 1,
        transition: `opacity ${EXIT_FADE_MS}ms ease-in-out`,
        cursor: 'pointer',
      }}
      onClick={handleTap}
    >
      <video
        ref={videoRef}
        src={VIDEO_URL}
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default GifScreen;
