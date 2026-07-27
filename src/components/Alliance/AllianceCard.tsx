import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Heart, AlertTriangle, Ghost, Zap } from 'lucide-react';
import { Alliance } from '../../types/survival';
import Avatar from '../Avatar';
import ProfileLink from '../Profile/ProfileLink';

interface AllianceCardProps {
  alliance: Alliance;
  onBreak?: (allianceId: string) => void;
  onSupport?: (allianceId: string) => void;
  showActions?: boolean;
}

const AllianceCard: React.FC<AllianceCardProps> = ({ alliance, onBreak, onSupport, showActions = true }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'border-green-500/30 bg-green-500/5';
      case 'PENDING':
        return 'border-amber-500/30 bg-amber-500/5';
      case 'BROKEN':
        return 'border-red-500/30 bg-red-500/5';
      case 'BETRAYED':
        return 'border-purple-500/30 bg-purple-500/5';
      default:
        return 'border-gray-500/30 bg-gray-500/5';
    }
  };

  const getLoyaltyColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-amber-400';
    if (score >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  const getStateIcon = (state: string) => {
    if (state === 'GHOSTED') return <Ghost className="w-4 h-4 text-gray-400" />;
    if (state === 'COLLAPSING') return <AlertTriangle className="w-4 h-4 text-red-400" />;
    if (state === 'HUNTED') return <Zap className="w-4 h-4 text-orange-400" />;
    return <Shield className="w-4 h-4 text-green-400" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border ${getStatusColor(alliance.allianceStatus)} backdrop-blur-sm`}
    >
      <div className="flex items-start gap-3">
        <ProfileLink username={alliance.username} className="rounded-full shrink-0">
          <Avatar src={alliance.avatar || undefined} alt={alliance.username} size="md" />
        </ProfileLink>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ProfileLink username={alliance.username} className="font-semibold text-white truncate hover:text-accent">
              {alliance.name}
            </ProfileLink>
            {getStateIcon(alliance.partnerState)}
          </div>
          
          <ProfileLink username={alliance.username} className="text-sm text-gray-400 mb-2 hover:text-accent block">
            @{alliance.username}
          </ProfileLink>
          
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Heart className={`w-3 h-3 ${getLoyaltyColor(alliance.loyaltyScore)}`} />
              <span className={getLoyaltyColor(alliance.loyaltyScore)}>
                {alliance.loyaltyScore}
              </span>
            </div>
            
            <div className="text-gray-500">
              {alliance.allianceStatus}
            </div>
            
            {alliance.partnerGhosted && (
              <div className="text-gray-400 flex items-center gap-1">
                <Ghost className="w-3 h-3" />
                Ghosted
              </div>
            )}
          </div>
        </div>
        
        {showActions && alliance.allianceStatus === 'ACTIVE' && (
          <div className="flex flex-col gap-2">
            {alliance.partnerGhosted && onSupport && (
              <button
                onClick={() => onSupport(alliance.id)}
                className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
              >
                Support
              </button>
            )}
            {onBreak && (
              <button
                onClick={() => onBreak(alliance.id)}
                className="px-3 py-1 text-xs bg-gray-500/20 text-gray-400 rounded hover:bg-gray-500/30 transition-colors"
              >
                Break
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AllianceCard;
