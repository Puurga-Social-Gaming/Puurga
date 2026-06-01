import React from 'react';
import { motion } from 'framer-motion';
import { Shield, X, Check } from 'lucide-react';
import { PendingAllianceRequest } from '../../types/survival';
import Avatar from '../Avatar';

interface AllianceRequestCardProps {
  request: PendingAllianceRequest;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

const AllianceRequestCard: React.FC<AllianceRequestCardProps> = ({ request, onAccept, onReject }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        <Avatar src={request.avatar || undefined} alt={request.username} size="md" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-white truncate">{request.name}</h3>
          </div>
          
          <p className="text-sm text-gray-400 mb-3">@{request.username}</p>
          
          <p className="text-xs text-amber-300 mb-3">
            This user seeks to form a survival bond with you.
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={() => onAccept(request.id)}
              className="flex-1 px-3 py-2 text-sm bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Accept
            </button>
            <button
              onClick={() => onReject(request.id)}
              className="flex-1 px-3 py-2 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AllianceRequestCard;
