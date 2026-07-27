import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import PuurgaLogo from '../components/Icons/PuurgaLogo';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../components/UI/Button';
import { z } from 'zod';
import { preloadPosts } from '../utils/preloadPosts';
import { useOnboardingAudioStore } from '../store/onboardingAudioStore';
import WelcomeScreen from '../components/Loading/WelcomeScreen';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { signInWithGoogle } from '../lib/googleAuth';

const loginSchema = z.object({
  email: z.string().email('invalidEmail'),
  password: z.string()
    .min(8, 'passwordMinLength')
});

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<{ name: string; username: string; avatar?: string | null } | null>(null);

  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const fadeOutAudio = useOnboardingAudioStore((s) => s.fadeOutAudio);

  // Fade out onboarding audio when login screen appears
  useEffect(() => {
    fadeOutAudio();
  }, []);

  // CRITICAL: Check for password recovery flow FIRST, before anything else
  // This handles when Supabase redirects to root/login with recovery tokens
  useEffect(() => {
    const hash = window.location.hash;
    console.log('🔐 Login page loaded - checking hash:', hash);

    // Check for recovery tokens in hash
    if (hash && (hash.includes('type=recovery') || hash.includes('type=magiclink'))) {
      console.log('✅ Recovery/Magic link detected! Redirecting to reset-password...');
      // Pass the hash along so Supabase can process the token
      window.location.href = `/reset-password${hash}`;
      return;
    }

    // Also listen for Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('🔐 Auth state change:', event);
      if (event === 'PASSWORD_RECOVERY') {
        console.log('✅ PASSWORD_RECOVERY event detected! Redirecting...');
        navigate('/reset-password');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    // Check for saved email
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, [location]);

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

      // Start preloading posts immediately
      preloadPosts();

      setLoggedInUser({ name: user.name || user.username, username: user.username, avatar: user.avatar });
      setShowWelcome(true);
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

  const handleGoogleSignIn = async () => {
    try {
      setOauthLoading(true);
      await signInWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      toast.error(message);
      setOauthLoading(false);
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

  if (showWelcome && loggedInUser) {
    return (
      <WelcomeScreen
        username={loggedInUser.name}
        onComplete={() => navigate('/home')}
      />
    );
  }

  return (
    <motion.div
      initial={{ x: 0 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", duration: 0.5 }}
      className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 dark"
    >
      <div className="login-container w-full max-w-md space-y-8 transition-transform duration-300">
        <div className="text-center">
          <PuurgaLogo size={48} className="mx-auto text-white" />
          <h2 className="mt-6 text-3xl font-bold text-white">{t('auth.welcomeBack')}</h2>
          <p className="mt-2 text-gray-400">{t('auth.signInToAccount')}</p>
        </div>

        <div className="mt-8 space-y-4">
          <GoogleSignInButton onClick={handleGoogleSignIn} isLoading={oauthLoading} />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2d2d2d]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#0a0a0a] text-gray-400">{t('auth.orSignInWithEmail')}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-6">
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
                {t('auth.emailAddress') || 'Email address'}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg bg-[#1a1a1a] border border-[#2d2d2d] px-4 py-2 text-white focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-200"
                placeholder={t('auth.enterEmail') || 'Enter your email'}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                {t('auth.password') || 'Password'}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg bg-[#1a1a1a] border border-[#2d2d2d] px-4 py-2 text-white focus:ring-2 focus:ring-white focus:border-transparent pr-10 transition-all duration-200"
                  placeholder={t('auth.enterPassword') || 'Enter your password'}
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
                  className="h-4 w-4 rounded border-gray-300 text-white focus:ring-white bg-[#1a1a1a]"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                  {t('auth.rememberMe') || 'Remember me'}
                </label>
              </div>
              <Link to="/forgot-password" className="text-sm text-white hover:text-gray-300">
                {t('auth.forgotPassword') || 'Forgot password?'}
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm font-medium transition-colors"
          >
            {loading ? (t('auth.signingIn') || 'Signing in...') : (t('auth.login') || 'Sign in')}
          </Button>

          <p className="text-center text-sm text-gray-400">
            {t('auth.dontHaveAccount')}{' '}
            <Link
              to="/register"
              onClick={handleRegisterClick}
              className="font-medium text-white hover:text-gray-300"
            >
              {t('auth.signUp')}
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