import React from 'react';
import { motion } from 'framer-motion';
import { Eye, AlertTriangle, Skull } from 'lucide-react';
import { getPurgeTier, PURGE_TIER_CONFIG } from '../../types/survival';

interface PurgePressureMeterProps {
  purgeCount: number;
  purgePressure: number;
  collapseRisk: number;
  /** The threshold to display as the denominator (e.g. 250 for posts, 300 for profiles) */
  threshold?: number;
}

const PurgePressureMeter: React.FC<PurgePressureMeterProps> = ({ purgeCount, collapseRisk, threshold }) => {
  const tier = getPurgeTier(purgeCount);
  const tierConfig = PURGE_TIER_CONFIG[tier];
  const displayThreshold = threshold ?? 300;
  const progressToNext = Math.min(100, (purgeCount / displayThreshold) * 100);

  return (
    <div className="flex items-center gap-1.5">
      {tier !== 'STABLE' && (
        <>
          <div className="flex flex-col items-start gap-0.5">
            <div className="flex items-center gap-1">
              {collapseRisk >= 75 ? (
                <Skull size={10} className="text-red-400" />
              ) : collapseRisk >= 50 ? (
                <AlertTriangle size={10} className="text-orange-400" />
              ) : (
                <Eye size={10} className="text-amber-400" />
              )}
              <span className={`text-[9px] font-semibold ${tierConfig.color.split(' ')[0]}`}>
                {tierConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1 w-[30px] rounded-full bg-border/40 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToNext}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded-full ${tierConfig.barColor}`}
                />
              </div>
              <span className="text-[8px] text-muted/50 tabular-nums">
                {purgeCount} / {displayThreshold}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PurgePressureMeter;
