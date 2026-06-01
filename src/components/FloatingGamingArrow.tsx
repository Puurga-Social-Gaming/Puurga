import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingGamingArrowProps {
  onToggleSidebar?: () => void;
}

// Feature flag for sidebar mode (set to false to navigate to games page)
const USE_SIDEBAR = import.meta.env.VITE_USE_SIDEBAR !== 'false';

const FloatingGamingArrow: React.FC<FloatingGamingArrowProps> = ({ onToggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const shouldShow = 
    location.pathname !== '/puurga-games' && 
    !location.pathname.startsWith('/login') &&
    !location.pathname.startsWith('/register') &&
    !location.pathname.startsWith('/forgot-password') &&
    !location.pathname.startsWith('/reset-password');

  const handleClick = () => {
    if (USE_SIDEBAR && onToggleSidebar) {
      // Use sidebar mode
      onToggleSidebar();
    } else {
      // Navigate directly to games page
      navigate('/puurga-games');
    }
  };

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        className="lg:hidden fixed right-3 top-1/2 -translate-y-1/2 z-[100] flex flex-col items-center gap-1 w-16 h-16 min-h-[44px] rounded-full transition-all duration-300 bg-transparent border-transparent shadow-none hover:bg-accent/10 opacity-75 hover:opacity-100"
        aria-label={USE_SIDEBAR ? "Toggle sidebar" : "Games Menu"}
      >
        <Gamepad2 
          size={28} 
          className="text-foreground"
        />
        <span className="text-[10px] font-medium text-foreground uppercase tracking-wide leading-none">
          Games
        </span>
      </motion.button>
    </AnimatePresence>
  );
};

export default FloatingGamingArrow;
