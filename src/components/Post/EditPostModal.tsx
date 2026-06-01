import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const BACKGROUND_PRESETS = [
  { type: 'none', label: 'None', value: 0, class: 'bg-transparent border-2 border-dashed border-border' },
  { type: 'color', label: 'Warm', value: 1, class: 'bg-orange-100' },
  { type: 'color', label: 'Cool', value: 2, class: 'bg-blue-100' },
  { type: 'color', label: 'Nature', value: 3, class: 'bg-green-100' },
  { type: 'color', label: 'Sunset', value: 4, class: 'bg-yellow-100' },
  { type: 'gradient', label: 'Ocean', value: 5, class: 'bg-gradient-to-br from-blue-500 to-purple-600' },
  { type: 'gradient', label: 'Sunrise', value: 6, class: 'bg-gradient-to-br from-pink-500 to-orange-500' },
  { type: 'gradient', label: 'Forest', value: 7, class: 'bg-gradient-to-br from-green-500 to-teal-600' },
];

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
    setIsEdited(e.target.value.trim() !== initialContent);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content === initialContent) return;

    setIsSaving(true);
    try {
      await onSave(content, backgroundIndex);
      setIsEdited(false);
      onClose();
    } catch (error) {
      console.error('Failed to update post:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-modal">
      <div className="bg-card rounded-xl w-full max-w-lg mx-4 overflow-hidden border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Edit Post</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

          <form onSubmit={handleSubmit} className="p-4">
          <textarea
            value={content}
            onChange={handleChange}
            className="w-full bg-input text-foreground rounded-lg p-4 min-h-[150px] resize-none focus:ring-2 focus:ring-accent focus:outline-none border border-input-border"
            placeholder="What's happening?"
            autoFocus
          />

          {/* Background Picker */}
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Background</span>
              <button
                type="button"
                onClick={() => setBackgroundIndex(0)}
                className={`text-xs px-2 py-1 rounded ${
                  backgroundIndex === 0 ? 'text-accent font-semibold' : 'text-muted hover:text-foreground'
                } transition-colors`}
              >
                None
              </button>
            </div>
            <div className="flex gap-1.5 mt-1.5">
              {BACKGROUND_PRESETS.slice(1).map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    setBackgroundIndex(preset.value);
                    setIsEdited(true);
                  }}
                  className={`w-7 h-7 rounded-lg ${preset.class} hover:scale-110 transition-transform ${
                    preset.value === backgroundIndex ? 'ring-2 ring-accent ring-offset-1 ring-offset-card' : ''
                  }`}
                  title={preset.label}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted">
              {isEdited ? 'Post edited' : 'No changes made yet'}
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!content.trim() || isSaving}
                className={`px-4 py-2 rounded-lg ${
                  content.trim() && !isSaving
                    ? 'bg-accent text-black hover:opacity-90'
                    : 'bg-accent/50 text-background cursor-not-allowed'
                } transition-colors`}
              >
                {isSaving ? 'Updating...' : 'Update Post'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPostModal;
