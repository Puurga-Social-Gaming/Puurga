import React from 'react';
import { X } from 'lucide-react';

interface VideoCropModalProps {
  isOpen: boolean;
  videoUrl: string;
  duration: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const VideoCropModal: React.FC<VideoCropModalProps> = ({
  isOpen,
  videoUrl,
  duration,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const maxDuration = Math.min(duration, 180); // 3 minutes max

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Trim Video</h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-muted hover:text-foreground hover:bg-card-hover rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <div className="mb-4">
            <p className="text-sm text-muted mb-2">
              This video is {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')} long. 
              Please trim it to maximum 3 minutes.
            </p>
            <video
              src={videoUrl}
              controls
              className="w-full rounded-lg mb-4"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Select duration to keep (first 3 minutes):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max={maxDuration}
                defaultValue={maxDuration}
                className="flex-1"
                disabled
              />
              <span className="text-sm text-muted">
                {Math.floor(maxDuration / 60)}:{String(Math.floor(maxDuration % 60)).padStart(2, '0')}
              </span>
            </div>
            <p className="text-xs text-muted mt-2">
              Note: Video trimming will be processed during upload. The first 3 minutes will be kept.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 bg-card border border-border text-foreground rounded-xl font-semibold hover:bg-card-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 py-2.5 bg-accent text-black rounded-xl font-semibold hover:bg-accent/90 transition-colors"
            >
              Use First 3 Minutes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCropModal;