import React from 'react';
import PuurgaLogo from '../Icons/PuurgaLogo';

interface WelcomeScreenProps {
  username: string;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ username }) => {
  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center">
      <div className="relative">
        <PuurgaLogo size={64} className="text-orange-500 animate-bounce" />
        <div className="absolute -inset-4 bg-orange-500/20 rounded-full blur-xl animate-pulse"></div>
      </div>
      <div className="mt-8 text-center space-y-2">
        <p className="text-white text-xl font-medium">
          Welcome
        </p>
        <p className="text-orange-500 text-2xl font-bold tracking-wider">
          {username}
        </p>
      </div>
    </div>
  );
};

export default WelcomeScreen; 