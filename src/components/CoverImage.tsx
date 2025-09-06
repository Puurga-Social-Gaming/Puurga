import React from 'react';
import { DEFAULT_COVER } from './DefaultImages';

interface CoverImageProps {
  src?: string;
  alt: string;
  className?: string;
}

const CoverImage: React.FC<CoverImageProps> = ({ src, alt, className = '' }) => {
  return (
    <div 
      className={`h-32 md:h-48 rounded-lg bg-cover bg-center bg-[#2d2d2d] ${className}`}
      style={{ 
        backgroundImage: `url(${src || DEFAULT_COVER})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover'
      }}
      role="img"
      aria-label={alt}
    />
  );
};

export default CoverImage; 