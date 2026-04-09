import React from 'react';

const PuurgaLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => {

  // Using the 5dLight version for a premium look based on project requirements
  // Using 5dLight (white) for a monochromatic dark theme or when a white logo is requested
  const logoUrl = 'https://vhvxfnxtyrgiydztsonz.supabase.co/storage/v1/object/public/Logos/5dLight.png';

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