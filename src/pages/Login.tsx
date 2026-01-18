import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PuurgaLogo from '../components/Icons/PuurgaLogo';
import LoadingScreen from '../components/Loading/LoadingScreen';
import WelcomeScreen from '../components/Loading/WelcomeScreen';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { preloadPosts } from '../utils/preloadPosts';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 
      'Password must contain uppercase, lowercase, number and special character')
});

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeUsername, setWelcomeUsername] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for saved email
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    // Only show loading screen on first visit to login page
    const hasVisitedLogin = sessionStorage.getItem('hasVisitedLogin');
    if (!hasVisitedLogin && !location.state?.fromRegister) {
      setInitialLoading(true);
      const timer = setTimeout(() => {
        setInitialLoading(false);
        sessionStorage.setItem('hasVisitedLogin', 'true');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [location]);

  // Listen for popstate (browser back/forward) events
  useEffect(() => {
    const handlePopState = () => {
      setInitialLoading(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const result = loginSchema.safeParse({ email, password });
      
      if (!result.success) {
        // Format Zod errors into readable messages
        const formattedErrors = result.error.issues.map(issue => issue.message);
        setError(formattedErrors.join('\n'));
        return;
      }

      const trimmedEmail = email.trim().toLowerCase();
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', trimmedEmail);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      console.log('Attempting login with:', { email: trimmedEmail });
      const user = await login(trimmedEmail, password);
      
      if (!user) {
        throw new Error('Login failed - no user data received');
      }

      console.log('Login successful:', user);
      const displayName = user.name || user.username;
      if (!displayName) {
        throw new Error('Invalid user data received');
      }

      setWelcomeUsername(displayName);
      setShowWelcome(true);
      
      // Start preloading posts immediately while welcome screen is showing
      preloadPosts();
      
      // Navigate after showing welcome screen (3.5 seconds to allow posts to preload)
      setTimeout(() => {
        navigate('/home');
      }, 3500);
    } catch (err: any) {
      console.error('Detailed login error in component:', err);
      
      // Handle different types of errors
      if (err instanceof z.ZodError) {
        const formattedErrors = err.issues.map(issue => issue.message);
        setError(formattedErrors.join('\n'));
        toast.error('Please check your input');
      } else {
        const errorMessage = err?.message || 'Failed to login. Please try again.';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    }
  };

  const handleRegisterClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const container = document.querySelector('.login-container');
    if (container) {
      container.classList.add('slide-reverse');
      setTimeout(() => {
        navigate('/register', { state: { fromLogin: true } });
      }, 300);
    }
  };

  if (showWelcome) {
    return <WelcomeScreen username={welcomeUsername} />;
  }

  if (initialLoading && !location.state?.fromRegister) {
    return <LoadingScreen />;
  }

  return (
    <motion.div
      initial={{ x: 0 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", duration: 0.5 }}
      className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4"
    >
      <div className="login-container w-full max-w-md space-y-8 transition-transform duration-300">
        <div className="text-center">
          <PuurgaLogo size={48} className="mx-auto text-orange-500" />
          <h2 className="mt-6 text-3xl font-bold text-white">Welcome back</h2>
          <p className="mt-2 text-gray-400">Sign in to your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="p-3 mb-4 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
              {error.split('\n').map((line, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span>•</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg bg-[#1a1a1a] border border-[#2d2d2d] px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg bg-[#1a1a1a] border border-[#2d2d2d] px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-10 transition-all duration-200"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 bg-[#1a1a1a]"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                  Remember me
                </label>
              </div>
              <Link to="/forgot-password" className="text-sm text-orange-500 hover:text-orange-400">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors ${
              loading ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </div>
            ) : (
              'Sign in'
            )}
          </button>
          
          <p className="text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              onClick={handleRegisterClick}
              className="font-medium text-orange-500 hover:text-orange-400"
            >
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </motion.div>
  );
};

export default Login;

// Add this at the end of your existing styles
const style = document.createElement('style');
style.textContent = `
  .slide-reverse {
    transform: translateX(-100%);
    opacity: 0;
    transition: transform 300ms ease-in-out, opacity 300ms ease-in-out;
  }
`;
document.head.appendChild(style);