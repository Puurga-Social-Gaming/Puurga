import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`transition-colors ${
        isActive ? 'text-accent' : 'text-muted hover:text-foreground'
      }`}
    >
      {icon}
    </Link>
  );
};

export default NavLink;