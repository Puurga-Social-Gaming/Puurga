import React from 'react';
import { AlertTriangle, Clock, Ban } from 'lucide-react';

interface InactivityWarningProps {
  daysInactive: number;
  className?: string;
}

const InactivityWarning: React.FC<InactivityWarningProps> = ({ daysInactive, className = '' }) => {
  if (daysInactive < 30) return null;

  const isEligible = daysInactive >= 60;

  return (
    <div
      className={`rounded-xl border p-3 transition-all ${
        isEligible
          ? 'bg-red-500/10 border-red-500/20'
          : 'bg-amber-500/10 border-amber-500/20'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            isEligible ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
          }`}
        >
          {isEligible ? <Ban size={16} /> : <Clock size={16} />}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold ${
              isEligible ? 'text-red-400' : 'text-amber-400'
            }`}
          >
            {isEligible
              ? 'Suspension Risk'
              : 'Inactivity Warning'}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {isEligible
              ? 'Your account is now eligible for suspension due to inactivity.'
              : 'Your account is becoming inactive.'}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <AlertTriangle size={10} className={isEligible ? 'text-red-400' : 'text-amber-400'} />
            <span className="text-[10px] text-muted">
              {daysInactive} days since last login
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InactivityWarning;
