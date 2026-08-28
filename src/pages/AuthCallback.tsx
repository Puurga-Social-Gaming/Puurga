import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import LoadingScreen from '../components/Loading/LoadingScreen';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    toast.error('Google sign-in is not yet available. Please use email sign-in.');
    navigate('/login', { replace: true });
  }, [navigate]);

  return <LoadingScreen />;
};

export default AuthCallback;
