import React from 'react';
import { motion } from 'framer-motion';

const SpiderWebOverlay: React.FC = () => {
  const webs = [
    { id: 1, x: 0, y: 0, scale: 0.8, rotation: -12 },
    { id: 2, x: '100%', y: 0, scale: 0.6, rotation: 12 },
    { id: 3, x: 0, y: '100%', scale: 0.7, rotation: 8 },
    { id: 4, x: '100%', y: '100%', scale: 0.5, rotation: -8 },
    { id: 5, x: '25%', y: '15%', scale: 0.35, rotation: -4 },
    { id: 6, x: '75%', y: '85%', scale: 0.4, rotation: 5 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none z-15">
      {webs.map(web => (
        <motion.div
          key={web.id}
          className="absolute"
          style={{
            left: web.x,
            top: web.y,
            transform: `translate(-50%, -50%) scale(${web.scale}) rotate(${web.rotation}deg)`,
          }}
          animate={{
            opacity: [0.25, 0.6, 0.3],
            scale: [web.scale * 0.95, web.scale, web.scale * 0.97],
          }}
          transition={{
            duration: 10 + web.id * 2,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        >
          <svg
            width="220"
            height="220"
            viewBox="0 0 220 220"
            className="opacity-70"
            style={{
              filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.2))',
            }}
          >
            <defs>
              <radialGradient id={`web-${web.id}`}>
                <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
              </radialGradient>
            </defs>
            {/* Main radial lines */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
              const rad = (angle * Math.PI) / 180;
              const x2 = 110 + 100 * Math.cos(rad);
              const y2 = 110 + 100 * Math.sin(rad);
              return (
                <line
                  key={angle}
                  x1="110"
                  y1="110"
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="0.8"
                />
              );
            })}
            {/* Concentric circles */}
            {[30, 50, 70, 90].map(r => (
              <circle
                key={r}
                cx="110"
                cy="110"
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="0.6"
                strokeDasharray="3 6"
              />
            ))}
            {/* Random connecting threads */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const r1 = 30 + (i % 3) * 20;
              const r2 = r1 + 20;
              return (
                <line
                  key={`thread-${i}`}
                  x1={110 + r1 * Math.cos(angle)}
                  y1={110 + r1 * Math.sin(angle)}
                  x2={110 + r2 * Math.cos(angle + 0.3)}
                  y2={110 + r2 * Math.sin(angle + 0.3)}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="0.5"
                />
              );
            })}
          </svg>
        </motion.div>
      ))}
    </div>
  );
};

export default SpiderWebOverlay;
