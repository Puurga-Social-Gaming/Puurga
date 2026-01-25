import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PuurgaLogo from '../components/Icons/PuurgaLogo';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import WelcomeScreen from '../components/Loading/WelcomeScreen';
import LoadingScreen from '../components/Loading/LoadingScreen';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { preloadPosts } from '../utils/preloadPosts';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [validations, setValidations] = useState({
    name: { valid: true, message: '' },
    email: { valid: true, message: '' },
    username: { valid: true, message: '' },
    password: { valid: true, message: '' },
    verifyPassword: { valid: true, message: '' }
  });
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only show loading screen on first visit to register page
    const hasVisitedRegister = sessionStorage.getItem('hasVisitedRegister');
    if (!hasVisitedRegister && !location.state?.fromLogin) {
      setInitialLoading(true);
      const timer = setTimeout(() => {
        setInitialLoading(false);
        sessionStorage.setItem('hasVisitedRegister', 'true');
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

  // Generate username from full name
  const generateUsername = (fullName: string): string => {
    if (!fullName.trim()) return '';
    
    // Convert to lowercase, remove extra spaces, and split into words
    const words = fullName.trim().toLowerCase().split(/\s+/).filter(word => word.length > 0);
    
    if (words.length === 0) return '';
    
    // Remove special characters from each word, keeping only letters, numbers, and underscores
    const cleanWords = words.map(word => word.replace(/[^a-z0-9_]/g, '')).filter(word => word.length > 0);
    
    if (cleanWords.length === 0) return '';
    
    // Join words with underscores or combine if single word
    let generated = cleanWords.join('_');
    
    // If the generated username is too short, pad it
    if (generated.length < 3) {
      generated = generated + '_user';
    }
    
    // Ensure it doesn't exceed reasonable length (max 30 characters for username)
    if (generated.length > 30) {
      generated = generated.substring(0, 30);
    }
    
    return generated;
  };

  // Password strength calculation
  const calculatePasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[^A-Za-z0-9]/.test(pass)) strength++;
    return strength;
  };

  const getPasswordStrengthColor = () => {
    const strength = calculatePasswordStrength(password);
    if (strength <= 1) return 'bg-red-500';
    if (strength === 2) return 'bg-yellow-500';
    if (strength === 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const validateField = (field: string, value: string) => {
    switch (field) {
      case 'name':
        if (!value.trim()) {
          return { valid: false, message: 'Name is required' };
        }
        if (value.trim().length < 2) {
          return { valid: false, message: 'Name must be at least 2 characters' };
        }
        return { valid: true, message: '' };

      case 'email': {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!value.trim()) {
          return { valid: false, message: 'Email is required' };
        }
        if (!emailRegex.test(value.trim())) {
          return { valid: false, message: 'Please enter a valid email' };
        }
        return { valid: true, message: '' };
      }

      case 'username': {
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!value.trim()) {
          return { valid: false, message: 'Username is required' };
        }
        if (!usernameRegex.test(value.trim())) {
          return { valid: false, message: 'Only letters, numbers, and underscores allowed' };
        }
        if (value.trim().length < 3) {
          return { valid: false, message: 'Username must be at least 3 characters' };
        }
        return { valid: true, message: '' };
      }

      case 'password':
        if (!value) {
          return { valid: false, message: 'Password is required' };
        }
        if (value.length < 8) {
          return { valid: false, message: 'Password must be at least 8 characters' };
        }
        return { valid: true, message: '' };

      case 'verifyPassword':
        if (!value) {
          return { valid: false, message: 'Please confirm your password' };
        }
        if (value !== password) {
          return { valid: false, message: 'Passwords do not match' };
        }
        return { valid: true, message: '' };

      default:
        return { valid: true, message: '' };
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    const validation = validateField(field, value);
    setValidations(prev => ({
      ...prev,
      [field]: validation
    }));

    switch (field) {
      case 'name':
        setName(value);
        // Auto-generate username from name
        const generatedUsername = generateUsername(value);
        setUsername(generatedUsername);
        // Validate the generated username
        const usernameValidation = validateField('username', generatedUsername);
        setValidations(prev => ({
          ...prev,
          username: usernameValidation
        }));
        break;
      case 'email':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        break;
      case 'verifyPassword':
        setVerifyPassword(value);
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Ensure username is generated from name before validation
    const finalUsername = username || generateUsername(name);
    if (finalUsername !== username) {
      setUsername(finalUsername);
    }

    // Validate all fields
    const nameValidation = validateField('name', name);
    const emailValidation = validateField('email', email);
    const usernameValidation = validateField('username', finalUsername);
    const passwordValidation = validateField('password', password);
    const verifyPasswordValidation = validateField('verifyPassword', verifyPassword);

    setValidations({
      name: nameValidation,
      email: emailValidation,
      username: usernameValidation,
      password: passwordValidation,
      verifyPassword: verifyPasswordValidation
    });

    if (!nameValidation.valid || !emailValidation.valid || !usernameValidation.valid || !passwordValidation.valid || !verifyPasswordValidation.valid) {
      return;
    }

    try {
      const user = await register(name.trim(), email.trim(), password, finalUsername.trim());
      if (user) {
        setShowWelcome(true);
        
        // Start preloading posts immediately while welcome screen is showing
        preloadPosts();
        
        setTimeout(() => {
          navigate('/home');
        }, 3500);
      }
    } catch (err: unknown) {
      let errorMessage = 'Registration failed.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMessage = (err as { message: string }).message;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleSignInClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const container = document.querySelector('.register-container');
    if (container) {
      container.classList.add('slide');
      setTimeout(() => {
        navigate('/login', { state: { fromRegister: true } });
      }, 300);
    }
  };

  if (showWelcome) {
    return <WelcomeScreen username={name} />;
  }

  if (initialLoading && !location.state?.fromLogin) {
    return <LoadingScreen />;
  }

  return (
    <motion.div
      initial={{ x: 0 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", duration: 0.5 }}
      className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4"
    >
      <div className="register-container w-full max-w-md space-y-8 transition-transform duration-300">
        <div className="text-center">
          <PuurgaLogo size={48} className="mx-auto text-orange-500" />
          <h2 className="mt-6 text-3xl font-bold text-white">Create an account</h2>
          <p className="mt-2 text-gray-400">Join our community</p>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                Full Name
              </label>
              <div className="relative">
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className={`mt-1 block w-full rounded-lg bg-[#1a1a1a] border px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 ${
                    validations.name.valid ? 'border-[#2d2d2d]' : 'border-red-500'
                  }`}
                  placeholder="Enter your name"
                />
                {name && (
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {validations.name.valid ? (
                      <Check className="text-green-500" size={20} />
                    ) : (
                      <X className="text-red-500" size={20} />
                    )}
                  </span>
                )}
              </div>
              {!validations.name.valid && (
                <p className="mt-1 text-sm text-red-500">{validations.name.message}</p>
              )}
              {username && (
                <p className="mt-1 text-xs text-gray-400">
                  Username: <span className="text-orange-400 font-medium">{username}</span>
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className={`mt-1 block w-full rounded-lg bg-[#1a1a1a] border px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 ${
                    validations.email.valid ? 'border-[#2d2d2d]' : 'border-red-500'
                  }`}
                  placeholder="Enter your email"
                />
                {email && (
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {validations.email.valid ? (
                      <Check className="text-green-500" size={20} />
                    ) : (
                      <X className="text-red-500" size={20} />
                    )}
                  </span>
                )}
              </div>
              {!validations.email.valid && (
                <p className="mt-1 text-sm text-red-500">{validations.email.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  className={`mt-1 block w-full rounded-lg bg-[#1a1a1a] border px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-10 transition-all duration-200 ${
                    validations.password.valid ? 'border-[#2d2d2d]' : 'border-red-500'
                  }`}
                  placeholder="Choose a password (min. 8 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                All special characters are allowed (e.g., #, ;, @, $, !, %, *, ?, &, etc.)
              </p>
              {password && (
                <div className="mt-2">
                  <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                      style={{ width: `${(calculatePasswordStrength(password) / 4) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-400">
                    Password strength: {['Weak', 'Fair', 'Good', 'Strong'][calculatePasswordStrength(password) - 1] || 'Very Weak'}
                  </p>
                </div>
              )}
              {!validations.password.valid && (
                <p className="mt-1 text-sm text-red-500">{validations.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="verifyPassword" className="block text-sm font-medium text-gray-300">
                Verify Password
              </label>
              <div className="relative">
                <input
                  id="verifyPassword"
                  type={showVerifyPassword ? "text" : "password"}
                  value={verifyPassword}
                  onChange={(e) => handleFieldChange('verifyPassword', e.target.value)}
                  className={`mt-1 block w-full rounded-lg bg-[#1a1a1a] border px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-10 transition-all duration-200 ${
                    validations.verifyPassword.valid ? 'border-[#2d2d2d]' : 'border-red-500'
                  }`}
                  placeholder="Verify your password"
                />
                <button
                  type="button"
                  onClick={() => setShowVerifyPassword(!showVerifyPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showVerifyPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {!validations.verifyPassword.valid && (
                <p className="mt-1 text-sm text-red-500">{validations.verifyPassword.message}</p>
              )}
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
                Creating account...
              </div>
            ) : (
              'Create account'
            )}
          </button>
          
          <p className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link 
              to="/login" 
              onClick={handleSignInClick}
              className="font-medium text-orange-500 hover:text-orange-400"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </motion.div>
  );
};

export default Register;

// Add this at the end of your existing styles
const style = document.createElement('style');
style.textContent = `
  .slide {
    transform: translateX(100%);
    opacity: 0;
    transition: transform 300ms ease-in-out, opacity 300ms ease-in-out;
  }
`;
document.head.appendChild(style);