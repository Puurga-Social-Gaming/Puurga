import React from 'react';
import PuurgaLogo from '../Icons/PuurgaLogo';

interface BootLoaderProps {
  /** When true the overlay fades out instead of vanishing instantly */
  fadeOut?: boolean;
}

/** Branded splash while the app bundle initializes — intro video plays on /onboarding/video */
const BootLoader: React.FC<BootLoaderProps> = ({ fadeOut = false }) => {
  return (
    <div
      id="boot-loader"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        backgroundColor: '#000',
        transition: fadeOut ? 'opacity 0.5s ease-out' : undefined,
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'auto',
        overflow: 'hidden',
      }}
    >
      <PuurgaLogo size={72} className="text-white animate-pulse" />
      <p className="text-white/60 text-sm tracking-widest uppercase">Puurga</p>
    </div>
  );
};

export default BootLoader;
