import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { z } from 'zod';
import PuurgaLogo from '../components/Icons/PuurgaLogo';
import { supabase } from '../lib/supabaseClient';

const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);
  const [checkingToken, setCheckingToken] = useState(true);
  
  const navigate = useNavigate();

  // Check if there's a valid session (user came from email link)
  useEffect(() => {
    const checkSession = async () => {
      try {
        setCheckingToken(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          setIsValidToken(false);
          toast.error('Invalid or expired reset link. Please request a new one.');
        }
      } catch (err) {
        setIsValidToken(false);
        toast.error('Error validating reset link.');
      } finally {
        setCheckingToken(false);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Validate passwords
      const result = passwordSchema.safeParse({ password, confirmPassword });
      if (!result.success) {
        const errorMessage = result.error.issues[0].message;
        setError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      setLoading(true);

      // Update password using Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        toast.error(updateError.message);
        return;
      }

      toast.success('Password reset successfully!');
      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Loading state - checking token
  if (checkingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted">Validating reset link...</p>
        </motion.div>
      </div>
    );
  }

  // Invalid token state
  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="card-gradient p-8 rounded-xl shadow-2xl text-center">
            <div className="flex justify-center mb-6">
              <PuurgaLogo />
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-4">Invalid Reset Link</h1>
            <p className="text-muted mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>

            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full px-4 py-2 rounded-lg bg-accent text-white font-semibold hover:opacity-90 transition-all shadow-theme-button hover:shadow-lg mb-4"
            >
              Request New Link
            </button>

            <button
              onClick={() => navigate('/login')}
              className="w-full px-4 py-2 rounded-lg bg-background-secondary text-foreground font-semibold hover:opacity-90 transition-all"
            >
              Back to Login
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="card-gradient p-8 rounded-xl shadow-2xl text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex justify-center mb-6"
            >
              <div className="bg-green-500/20 p-3 rounded-full">
                <CheckCircle size={48} className="text-green-500" />
              </div>
            </motion.div>

            <h1 className="text-2xl font-bold text-foreground mb-2">Password Reset Successful!</h1>
            <p className="text-muted mb-6">
              Your password has been successfully reset. You can now log in with your new password.
            </p>

            <p className="text-muted text-sm">Redirecting to login...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="card-gradient p-8 rounded-xl shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <PuurgaLogo />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-foreground mb-2">
            Reset Your Password
          </h1>
          <p className="text-center text-muted mb-8">
            Enter a new password to secure your account.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-muted" size={20} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-2 bg-background-secondary border border-background-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-foreground placeholder-muted transition-all"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-muted mt-2">
                Minimum 8 characters. All special characters are allowed (e.g., #, ;, @, $, !, %, *, ?, &, etc.)
              </p>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-muted" size={20} />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-2 bg-background-secondary border border-background-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-foreground placeholder-muted transition-all"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-muted hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full px-4 py-2 rounded-lg bg-accent text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-theme-button hover:shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Resetting...
                </div>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-muted text-xs mt-6">
            Remember your password?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-accent hover:underline font-semibold"
            >
              Sign in
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
