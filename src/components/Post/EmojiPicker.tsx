import React from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: any) => void;
  onClose: () => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, onClose }) => {
  return (
    <div className="absolute bottom-12 left-0 z-50">
      <div className="relative">
        <div className="absolute inset-0" onClick={onClose} />
        <Picker
          data={data}
          onEmojiSelect={onEmojiSelect}
          theme="dark"
          previewPosition="none"
          skinTonePosition="none"
        />
      </div>
    </div>
  );
};

export default EmojiPicker; 