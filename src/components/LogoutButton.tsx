import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const LogoutButton: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-card-hover text-foreground transition-colors"
    >
      <LogOut size={24} />
      <span className="font-medium">Logout</span>
    </button>
  );
};

export default LogoutButton; 