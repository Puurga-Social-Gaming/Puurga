import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface FloatingParticleProps {
}

const FloatingParticle: React.FC<FloatingParticleProps> = () => {
  const [position, setPosition] = useState({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition(prev => ({
        x: prev.x + (Math.random() - 0.5) * 20,
        y: prev.y + (Math.random() - 0.5) * 20
      }));
    }, 2000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="absolute w-1 h-1 bg-white rounded-full opacity-60"
      animate={{
        x: position.x,
        y: position.y,
        opacity: [0.3, 0.8, 0.3],
        scale: [0.5, 1, 0.5]
      }}
      transition={{
        duration: 4 + Math.random() * 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      style={{
        left: 0,
        top: 0,
        filter: 'blur(0.5px)',
        zIndex: 50
      }}
    />
  );
};

interface FloatingParticlesProps {
  count?: number;
}

const FloatingParticles: React.FC<FloatingParticlesProps> = ({ count = 30 }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <FloatingParticle key={i} />
      ))}
    </div>
  );
};

export default FloatingParticles;
