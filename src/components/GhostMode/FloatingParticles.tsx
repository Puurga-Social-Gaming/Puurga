import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface FloatingParticleProps {
  id: number;
  seed: {
    duration: number;
    delay: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    size: number;
  };
}

const FloatingParticle: React.FC<FloatingParticleProps> = ({ seed }) => {
  return (
    <motion.div
      className="absolute rounded-full bg-white"
      initial={{ x: seed.startX, y: seed.startY, opacity: 0, scale: 0.5 }}
      animate={{
        x: seed.endX,
        y: seed.endY,
        opacity: [0, 0.7, 0.7, 0.3, 0],
        scale: [0.6, 1, 0.9, 0.7, 0.5]
      }}
      transition={{
        duration: seed.duration,
        delay: seed.delay,
        repeat: Infinity,
        repeatDelay: 0,
        ease: 'linear'
      }}
      style={{
        left: 0,
        top: 0,
        width: seed.size,
        height: seed.size,
        filter: 'blur(0.8px) brightness(1.6)',
        zIndex: 12
      }}
    />
  );
};

interface FloatingParticlesProps {
  count?: number;
}

const FloatingParticles: React.FC<FloatingParticlesProps> = ({ count = 60 }) => {
  const viewport = useMemo(() => ({ w: window.innerWidth, h: window.innerHeight }), []);

  const seeds = useMemo(() => {
    return Array.from({ length: count }, () => {
      const dir = Math.random() < 0.5 ? 'ltr' : 'rtl';
      const startX = dir === 'ltr' ? -10 : viewport.w + 10;
      const endX = dir === 'ltr' ? viewport.w + 10 : -10;
      return {
        duration: 18 + Math.random() * 14,
        delay: Math.random() * 4,
        startX,
        startY: Math.random() * viewport.h,
        endX,
        endY: Math.random() * viewport.h,
        size: 1.5 + Math.random() * 2.5,
      };
    });
  }, [count, viewport]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-12">
      {seeds.map((seed, index) => (
        <FloatingParticle key={index} id={index} seed={seed} />
      ))}
    </div>
  );
};

export default FloatingParticles;
