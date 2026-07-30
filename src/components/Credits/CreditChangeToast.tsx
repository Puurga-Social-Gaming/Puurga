import type { ReactNode } from 'react';
import { Coins, Ghost, Gamepad2, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCredits } from '../../utils/formatCredits';

export interface CreditChangeData {
  amount: number;
  source: string;
  description?: string;
  newBalance?: number;
  breakdown?: {
    label: string;
    amount: number;
  }[];
}

const SOURCE_CONFIG: Record<string, { icon: ReactNode; color: string; bgColor: string; label: string }> = {
  post: { icon: <ArrowUpRight className="w-4 h-4" />, color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20', label: 'Create Post' },
  like: { icon: <ArrowUpRight className="w-4 h-4" />, color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20', label: 'Like' },
  comment: { icon: <ArrowUpRight className="w-4 h-4" />, color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20', label: 'Comment' },
  game: { icon: <Gamepad2 className="w-4 h-4" />, color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20', label: 'Game Reward' },
  redeem_user: { icon: <Ghost className="w-4 h-4" />, color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20', label: 'Ghost Reward' },
  redeem_friend: { icon: <Ghost className="w-4 h-4" />, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10 border-cyan-500/20', label: 'Redeem Friend' },
  daily_bonus: { icon: <Coins className="w-4 h-4" />, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/20', label: 'Daily Login' },
  recovery_bonus: { icon: <Coins className="w-4 h-4" />, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20', label: 'Recovery Bonus' },
  refund: { icon: <ArrowUpRight className="w-4 h-4" />, color: 'text-teal-400', bgColor: 'bg-teal-500/10 border-teal-500/20', label: 'Refund' },
  spend: { icon: <ArrowDownRight className="w-4 h-4" />, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20', label: 'Purchase' },
  package: { icon: <ArrowDownRight className="w-4 h-4" />, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20', label: 'Package' },
  certification: { icon: <ArrowDownRight className="w-4 h-4" />, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20', label: 'Certification' },
  transfer: { icon: <ArrowUpRight className="w-4 h-4" />, color: 'text-indigo-400', bgColor: 'bg-indigo-500/10 border-indigo-500/20', label: 'Transfer' },
  inactivity: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20', label: 'Inactivity' },
  penalty: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20', label: 'Penalty' },
};

function getSourceConfig(source: string) {
  return SOURCE_CONFIG[source] || {
    icon: <Coins className="w-4 h-4" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10 border-gray-500/20',
    label: source,
  };
}

export function showCreditToast(data: CreditChangeData) {
  const { amount, source, description, newBalance, breakdown } = data;
  const isPositive = amount > 0;
  const config = getSourceConfig(source);
  const displayLabel = description || config.label;

  const toastContent = (
    <div className={`flex flex-col gap-1.5 px-4 py-3 rounded-xl border ${config.bgColor} backdrop-blur-sm min-w-[260px] max-w-[340px]`}>
      <div className="flex items-center gap-2">
        <span className={config.color}>{config.icon}</span>
        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">{displayLabel}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-lg font-black tabular-nums ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{formatCredits(amount)}
        </span>
        <span className="text-xs text-muted">credits</span>
      </div>
      {breakdown && breakdown.length > 0 && (
        <div className="flex flex-col gap-0.5 mt-1 pt-1.5 border-t border-white/5">
          {breakdown.map((item, i) => (
            <div key={i} className="flex justify-between text-[10px] text-muted">
              <span>{item.label}</span>
              <span className={`tabular-nums ${item.amount >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                {item.amount >= 0 ? '+' : ''}{formatCredits(item.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
      {typeof newBalance === 'number' && (
        <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-white/5">
          <Coins className="w-3 h-3 text-muted" />
          <span className="text-[10px] text-muted">
            Balance: <span className="text-foreground font-semibold tabular-nums">{formatCredits(newBalance)}</span>
          </span>
        </div>
      )}
    </div>
  );

  return toastContent;
}
