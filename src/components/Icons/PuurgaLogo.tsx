import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import logoDark from '../../puurge_img/logo_dark.png';
import logoLight from '../../puurge_img/puurge_white.png';

interface PuurgaLogoProps {
  size?: number;
  className?: string;
}

/**
 * Light theme: local dark mark.
 * Dark theme: local white mark.
 */
const PuurgaLogo: React.FC<PuurgaLogoProps> = ({ size = 32, className = '' }) => {
  const { theme } = useTheme();
  const src = theme === 'light' ? logoDark : logoLight;

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
