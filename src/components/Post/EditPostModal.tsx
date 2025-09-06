import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
  initialContent: string;
}

const EditPostModal: React.FC<EditPostModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialContent
}) => {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    setContent(initialContent);
    setIsEdited(false);
  }, [initialContent]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsEdited(e.target.value.trim() !== initialContent);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content === initialContent) return;

    setIsSaving(true);
    try {
      await onSave(content);
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#2d2d2d]">
          <h2 className="text-lg font-semibold text-white">Edit Post</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <textarea
            value={content}
            onChange={handleChange}
            className="w-full bg-[#2d2d2d] text-white rounded-lg p-4 min-h-[150px] resize-none focus:ring-2 focus:ring-orange-500 focus:outline-none"
            placeholder="What's happening?"
            autoFocus
          />

          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-400">
              {isEdited ? 'Post edited' : 'No changes made yet'}
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!content.trim() || content === initialContent || isSaving}
                className={`px-4 py-2 rounded-lg ${
                  content.trim() && content !== initialContent && !isSaving
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-orange-500/50 text-gray-300 cursor-not-allowed'
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