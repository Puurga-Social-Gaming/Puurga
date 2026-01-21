import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { z } from 'zod';
import PuurgaLogo from '../components/Icons/PuurgaLogo';
import { supabase } from '../lib/supabaseClient';

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Validate email
      const result = emailSchema.safeParse({ email });
      if (!result.success) {
        setError(result.error.issues[0].message);
        return;
      }

      setLoading(true);
      const trimmedEmail = email.trim().toLowerCase();

      // Determine the correct redirect URL
      // For development on localhost:5174, use that explicitly
      // For production, use window.location.origin
      const getRedirectUrl = () => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          // Development: always use localhost:5174
          return 'http://localhost:5174/reset-password';
        }
        // Production: use current domain
        return `${window.location.origin}/reset-password`;
      };

      // Use Supabase's built-in password recovery
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: getRedirectUrl(),
      });

      if (supabaseError) {
        if (supabaseError.message.includes('User not found')) {
          // For security, don't reveal whether email exists
          toast.success('If an account with that email exists, you will receive a password reset link.');
          setSubmitted(true);
        } else {
          setError(supabaseError.message);
          toast.error(supabaseError.message);
        }
      } else {
        toast.success('Password reset link sent! Check your email.');
        setSubmitted(true);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="card-gradient p-8 rounded-xl shadow-2xl">
            <div className="flex justify-center mb-6">
              <PuurgaLogo />
            </div>

            <h1 className="text-2xl font-bold text-center text-foreground mb-2">
              Check Your Email
            </h1>
            <p className="text-center text-muted mb-6">
              We've sent a password reset link to <span className="font-semibold text-foreground">{email}</span>
            </p>

            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-foreground mb-2">Next steps:</p>
              <ul className="text-sm text-muted space-y-2 list-disc list-inside">
                <li>Check your email for the reset link</li>
                <li>Click the link to proceed with password reset</li>
                <li>If you don't see it, check your spam folder</li>
                <li>The link expires in 24 hours</li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full px-4 py-2 rounded-lg bg-accent text-white font-semibold hover:opacity-90 transition-all shadow-theme-button hover:shadow-lg mb-4"
            >
              Back to Login
            </button>

            <p className="text-center text-muted text-sm">
              Didn't receive the email?{' '}
              <button
                onClick={() => setSubmitted(false)}
                className="text-accent hover:underline font-semibold"
              >
                Try again
              </button>
            </p>
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
            Forgot Password?
          </h1>
          <p className="text-center text-muted mb-8">
            Enter your email and we'll send you a link to reset your password.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-muted" size={20} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2 bg-background-secondary border border-background-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-foreground placeholder-muted transition-all"
                  disabled={loading}
                />
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
              disabled={loading || !email}
              className="w-full px-4 py-2 rounded-lg bg-accent text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-theme-button hover:shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </div>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <ArrowLeft size={18} className="text-muted" />
            <Link to="/login" className="text-accent hover:underline font-semibold">
              Back to Login
            </Link>
          </div>

          {/* Footer */}
          <p className="text-center text-muted text-xs mt-8">
            Remember your password?{' '}
            <Link to="/login" className="text-accent hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
