import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellOff, Check, Volume2, X } from 'lucide-react';
import { MESSAGE_RINGTONES, type MessageRingtoneId } from '../../config/messageRingtones';
import { useMessageRingtoneStore } from '../../store/messageRingtoneStore';
import {
  playMessageSound,
  preloadAllRingtones,
  unlockMessageSound,
} from '../../utils/messageSound';

interface MessageRingtoneSettingsProps {
  title?: string;
  description?: string;
  buttonClassName?: string;
}

const MessageRingtoneSettings: React.FC<MessageRingtoneSettingsProps> = ({
  title = 'Message ringtone',
  description = 'Plays when a new message arrives',
  buttonClassName = '',
}) => {
  const { enabled, ringtoneId, setEnabled, setRingtoneId } = useMessageRingtoneStore();
  const [open, setOpen] = useState(false);
  const [previewingId, setPreviewingId] = useState<MessageRingtoneId | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    unlockMessageSound();
    preloadAllRingtones();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const selectAndPreview = (id: MessageRingtoneId) => {
    unlockMessageSound();
    setRingtoneId(id);
    if (!enabled) setEnabled(true);
    setPreviewingId(id);
    // Play the exact id just selected (not a stale store value)
    playMessageSound({ force: true, ringtoneId: id });
    window.setTimeout(() => setPreviewingId((cur) => (cur === id ? null : cur)), 1200);
  };

  const panel =
    open &&
    createPortal(
      <div
        className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 p-4"
        onClick={() => setOpen(false)}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ringtone-title"
          className="w-full max-w-sm max-h-[min(80vh,32rem)] flex flex-col rounded-2xl bg-card border border-border shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="min-w-0">
              <h3 id="ringtone-title" className="text-sm font-semibold text-foreground">
                {title}
              </h3>
              <p className="text-[11px] text-muted mt-0.5">{description}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-xl text-muted hover:text-foreground hover:bg-card-hover"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <p className="text-sm text-foreground font-medium">Enable sound</p>
              <p className="text-[11px] text-muted truncate">
                Active: {MESSAGE_RINGTONES.find((r) => r.id === ringtoneId)?.label || 'Message'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled(!enabled)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                enabled ? 'bg-accent' : 'bg-border'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <ul className="flex-1 overflow-y-auto min-h-0 py-1">
            {MESSAGE_RINGTONES.map((r) => {
              const selected = ringtoneId === r.id;
              const previewing = previewingId === r.id;
              return (
                <li key={r.id}>
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 ${
                      selected ? 'bg-accent/10' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectAndPreview(r.id)}
                      className="flex-1 min-w-0 flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left hover:bg-card-hover transition-colors"
                    >
                      <span
                        className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 ${
                          selected ? 'border-accent bg-accent text-black' : 'border-border'
                        }`}
                      >
                        {selected && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className="text-sm text-foreground truncate">{r.label}</span>
                      {r.id === 'message' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-background border border-border text-muted shrink-0">
                          Default
                        </span>
                      )}
                      {previewing && (
                        <span className="text-[10px] text-accent shrink-0 animate-pulse">Playing…</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => selectAndPreview(r.id)}
                      className="p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-card-hover shrink-0"
                      title="Preview & select"
                      aria-label={`Preview ${r.label}`}
                    >
                      <Volume2 size={15} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="px-4 py-2.5 border-t border-border shrink-0">
            <p className="text-[10px] text-muted text-center">
              Tap a ringtone to select it — that sound will play on new messages
            </p>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          unlockMessageSound();
          setOpen((v) => !v);
        }}
        className={`p-2.5 rounded-xl border transition-all touch-manipulation ${
          enabled
            ? 'bg-card border-border text-foreground hover:bg-card-hover'
            : 'bg-card border-border text-muted hover:text-foreground hover:bg-card-hover'
        } ${buttonClassName}`}
        title={enabled ? `${title} on` : `${title} off`}
        aria-label={`${title} settings`}
        aria-expanded={open}
      >
        {enabled ? <Bell size={17} /> : <BellOff size={17} />}
      </button>
      {panel}
    </>
  );
};

export default MessageRingtoneSettings;
