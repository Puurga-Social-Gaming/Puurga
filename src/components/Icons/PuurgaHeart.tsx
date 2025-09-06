import React from 'react';

const PuurgaHeart: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 100 100"
    className={className}
    fill="none"
    stroke="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M85 15 C85 15, 70 30, 70 30 L50 50 L30 70 C30 70, 15 85, 15 85"
      strokeWidth="8"
      strokeLinecap="round"
    />
    <path
      d="M85 15 L85 40"
      strokeWidth="8"
      strokeLinecap="round"
    />
  </svg>
);

export default PuurgaHeart;