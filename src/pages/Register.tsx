import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import PuurgaLogo from '../components/Icons/PuurgaLogo';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import WelcomeScreen from '../components/Loading/WelcomeScreen';
import LoadingScreen from '../components/Loading/LoadingScreen';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { preloadPosts } from '../utils/preloadPosts';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import Button from '../components/ui/Button';
import { signInWithGoogle } from '../lib/googleAuth';

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
  const [oauthLoading, setOauthLoading] = useState(false);
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
  const { t } = useTranslation();

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

  // Listen for popstate (browser back/forward) events
  useEffect(() => {
    const handlePopState = () => {
      setInitialLoading(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
          return { valid: false, message: t('auth.nameRequired') };
        }
        if (value.trim().length < 2) {
          return { valid: false, message: t('auth.nameMinLength') };
        }
        return { valid: true, message: '' };

      case 'email': {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!value.trim()) {
          return { valid: false, message: t('auth.emailRequired') };
        }
        if (!emailRegex.test(value.trim())) {
          return { valid: false, message: t('auth.validEmail') };
        }
        return { valid: true, message: '' };
      }

      case 'username': {
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!value.trim()) {
          return { valid: false, message: t('auth.usernameRequired') };
        }
        if (!usernameRegex.test(value.trim())) {
          return { valid: false, message: t('auth.usernameInvalid') };
        }
        if (value.trim().length < 3) {
          return { valid: false, message: t('auth.usernameMinLength') };
        }
        return { valid: true, message: '' };
      }

      case 'password':
        if (!value) {
          return { valid: false, message: t('auth.passwordRequired') };
        }
        if (value.length < 8) {
          return { valid: false, message: t('auth.passwordMinLength') };
        }
        return { valid: true, message: '' };

      case 'verifyPassword':
        if (!value) {
          return { valid: false, message: t('auth.confirmPasswordRequired') };
        }
        if (value !== password) {
          return { valid: false, message: t('auth.passwordsDoNotMatch') };
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
        break;
      case 'email':
        setEmail(value);
        break;
      case 'username':
        setUsername(value);
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

    // Validate all fields
    const nameValidation = validateField('name', name);
    const emailValidation = validateField('email', email);
    const usernameValidation = validateField('username', username);
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
      const user = await register(name.trim(), email.trim(), password, username.trim());
      if (user) {
        setShowWelcome(true);
        
        // Start preloading posts immediately while welcome screen is showing
        preloadPosts();
        
        setTimeout(() => {
          navigate('/home');
        }, 3500);
      }
    } catch (err: unknown) {
      let errorMessage = t('auth.registrationFailed');
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMessage = (err as { message: string }).message;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setOauthLoading(true);
      await signInWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth.googleSignInFailed');
      toast.error(message);
      setOauthLoading(false);
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
      className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 dark"
    >
      <div className="register-container w-full max-w-md space-y-8 transition-transform duration-300">
        <div className="text-center">
          <PuurgaLogo size={48} className="mx-auto text-white" />
          <h2 className="mt-6 text-3xl font-bold text-white">{t('auth.joinPuurga')}</h2>
          <p className="mt-2 text-gray-400">{t('auth.connectWithCommunity')}</p>
        </div>

        <div className="space-y-4">
          <GoogleSignInButton onClick={handleGoogleSignIn} isLoading={oauthLoading} />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2d2d2d]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#0a0a0a] text-gray-400">{t('auth.orRegisterWithEmail')}</span>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-2 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                {t('auth.fullName')}
              </label>
              <div className="relative">
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className={`mt-1 block w-full rounded-lg bg-[#1a1a1a] border px-4 py-2 text-white focus:ring-2 focus:ring-white focus:border-transparent focus:border-transparent transition-all duration-200 ${
                    validations.name.valid ? 'border-[#2d2d2d]' : 'border-red-500'
                  }`}
                  placeholder={t('auth.enterName')}
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
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300">
                {t('auth.username')}
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => handleFieldChange('username', e.target.value)}
                  className={`mt-1 block w-full rounded-lg bg-[#1a1a1a] border px-4 py-2 text-white focus:ring-2 focus:ring-white focus:border-transparent focus:border-transparent transition-all duration-200 ${
                    validations.username.valid ? 'border-[#2d2d2d]' : 'border-red-500'
                  }`}
                  placeholder={t('auth.chooseUsername')}
                />
                {username && (
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {validations.username.valid ? (
                      <Check className="text-green-500" size={20} />
                    ) : (
                      <X className="text-red-500" size={20} />
                    )}
                  </span>
                )}
              </div>
              {!validations.username.valid && (
                <p className="mt-1 text-sm text-red-500">{validations.username.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                {t('auth.emailAddress')}
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className={`mt-1 block w-full rounded-lg bg-[#1a1a1a] border px-4 py-2 text-white focus:ring-2 focus:ring-white focus:border-transparent focus:border-transparent transition-all duration-200 ${
                    validations.email.valid ? 'border-[#2d2d2d]' : 'border-red-500'
                  }`}
                  placeholder={t('auth.enterEmail')}
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
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  className={`mt-1 block w-full rounded-lg bg-[#1a1a1a] border px-4 py-2 text-white focus:ring-2 focus:ring-white focus:border-transparent focus:border-transparent pr-10 transition-all duration-200 ${
                    validations.password.valid ? 'border-[#2d2d2d]' : 'border-red-500'
                  }`}
                  placeholder={t('auth.choosePassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
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
                {t('auth.confirmPassword')}
              </label>
              <div className="relative">
                <input
                  id="verifyPassword"
                  type={showVerifyPassword ? "text" : "password"}
                  value={verifyPassword}
                  onChange={(e) => handleFieldChange('verifyPassword', e.target.value)}
                  className={`mt-1 block w-full rounded-lg bg-[#1a1a1a] border px-4 py-2 text-white focus:ring-2 focus:ring-white focus:border-transparent focus:border-transparent pr-10 transition-all duration-200 ${
                    validations.verifyPassword.valid ? 'border-[#2d2d2d]' : 'border-red-500'
                  }`}
                  placeholder={t('auth.verifyPassword')}
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

          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm font-medium"
          >
            {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
          </Button>
          
          <p className="text-center text-sm text-gray-400">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link 
              to="/login" 
              onClick={handleSignInClick}
              className="font-medium text-white hover:text-gray-300"
            >
              {t('auth.signIn')}
            </Link>
          </p>
        </form>
      </div>
    </motion.div>
  );
};

export default Register;