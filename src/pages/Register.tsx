import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PuurgaLogo from '../components/Icons/PuurgaLogo';
import LoadingScreen from '../components/Loading/LoadingScreen';
import { motion } from 'framer-motion';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .slide {
        transform: translateX(100%);
        opacity: 0;
        transition: transform 300ms ease-in-out, opacity 300ms ease-in-out;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleSignInClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const container = document.querySelector('.register-container');
    if (container) {
      container.classList.add('slide');
      setTimeout(() => navigate('/login'), 300);
    }
  };

  if (initialLoading) return <LoadingScreen />;

  return (
    <motion.div
      initial={{ x: 0 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", duration: 0.5 }}
      className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 dark"
    >
      <div className="register-container w-full max-w-md space-y-8 transition-transform duration-300">
        <div className="text-center">
          <PuurgaLogo size={48} className="mx-auto text-white" />
          <h2 className="mt-6 text-3xl font-bold text-white">Join Puurga</h2>
          <p className="mt-2 text-gray-400">Connect with your community</p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="bg-white/5 border border-white/20 text-gray-300 p-8 rounded-2xl text-center backdrop-blur-md shadow-lg">
            <h3 className="font-bold text-xl mb-3 text-white flex justify-center items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Registration Paused
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              Public registration is currently disabled. Only Superadmins can add new users during this testing phase.
            </p>
          </div>

          <p className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link
              to="/login"
              onClick={handleSignInClick}
              className="font-medium text-white hover:text-gray-300"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Register;