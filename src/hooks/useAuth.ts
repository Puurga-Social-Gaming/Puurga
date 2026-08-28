import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useUser } from '../context/UserContext';
import { websocketService } from '../services/websocketService';

function persistUser(raw: Record<string, unknown>, email?: string | null) {
  const name = (raw.full_name || raw.name || '') as string;
  const username = (raw.username || '') as string;
  localStorage.setItem(
    'user',
    JSON.stringify({
      ...raw,
      full_name: name,
      name,
      username,
      email: email || raw.email || null,
    }),
  );
  return { id: raw.id as string, name, username, email: (email || raw.email || '') as string, ...raw };
}

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const { setUser } = useUser();
  const navigate = useNavigate();

  const register = useCallback(async (name: string, email: string, password: string, username: string) => {
    if (!name?.trim() || !email?.trim() || !password || !username?.trim()) {
      throw new Error('All fields are required');
    }
    try {
      setLoading(true);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      localStorage.setItem('token', data.token);
      const normalized = persistUser(data.user, data.user.email) as any;
      setUser(normalized);
      toast.success('Registration successful! Welcome to Puurga!');
      return normalized;
    } catch (error) {
      console.error('Registration error:', error);
      const message = error instanceof Error ? error.message : 'Registration failed';
      toast.error(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      if (!email?.trim() || !password) {
        throw new Error('Email and password are required');
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('token', data.token);

      // Fetch full profile from /api/users/profile for stats
      let profileData = data.user;
      try {
        const profileRes = await fetch('/api/users/profile', {
          headers: { Authorization: `Bearer ${data.token}` },
        });
        if (profileRes.ok) {
          profileData = await profileRes.json();
        }
      } catch {
        // fallback to login response user data
      }

      const normalized = persistUser(profileData, data.user.email) as any;
      setUser(normalized);
      toast.success('Logged in successfully!');
      return normalized;
    } catch (error) {
      console.error('Detailed login error:', error);
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      websocketService.disconnect();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      navigate('/onboarding/video');
    } catch (error) {
      console.error('Logout error:', error);
      const message = error instanceof Error ? error.message : 'Logout failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [setUser, navigate]);

  const signInWithGoogle = useCallback(async () => {
    toast.error('Google sign-in is not yet available. Please use email/password.');
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send reset instructions');
      toast.success(data.message || 'Password reset instructions sent to your email');
    } catch (error) {
      console.error('Password reset error:', error);
      const message = error instanceof Error ? error.message : 'Failed to send reset instructions';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    register,
    login,
    logout,
    signInWithGoogle,
    forgotPassword,
    loading,
  };
};
