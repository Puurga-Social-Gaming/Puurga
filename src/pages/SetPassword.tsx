import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { z } from 'zod';
import PuurgaLogo from '../components/Icons/PuurgaLogo';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const SetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = schema.safeParse({ email, password });
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to set password');

      toast.success('Password set successfully! You can now log in.');
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <PuurgaLogo />
          <h1 className="text-2xl font-bold text-foreground mt-6 mb-2">Password Set!</h1>
          <p className="text-muted">Redirecting to login...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="card-gradient p-8 rounded-xl shadow-2xl">
          <div className="flex justify-center mb-6"><PuurgaLogo /></div>
          <h1 className="text-2xl font-bold text-center text-foreground mb-2">Set Your Password</h1>
          <p className="text-center text-muted mb-8">Enter your email and choose a new password.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-muted" size={20} />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2 bg-background-secondary border border-background-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-foreground placeholder-muted"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-muted" size={20} />
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full pl-10 pr-4 py-2 bg-background-secondary border border-background-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-foreground placeholder-muted"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading || !email || !password}
              className="w-full px-4 py-2 rounded-lg bg-accent text-black font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-theme-button hover:shadow-lg"
            >
              {loading ? 'Setting...' : 'Set Password'}
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 mt-6">
            <ArrowLeft size={18} className="text-muted" />
            <Link to="/login" className="text-accent hover:underline font-semibold">Back to Login</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SetPassword;
