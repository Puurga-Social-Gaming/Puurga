import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

interface ExtraGhostProps {
  id: number;
  emoji: string;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  initialY?: number;
}

const ExtraGhost: React.FC<ExtraGhostProps> = ({ id, emoji, size = 'small', initialY }) => {
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const readViewport = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    readViewport();
    window.addEventListener('resize', readViewport);
    return () => window.removeEventListener('resize', readViewport);
  }, []);

  const getSizeClasses = () => {
    switch (size) {
      case 'tiny': return 'text-2xl md:text-3xl';
      case 'small': return 'text-4xl md:text-5xl';
      case 'medium': return 'text-6xl md:text-7xl';
      case 'large': return 'text-8xl md:text-9xl';
      default: return 'text-4xl md:text-5xl';
    }
  };

  const seed = useMemo(() => ({
    direction: Math.random() < 0.5 ? ('ltr' as const) : ('rtl' as const),
    duration: 16 + Math.random() * 14,
    delay: Math.random() * 2,
    y1: (initialY ?? 0) + (Math.random() * 120 - 60),
    y2: (initialY ?? 0) + (Math.random() * 180 - 90),
    y3: (initialY ?? 0) + (Math.random() * 140 - 70),
    rotateA: 3 + Math.random() * 6,
    rotateB: 5 + Math.random() * 8,
  }), [initialY]);

  if (!viewport) return null;

  const baseY = typeof initialY === 'number'
    ? initialY
    : Math.max(30, Math.min(viewport.h - 30, Math.random() * viewport.h));

  const startX = seed.direction === 'ltr' ? -60 : viewport.w + 60;
  const endX = seed.direction === 'ltr' ? viewport.w + 80 : -80;

  return (
    <motion.div
      initial={{ x: startX, y: baseY, opacity: 0, scale: 0.7 }}
      animate={{
        x: endX,
        y: [baseY, baseY + seed.y1, baseY + seed.y2, baseY + seed.y3, baseY],
        opacity: [0, 0.88, 0.88, 0.88, 0],
        scale: [0.8, 1, 0.96, 1.04, 0.95],
      }}
      transition={{
        duration: seed.duration,
        delay: seed.delay,
        repeat: Infinity,
        repeatDelay: 0,
        ease: 'linear',
      }}
      className="absolute pointer-events-none will-change-transform"
      style={{
        zIndex: 100 + id,
        left: 0,
        top: 0,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <motion.span
        className={getSizeClasses()}
        animate={{
          rotate: [0, seed.rotateA, -seed.rotateB, 0],
          y: [0, -8, 4, -2, 0],
        }}
        transition={{
          rotate: { duration: 9 + Math.random() * 5, repeat: Infinity, ease: 'easeInOut' },
          y: { duration: 5 + Math.random() * 3, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{
          opacity: 0.92,
          filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.6)) drop-shadow(0 0 24px rgba(200,200,255,0.3)) contrast(1.1) saturate(1.1)',
          display: 'inline-block',
        }}
      >
        {emoji}
      </motion.span>
    </motion.div>
  );
};

interface ExtraGhostsProps {
  count?: number;
}

const ExtraGhosts: React.FC<ExtraGhostsProps> = ({ count = 12 }) => {
  const ghostEmojis = ['👻', '💀', '🦇', '🕷️', '🕸️', '🌙', '⚰️', '🔮'];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-19">
      {Array.from({ length: count }, (_, i) => (
        <ExtraGhost
          key={i}
          id={100 + i}
          emoji={ghostEmojis[i % ghostEmojis.length]}
          size={['tiny', 'small', 'medium', 'large'][i % 4] as any}
          initialY={Math.max(20, Math.min(window.innerHeight - 20, (i * 60) % window.innerHeight))}
        />
      ))}
    </div>
  );
};

export default ExtraGhosts;
