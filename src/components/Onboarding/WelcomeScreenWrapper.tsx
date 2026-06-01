import React from 'react';
import { useNavigate } from 'react-router-dom';
import WelcomeScreen from '../system/WelcomeScreen';

const WelcomeScreenWrapper: React.FC = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate('/login');
  };

  return <WelcomeScreen onContinue={handleContinue} />;
};

export default WelcomeScreenWrapper;
