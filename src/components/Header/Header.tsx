import React from 'react';
import { Home, User, LogOut, Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import NavLink from './NavLink';
import PuurgaLogo from '../Icons/PuurgaLogo';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className }) => {
  const navigate = useNavigate();
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logged out successfully!');
      navigate('/login');
    } catch (error: unknown) {
      let errorMessage = 'Failed to log out.';
      if (error instanceof Error) errorMessage = error.message;
      toast.error(errorMessage);
    }
  };

  return (
    <header className={cn(
      "fixed top-0 z-50 w-full bg-[#0a0a0a] bg-opacity-80 backdrop-blur border-b border-[#2d2d2d]",
      className
    )}>
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/home" className="text-2xl font-bold text-orange-500 flex items-center gap-2">
          <PuurgaLogo size={32} className="text-orange-500" />
          <span className="tracking-wider">PUURGA</span>
        </Link>
        <nav className="hidden md:flex items-center space-x-8">
          <NavLink to="/home" icon={<Home className="w-6 h-6" />} />
          <NavLink to="/notifications" icon={<Bell className="w-6 h-6" />} />
          <NavLink to="/profile" icon={<User className="w-6 h-6" />} />
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors">
            <LogOut className="w-6 h-6" />
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;