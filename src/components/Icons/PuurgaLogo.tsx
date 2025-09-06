import React from 'react';

const PuurgaLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M85 15 C85 15, 70 30, 70 30 L50 50 L30 70 C30 70, 15 85, 15 85"
      stroke="currentColor"
      strokeWidth="8"
      fill="none"
      strokeLinecap="round"
      className="stroke-current"
    />
    <path
      d="M85 15 L85 40"
      stroke="currentColor"
      strokeWidth="8"
      fill="none"
      strokeLinecap="round"
      className="stroke-current"
    />
  </svg>
);

export default PuurgaLogo;