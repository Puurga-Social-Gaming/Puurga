import React from 'react';
import { AtSign } from 'lucide-react';

interface MentionProps {
  username: string;
  userId?: string;
  onClick?: (username: string, userId?: string) => void;
}

const Mention: React.FC<MentionProps> = ({ username, userId, onClick }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick(username, userId);
    }
  };

  return (
    <a
      href={`/profile/${username}`}
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-accent hover:text-accent-hover no-underline hover:no-underline font-medium"
    >
      <AtSign size={12} />
      {username}
    </a>
  );
};

export default Mention;