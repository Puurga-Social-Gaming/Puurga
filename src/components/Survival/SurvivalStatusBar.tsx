import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Skull, Ghost, Flame, Activity } from 'lucide-react';
import { useSurvival } from '../../context/SurvivalContext';
import {
  SURVIVAL_STATE_COLORS,
  SURVIVAL_STATE_LABELS,
  THREAT_COLORS,
  SurvivalState,
  getPurgeTier,
  PURGE_TIER_CONFIG,
} from '../../types/survival';
import PurgePressureMeter from './PurgePressureMeter';
import VisibilityBadge from './VisibilityBadge';

const STATE_ICONS: Record<SurvivalState, React.ReactNode> = {
  SAFE: <Shield size={14} />,
  WARNING: <AlertTriangle size={14} />,
  HUNTED: <Flame size={14} />,
  COLLAPSING: <Skull size={14} />,
  GHOSTED: <Ghost size={14} />,
};

const THREAT_ICONS: Record<string, React.ReactNode> = {
  LOW: <Shield size={12} />,
  RISING: <Activity size={12} />,
  DANGEROUS: <Flame size={12} />,
  HUNTED: <Flame size={12} />,
  LEGENDARY_THREAT: <Skull size={12} />,
};

const SurvivalStatusBar: React.FC = () => {
  const { survivalState, loading } = useSurvival();

  if (loading || !survivalState) return null;

  const state = survivalState.current_survival_state as SurvivalState;
  const stateColor = SURVIVAL_STATE_COLORS[state] || SURVIVAL_STATE_COLORS.SAFE;
  const stateLabel = SURVIVAL_STATE_LABELS[state] || 'Safe';
  const threatTier = survivalState.threat_level <= 20 ? 'LOW'
    : survivalState.threat_level <= 40 ? 'RISING'
    : survivalState.threat_level <= 60 ? 'DANGEROUS'
    : survivalState.threat_level <= 80 ? 'HUNTED'
    : 'LEGENDARY_THREAT';
  const threatColor = THREAT_COLORS[threatTier] || THREAT_COLORS.LOW;
  const tier = getPurgeTier(survivalState.purge_count);
  const tierConfig = PURGE_TIER_CONFIG[tier];

  const getThreatBarColor = () => {
    if (survivalState.threat_level <= 20) return 'bg-green-500';
    if (survivalState.threat_level <= 40) return 'bg-yellow-500';
    if (survivalState.threat_level <= 60) return 'bg-orange-500';
    if (survivalState.threat_level <= 80) return 'bg-red-500';
    return 'bg-purple-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-2 py-1.5"
    >
      <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border/60 shadow-sm ${tier !== 'STABLE' ? tierConfig.color.split(' ')[1] + '/10' : ''}`}>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${stateColor}`}>
          {STATE_ICONS[state]}
          <span>{stateLabel}</span>
        </div>

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-[10px] text-muted/70 font-medium">Rep</span>
          <div className="flex-1 h-1.5 rounded-full bg-border/40 overflow-hidden max-w-[60px]">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(100, Math.max(0, Number(survivalState.reputation_score) || 0) / 10)}%`,
              }}
              transition={{ duration: 0.5 }}
              className={`h-full rounded-full ${survivalState.reputation_score > 60 ? 'bg-accent' : survivalState.reputation_score > 30 ? 'bg-orange-500' : 'bg-red-500'}`}
            />
          </div>
          <span className={`text-[10px] font-semibold tabular-nums ${survivalState.reputation_score > 60 ? 'text-accent' : survivalState.reputation_score > 30 ? 'text-orange-400' : 'text-red-400'}`}>
            {survivalState.reputation_score}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Flame size={11} className="text-muted/50" />
          <span className="text-[10px] text-muted/70 tabular-nums">{survivalState.purge_count}</span>
        </div>

        <PurgePressureMeter
          purgeCount={survivalState.purge_count}
          purgePressure={survivalState.purge_pressure || 0}
          collapseRisk={survivalState.collapse_risk || 0}
          threshold={300}
        />

        {(survivalState.visibility_score !== undefined && survivalState.visibility_score < 80) && (
          <VisibilityBadge visibilityScore={survivalState.visibility_score} />
        )}

        <div className="flex items-center gap-1">
          <span className={`text-[10px] font-medium ${threatColor}`}>
            {THREAT_ICONS[threatTier]}
          </span>
          <div className="h-1.5 w-[40px] rounded-full bg-border/40 overflow-hidden hidden sm:block">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(100, Math.max(0, Number(survivalState.threat_level) || 0))}%`,
              }}
              transition={{ duration: 0.5 }}
              className={`h-full rounded-full ${getThreatBarColor()}`}
            />
          </div>
        </div>

        {survivalState.inactivity_level > 0 && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle size={10} className="text-amber-400" />
            <span className="text-[9px] text-amber-400 font-medium">Lv{survivalState.inactivity_level}</span>
          </div>
        )}

        {survivalState.social_rank !== 'UNKNOWN' && (
          <span className="text-[9px] text-muted/50 font-medium uppercase tracking-wider hidden sm:block">
            {survivalState.social_rank}
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default SurvivalStatusBar;
