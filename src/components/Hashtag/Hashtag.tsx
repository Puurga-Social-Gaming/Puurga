import React from 'react';
import { Hash } from 'lucide-react';

interface HashtagProps {
  tag: string;
  onClick?: (tag: string) => void;
}

const Hashtag: React.FC<HashtagProps> = ({ tag, onClick }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick(tag);
    }
  };

  return (
    <a
      href={`/hashtag/${tag}`}
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-accent hover:text-accent-hover hover:underline font-medium"
    >
      <Hash size={12} />
      {tag}
    </a>
  );
};

export default Hashtag;