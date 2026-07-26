import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BACKGROUND_PRESETS, getPostBackgroundPreset } from '../../constants/postBackgrounds';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string, backgroundIndex?: number) => Promise<void>;
  initialContent: string;
  initialBackgroundIndex?: number;
}

const EditPostModal: React.FC<EditPostModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialContent,
  initialBackgroundIndex = 0
}) => {
  const [content, setContent] = useState(initialContent);
  const [backgroundIndex, setBackgroundIndex] = useState(initialBackgroundIndex);
  const [isSaving, setIsSaving] = useState(false);
  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    setContent(initialContent);
    setBackgroundIndex(initialBackgroundIndex);
    setIsEdited(false);
  }, [initialContent, initialBackgroundIndex]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsEdited(
      e.target.value.trim() !== initialContent || backgroundIndex !== initialBackgroundIndex
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (content === initialContent && backgroundIndex === initialBackgroundIndex) return;

    setIsSaving(true);
    try {
      await onSave(content.trim(), backgroundIndex);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const preset = getPostBackgroundPreset(backgroundIndex);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Edit Post</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-muted hover:text-foreground hover:bg-card-hover"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted mb-1.5">
              Background
            </p>
            <div className="grid grid-cols-8 gap-1.5 max-h-28 overflow-y-auto">
              {BACKGROUND_PRESETS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setBackgroundIndex(item.value);
                    setIsEdited(
                      content.trim() !== initialContent || item.value !== initialBackgroundIndex
                    );
                  }}
                  className={`aspect-square rounded-md ${item.swatchClass || item.class} ${
                    item.value === backgroundIndex
                      ? 'ring-2 ring-accent'
                      : 'ring-1 ring-black/5'
                  }`}
                  title={item.label}
                  aria-label={item.label}
                >
                  {item.type === 'none' && <X size={12} className="mx-auto text-muted" />}
                </button>
              ))}
            </div>
          </div>

          <div className={`rounded-xl p-3 min-h-[120px] ${preset.class}`}>
            <textarea
              value={content}
              onChange={handleChange}
              className={`w-full bg-transparent border-none resize-none focus:outline-none text-sm min-h-[100px] ${preset.textClass}`}
              rows={5}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">
              {isEdited ? 'Post edited' : 'No changes made yet'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-muted hover:text-foreground rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !content.trim() || !isEdited}
                className="px-4 py-1.5 text-sm font-medium bg-accent text-black rounded-lg disabled:opacity-40"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPostModal;
