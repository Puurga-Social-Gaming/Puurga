import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  to: string;
  isActive?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, to, isActive }) => {
  return (
    <Link
      to={to}
      className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-card-hover transition-colors ${
        isActive ? 'text-foreground' : 'text-muted'
      }`}
    >
      <Icon size={24} />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export default NavItem; 