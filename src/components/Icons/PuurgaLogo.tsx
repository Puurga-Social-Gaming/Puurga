import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const PuurgaLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => {
  const { theme } = useTheme();

  // Using the 3D version for a premium look
  // 3dDark is the orange version (looks good on dark), 3dLight is the black version (looks good on light)
  const logoUrl = theme === 'dark'
    ? 'https://vhvxfnxtyrgiydztsonz.supabase.co/storage/v1/object/public/Logos/3dDark.png'
    : 'https://vhvxfnxtyrgiydztsonz.supabase.co/storage/v1/object/public/Logos/3dLight.png';

  return (
    <img
      src={logoUrl}
      alt="Puurga"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export default PuurgaLogo;