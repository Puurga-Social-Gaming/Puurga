import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, TrendingDown, Eye, AlertTriangle } from 'lucide-react';
import { AllianceSupportAction } from '../../types/survival';

interface RedemptionSupportCardProps {
  partnerName: string;
  supportHistory: AllianceSupportAction[];
  onSupport: (type: 'ENDORSEMENT' | 'REPUTATION_SACRIFICE' | 'VISIBILITY_SACRIFICE') => void;
}

const RedemptionSupportCard: React.FC<RedemptionSupportCardProps> = ({
  partnerName,
  supportHistory,
  onSupport,
}) => {
  const [selectedType, setSelectedType] = useState<'ENDORSEMENT' | 'REPUTATION_SACRIFICE' | 'VISIBILITY_SACRIFICE' | null>(null);

  const supportTypes = [
    {
      type: 'ENDORSEMENT' as const,
      icon: Heart,
      label: 'Endorsement',
      description: 'Offer moral support (+10% progress)',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      hoverColor: 'hover:bg-green-500/30',
    },
    {
      type: 'REPUTATION_SACRIFICE' as const,
      icon: TrendingDown,
      label: 'Reputation Sacrifice',
      description: 'Sacrifice reputation to aid redemption (+5% progress)',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      hoverColor: 'hover:bg-red-500/30',
    },
    {
      type: 'VISIBILITY_SACRIFICE' as const,
      icon: Eye,
      label: 'Visibility Sacrifice',
      description: 'Sacrifice visibility to aid redemption (+3% progress)',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      hoverColor: 'hover:bg-amber-500/30',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border border-red-500/30 bg-red-500/5 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <h3 className="font-semibold text-white">Support {partnerName}'s Redemption</h3>
      </div>

      <div className="space-y-3 mb-4">
        {supportTypes.map(({ type, icon: Icon, label, description, color, bgColor, hoverColor }) => (
          <button
            key={type}
            onClick={() => {
              setSelectedType(type);
              onSupport(type);
            }}
            disabled={selectedType !== null}
            className={`w-full p-3 rounded-lg border ${bgColor} ${hoverColor} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 ${color} mt-0.5`} />
              <div className="text-left flex-1">
                <div className={`font-medium ${color}`}>{label}</div>
                <div className="text-xs text-gray-400 mt-1">{description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {supportHistory.length > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <h4 className="text-xs text-gray-400 mb-2">Recent Support Actions</h4>
          <div className="space-y-2">
            {supportHistory.slice(0, 3).map((action) => (
              <div key={action.id} className="text-xs text-gray-500">
                <span className="text-gray-400">{action.supporterName}</span> - {action.supportType} (+{action.supportValue})
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default RedemptionSupportCard;
