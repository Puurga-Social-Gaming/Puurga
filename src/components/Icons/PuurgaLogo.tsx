import React from 'react';

const PuurgaLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => {

  // Using the 3D version for a premium look
  // Using 3dLight (black/white) for a monochromatic theme
  const logoUrl = 'https://vhvxfnxtyrgiydztsonz.supabase.co/storage/v1/object/public/Logos/3dLight.png';

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