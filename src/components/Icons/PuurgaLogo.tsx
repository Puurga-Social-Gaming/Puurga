import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import logoDark from '../../puurge_img/logo_dark.png';

/** Original brand mark (used for dark theme header) */
const LOGO_ORIGINAL =
  'https://vhvxfnxtyrgiydztsonz.supabase.co/storage/v1/object/public/Logos/5dLight.png';

interface PuurgaLogoProps {
  size?: number;
  className?: string;
}

/**
 * Light theme: local dark mark (already good — do not change).
 * Dark theme: original remote logo from the start.
 */
const PuurgaLogo: React.FC<PuurgaLogoProps> = ({ size = 32, className = '' }) => {
  const { theme } = useTheme();
  const src = theme === 'light' ? logoDark : LOGO_ORIGINAL;

  return (
    <img
      src={src}
      alt="Puurga"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
};

export default PuurgaLogo;
