import React, { useState, useEffect, useRef } from 'react';
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
  const ghostRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [targetPos, setTargetPos] = useState({ 
    x: initialX || Math.random() * window.innerWidth, 
    y: initialY || Math.random() * window.innerHeight 
  });
  const [isActive, setIsActive] = useState(false);

  // Initialize ghost position
  const ghostPos = { 
    x: initialX || Math.random() * window.innerWidth, 
    y: initialY || Math.random() * window.innerHeight 
  };

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Ghost activation and movement logic
  useEffect(() => {
    if (!isActive) {
      // Delay activation for random timing
      const delay = Math.random() * 3000 + 500; // 0.5-3.5 seconds
      const timer = setTimeout(() => setIsActive(true), delay);
      return () => clearTimeout(timer);
    }

    // Movement interval
    const moveInterval = setInterval(() => {
      const rect = ghostRef.current?.getBoundingClientRect();
      if (!rect) return;

      const ghostCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      // Calculate distance to mouse
      const distanceToMouse = Math.sqrt(
        Math.pow(mousePos.x - ghostCenter.x, 2) +
        Math.pow(mousePos.y - ghostCenter.y, 2)
      );

      // Mouse avoidance radius
      const avoidanceRadius = 150;

      let newTargetX = targetPos.x;
      let newTargetY = targetPos.y;

      if (distanceToMouse < avoidanceRadius) {
        // Move away from mouse
        const angle = Math.atan2(ghostCenter.y - mousePos.y, ghostCenter.x - mousePos.x);
        const avoidanceDistance = (avoidanceRadius - distanceToMouse) * 0.5;
        newTargetX = ghostCenter.x + Math.cos(angle) * avoidanceDistance;
        newTargetY = ghostCenter.y + Math.sin(angle) * avoidanceDistance;
      } else {
        // Random movement when not avoiding mouse
        if (Math.random() < 0.3) { // 30% chance to change direction
          const randomAngle = Math.random() * Math.PI * 2;
          const randomDistance = Math.random() * 200 + 50;
          newTargetX = ghostCenter.x + Math.cos(randomAngle) * randomDistance;
          newTargetY = ghostCenter.y + Math.sin(randomAngle) * randomDistance;
        }
      }

      // Allow ghosts to float off screen - no constraints
      // newTargetX and newTargetY can be anywhere

      setTargetPos({ x: newTargetX, y: newTargetY });
    }, 200 + Math.random() * 300); // Random interval 200-500ms (was 100-300ms)

    return () => clearInterval(moveInterval);
  }, [isActive, mousePos, targetPos]);

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

  return (
    <motion.div
      ref={ghostRef}
      initial={{ x: ghostPos.x, y: ghostPos.y, opacity: 0, scale: 0.1 }}
      animate={{
        x: targetPos.x,
        y: targetPos.y,
        opacity: isActive ? [0.3, 0.8, 0.6, 0.9] : 0,
        scale: isActive ? [0.1, 0.8, 1.2, 1.0] : 0.1
      }}
      transition={{
        type: "spring",
        stiffness: 50,
        damping: 20,
        mass: 1,
        opacity: { duration: 2, ease: "easeInOut" },
        scale: { duration: 1.5, ease: "easeOut" }
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
        className={`${sizeClasses} object-contain opacity-95`}
        animate={{
          rotate: [0, 5, -5, 0],
          scale: [1, 1.05, 1, 1.02, 1]
        }}
        transition={{
          rotate: { duration: 8 + Math.random() * 4, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 6 + Math.random() * 3, repeat: Infinity, ease: "easeInOut" }
        }}
        style={{
          filter: `drop-shadow(0 0 ${10 + id * 2}px rgba(255, 255, 255, 0.8))
                  drop-shadow(0 0 ${20 + id * 3}px rgba(150, 150, 255, 0.4))`,
          mixBlendMode: 'screen'
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
