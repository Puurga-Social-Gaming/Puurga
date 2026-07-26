import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import puurgeWhite from '../../puurge_img/puurge_white.png';

/** Original purge mark (light theme — leave as-is) */
const PURGE_ORIGINAL =
  'https://vhvxfnxtyrgiydztsonz.supabase.co/storage/v1/object/public/icons/purge.png';

interface PurgeIconProps {
  size?: number;
  className?: string;
}

/**
 * Light theme: original purge.png (unchanged).
 * Dark theme: local white scythe mark.
 */
const PurgeIcon: React.FC<PurgeIconProps> = ({ size = 14, className = '' }) => {
  const { theme } = useTheme();
  const src = theme === 'dark' ? puurgeWhite : PURGE_ORIGINAL;

  return (
    <img
      src={src}
      alt="Purge"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
};

export default PurgeIcon;
