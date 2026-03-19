import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

interface FlyingGhostProps {
  id: number;
  ghostImage: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  initialX?: number;
  initialY?: number;
}

const FlyingGhost: React.FC<FlyingGhostProps> = ({
  id,
  ghostImage,
  size = 'large',
  initialX,
  initialY
}) => {
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const readViewport = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    readViewport();
    window.addEventListener('resize', readViewport);
    return () => window.removeEventListener('resize', readViewport);
  }, []);

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-32 h-32 md:w-40 md:h-40';
      case 'medium':
        return 'w-48 h-48 md:w-56 md:h-56';
      case 'large':
        return 'w-64 h-64 md:w-72 md:h-72';
      case 'xlarge':
        return 'w-80 h-80 md:w-96 md:h-96';
      default:
        return 'w-64 h-64 md:w-72 md:h-72';
    }
  };

  const sizeClasses = getSizeClasses();

  const seed = useMemo(() => {
    return {
      direction: Math.random() < 0.5 ? 'ltr' as const : 'rtl' as const,
      duration: 14 + Math.random() * 12,
      delay: Math.random() * 1.5,
      y1: (initialY ?? 0) + (Math.random() * 160 - 80),
      y2: (initialY ?? 0) + (Math.random() * 240 - 120),
      y3: (initialY ?? 0) + (Math.random() * 200 - 100),
      rotateA: 4 + Math.random() * 5,
      rotateB: 6 + Math.random() * 7,
    };
  }, [initialY]);

  if (!viewport) return null;

  const baseY = typeof initialY === 'number'
    ? initialY
    : Math.max(40, Math.min(viewport.h - 40, Math.random() * viewport.h));

  const startX = typeof initialX === 'number'
    ? initialX
    : (seed.direction === 'ltr' ? -220 : viewport.w + 220);

  const endX = seed.direction === 'ltr'
    ? viewport.w + 240
    : -240;

  return (
    <motion.div
      initial={{ x: startX, y: baseY, opacity: 0, scale: 0.85 }}
      animate={{
        x: endX,
        y: [baseY, baseY + seed.y1, baseY + seed.y2, baseY + seed.y3, baseY],
        opacity: [0, 0.95, 0.95, 0.95, 0],
        scale: [0.9, 1, 0.98, 1.02, 0.95]
      }}
      transition={{
        duration: seed.duration,
        delay: seed.delay,
        repeat: Infinity,
        repeatDelay: 0,
        ease: "linear"
      }}
      className="absolute pointer-events-none will-change-transform"
      style={{
        zIndex: 100 + id,
        left: 0,
        top: 0,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <motion.img
        src={ghostImage}
        alt="Floating ghost"
        className={`${sizeClasses} object-contain`}
        animate={{
          rotate: [0, seed.rotateA, -seed.rotateB, 0],
          y: [0, -10, 6, -4, 0]
        }}
        transition={{
          rotate: { duration: 10 + Math.random() * 6, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 6 + Math.random() * 4, repeat: Infinity, ease: "easeInOut" }
        }}
        style={{
          opacity: 0.98,
          filter: `drop-shadow(0 0 ${14 + id * 2}px rgba(255, 255, 255, 0.95))
                  drop-shadow(0 0 ${28 + id * 3}px rgba(180, 180, 255, 0.55))
                  contrast(1.15) saturate(1.05)`,
          mixBlendMode: 'normal'
        }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          console.warn(`Ghost image failed to load: ${ghostImage}`);
        }}
      />
    </motion.div>
  );
};

export default FlyingGhost;
