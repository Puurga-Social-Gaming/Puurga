import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Ghost, TrendingUp, TrendingDown, Shield, Skull } from 'lucide-react';
import { useSurvival } from '../../context/SurvivalContext';
import type { SurvivalEvent } from '../../types/survival';

const EVENT_MESSAGES: Record<string, { message: string; icon: React.ReactNode; color: string }> = {
  INACTIVITY_WARNING: {
    message: 'Your inactivity is weakening your status.',
    icon: <AlertTriangle size={12} />,
    color: 'text-amber-400',
  },
  STATE_CHANGED: {
    message: 'Your survival state has changed.',
    icon: <Shield size={12} />,
    color: 'text-accent',
  },
  REPUTATION_GAIN: {
    message: 'Your influence is rising.',
    icon: <TrendingUp size={12} />,
    color: 'text-green-400',
  },
  REPUTATION_LOSS: {
    message: 'Your reputation is falling.',
    icon: <TrendingDown size={12} />,
    color: 'text-red-400',
  },
  GHOST_ENTERED: {
    message: 'You have entered ghost status.',
    icon: <Ghost size={12} />,
    color: 'text-gray-400',
  },
  GHOST_EXITED: {
    message: 'You have escaped ghost status.',
    icon: <Shield size={12} />,
    color: 'text-green-400',
  },
  PURGE_RECEIVED: {
    message: 'You have been purged. Your influence wanes.',
    icon: <AlertTriangle size={12} />,
    color: 'text-red-400',
  },
  VISIBILITY_CHANGED: {
    message: 'Your visibility is diminishing.',
    icon: <AlertTriangle size={12} />,
    color: 'text-orange-400',
  },
  PURGE_PRESSURE_CHANGED: {
    message: 'The pressure is mounting.',
    icon: <AlertTriangle size={12} />,
    color: 'text-amber-400',
  },
  TIER_CHANGED: {
    message: 'Your purge threshold has shifted.',
    icon: <AlertTriangle size={12} />,
    color: 'text-red-400',
  },
  COLLAPSE_WARNING: {
    message: 'Collapse is imminent. Your social death approaches.',
    icon: <Skull size={12} />,
    color: 'text-red-500',
  },
  PURGATORY_ENTERED: {
    message: 'You have fallen into purgatory. Seek redemption.',
    icon: <Ghost size={12} />,
    color: 'text-gray-500',
  },
  PURGATORY_EXITED: {
    message: 'You have been redeemed. The living world welcomes you.',
    icon: <Shield size={12} />,
    color: 'text-green-400',
  },
  REDEMPTION_PROGRESS_UPDATED: {
    message: 'Your redemption progress has changed.',
    icon: <Shield size={12} />,
    color: 'text-gray-400',
  },
  REDEMPTION_REQUESTED: {
    message: 'Redemption has been requested on your behalf.',
    icon: <Shield size={12} />,
    color: 'text-blue-400',
  },
  PURGATORY_STATUS_CHANGED: {
    message: 'Your purgatory status has changed.',
    icon: <Ghost size={12} />,
    color: 'text-gray-500',
  },
  ALLIANCE_REQUESTED: {
    message: 'Someone wants to form an alliance with you.',
    icon: <Shield size={12} />,
    color: 'text-blue-400',
  },
  ALLIANCE_ACCEPTED: {
    message: 'Your alliance request was accepted.',
    icon: <Shield size={12} />,
    color: 'text-green-400',
  },
  ALLIANCE_BROKEN: {
    message: 'An alliance has been broken.',
    icon: <AlertTriangle size={12} />,
    color: 'text-red-400',
  },
  LOYALTY_CHANGED: {
    message: 'Your alliance loyalty has changed.',
    icon: <Shield size={12} />,
    color: 'text-amber-400',
  },
  ALLY_COLLAPSING: {
    message: 'Your ally is collapsing.',
    icon: <AlertTriangle size={12} />,
    color: 'text-orange-400',
  },
  ALLY_GHOSTED: {
    message: 'Your ally has been ghosted.',
    icon: <Ghost size={12} />,
    color: 'text-gray-400',
  },
  REDEMPTION_SUPPORT_RECEIVED: {
    message: 'You received redemption support.',
    icon: <Shield size={12} />,
    color: 'text-green-400',
  },
};

const SurvivalNotifications: React.FC = () => {
  const { getNotifications } = useSurvival();
  const [events, setEvents] = useState<SurvivalEvent[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchNotifications = async () => {
      const notifs = await getNotifications();
      setEvents(notifs.slice(0, 5));
    };
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [getNotifications]);

  const visibleEvents = events.filter(e => !dismissed.has(e.id)).slice(0, 3);

  if (visibleEvents.length === 0) return null;

  return (
    <div className="space-y-1 px-2">
      <AnimatePresence>
        {visibleEvents.map((event) => {
          const config = EVENT_MESSAGES[event.event_type] || {
            message: event.event_type,
            icon: <AlertTriangle size={12} />,
            color: 'text-muted',
          };

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-card border border-border/40 ${config.color}`}
            >
              <span className="shrink-0">{config.icon}</span>
              <p className="text-[10px] leading-tight flex-1">{config.message}</p>
              <button
                onClick={() => setDismissed(prev => new Set(prev).add(event.id))}
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default SurvivalNotifications;
