import React from 'react';
import { Link } from 'react-router-dom';

interface ProfileLinkProps {
  username?: string | null;
  /** Optional fallback when username is missing (no navigation) */
  className?: string;
  title?: string;
  stopPropagation?: boolean;
  children: React.ReactNode;
}

/**
 * Clickable profile name/avatar wrapper → /profile/:username
 */
const ProfileLink: React.FC<ProfileLinkProps> = ({
  username,
  className = '',
  title,
  stopPropagation = true,
  children,
}) => {
  const handle = typeof username === 'string' ? username.trim().replace(/^@/, '') : '';

  if (!handle) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link
      to={`/profile/${handle}`}
      title={title || `@${handle}`}
      className={`no-underline hover:no-underline transition-colors ${className}`}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
      }}
    >
      {children}
    </Link>
  );
};

export default ProfileLink;
