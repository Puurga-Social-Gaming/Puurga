import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Flag, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';

export type ReportableType = 'post' | 'comment' | 'message' | 'user';

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportableType;
  targetId: string;
}

const REASONS: { value: string; label: string }[] = [
  { value: 'spam_or_scam', label: 'Spam or scam' },
  { value: 'harassment_or_bullying', label: 'Harassment or bullying' },
  { value: 'hate_speech', label: 'Hate speech or symbols' },
  { value: 'violence_or_dangerous', label: 'Violence or dangerous acts' },
  { value: 'sexual_content', label: 'Sexual content or nudity' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'illegal_goods_or_services', label: 'Illegal goods or services' },
  { value: 'other', label: 'Something else' },
];

const ReportDialog: React.FC<ReportDialogProps> = ({ isOpen, onClose, targetType, targetId }) => {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      await api.post('/reports', { targetType, targetId, reason, details: details.trim() });
      toast.success('Report submitted — our team will review it');
      setReason(null);
      setDetails('');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Flag size={16} className="text-red-500" />
            <h3 className="font-semibold text-foreground text-sm">
              Report this {targetType}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-muted hover:text-foreground rounded-lg" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3 space-y-1 max-h-72 overflow-y-auto">
          <p className="text-xs text-muted mb-2">Why are you reporting this?</p>
          {REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              className={`w-full px-3 py-2 rounded-lg text-left text-[13px] flex items-center justify-between transition-colors ${
                reason === r.value
                  ? 'bg-accent/15 text-foreground border border-border'
                  : 'hover:bg-card-hover text-foreground/90 border border-transparent'
              }`}
            >
              {r.label}
              {reason === r.value && <Check size={14} className="text-foreground" />}
            </button>
          ))}

          {reason && (
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 2000))}
              placeholder="Anything else we should know? (optional)"
              rows={3}
              className="w-full mt-2 px-3 py-2 rounded-lg bg-background-secondary border border-border text-[13px] text-foreground placeholder:text-muted focus:outline-none focus:border-accent resize-none"
            />
          )}
        </div>

        <div className="px-4 py-3 border-t border-border/60 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-lg text-[13px] text-muted hover:text-foreground hover:bg-card-hover border border-border transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!reason || submitting}
            className="flex-1 px-3 py-2 rounded-lg text-[13px] font-medium bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ReportDialog;
