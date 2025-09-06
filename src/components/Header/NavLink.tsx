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
        isActive ? 'text-blue-400' : 'text-white hover:text-blue-400'
      }`}
    >
      {icon}
    </Link>
  );
};

export default NavLink;