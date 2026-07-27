import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabaseClient';
import { websocketService } from '../services/websocketService';
import { signInWithGoogle as googleOAuthSignIn } from '../lib/googleAuth';
import {
  normalizeAppUser,
  needsProfileHeal,
  resolveDisplayName,
  resolveUsername,
} from '../utils/userProfile';

type AuthUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

async function upsertProfileFromAuth(
  authUser: AuthUserLike,
  overrides?: { full_name?: string; username?: string },
) {
  const meta = authUser.user_metadata ?? {};
  const email = authUser.email ?? '';

  const full_name = resolveDisplayName({
    full_name: overrides?.full_name,
    metadata: meta,
    email,
  });

  const username = resolveUsername({
    username: overrides?.username,
    metadata: meta,
    email,
    userId: authUser.id,
  });

  const payload = {
    id: authUser.id,
    email: email.trim().toLowerCase() || null,
    full_name,
    username,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    // Unique username conflict — retry with suffix
    if (error.code === '23505' || error.message?.toLowerCase().includes('username')) {
      const retryPayload = {
        ...payload,
        username: resolveUsername({
          email,
          userId: authUser.id,
        }),
      };
      const { data: retryData, error: retryError } = await supabase
        .from('profiles')
        .upsert(retryPayload, { onConflict: 'id' })
        .select('*')
        .single();
      if (retryError) throw retryError;
      return retryData;
    }
    throw error;
  }

  return data;
}

async function fetchBackendProfile(token: string) {
  const res = await fetch('/api/users/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

function persistUser(raw: Record<string, unknown>, email?: string | null) {
  const normalized = normalizeAppUser(raw, email);
  localStorage.setItem(
    'user',
    JSON.stringify({
      ...raw,
      full_name: normalized.name,
      name: normalized.name,
      username: normalized.username,
      email: normalized.email,
    }),
  );
  return normalized;
}

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const { setUser } = useUser();
  const navigate = useNavigate();

  const register = useCallback(async (name: string, email: string, password: string, username: string) => {
    if (!name?.trim() || !email?.trim() || !password || !username?.trim()) {
      throw new Error('All fields are required');
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const trimmedName = name.trim();

    try {
      setLoading(true);

      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(trimmedEmail)) {
        throw new Error('Please enter a valid email address');
      }

      // Check conflicts (non-blocking if network fails)
      try {
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('email, username')
          .or(`email.eq.${trimmedEmail},username.eq.${trimmedUsername}`)
          .maybeSingle();

        if (!checkError && existingUser) {
          if (existingUser.email === trimmedEmail) throw new Error('Email already exists');
          if (existingUser.username === trimmedUsername) throw new Error('Username already exists');
        }
      } catch (error) {
        if (error instanceof Error && (error.message.includes('already exists') || error.message.includes('Network'))) {
          throw error;
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            name: trimmedName,
            username: trimmedUsername,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        if (authError.message.includes('Database error')) {
          throw new Error('Unable to create account. Please try again later.');
        }
        if (authError.message.toLowerCase().includes('email')) {
          throw new Error('Please enter a valid email address');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      if (authData.session?.access_token) {
        localStorage.setItem('token', authData.session.access_token);
      }

      // Ensure auth metadata is correct (protects against empty trigger metadata)
      await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          name: trimmedName,
          username: trimmedUsername,
        },
      }).catch(() => undefined);

      // Upsert profile — heals trigger-created "New User" placeholders
      const profile = await upsertProfileFromAuth(authData.user, {
        full_name: trimmedName,
        username: trimmedUsername,
      });

      const normalized = persistUser(
        { ...profile, email: trimmedEmail },
        trimmedEmail,
      );
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

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) throw authError;
      if (!authData.session || !authData.user) {
        throw new Error('No session created');
      }

      const token = authData.session.access_token;
      localStorage.setItem('token', token);

      // Load or heal profile
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile || needsProfileHeal(profile)) {
        profile = await upsertProfileFromAuth(authData.user, {
          full_name: resolveDisplayName({
            full_name: profile?.full_name,
            metadata: authData.user.user_metadata,
            email: authData.user.email,
          }),
          username: resolveUsername({
            username: profile?.username,
            metadata: authData.user.user_metadata,
            email: authData.user.email,
            userId: authData.user.id,
          }),
        });
      }

      // Prefer backend profile (includes stats), fall back to healed local profile
      const backendProfile = await fetchBackendProfile(token);
      const source = backendProfile && !needsProfileHeal(backendProfile)
        ? backendProfile
        : { ...profile, email: authData.user.email };

      // If backend still has placeholders, heal again then re-fetch
      if (backendProfile && needsProfileHeal(backendProfile)) {
        await upsertProfileFromAuth(authData.user);
        const healed = await fetchBackendProfile(token);
        const normalized = persistUser(
          healed ?? { ...profile, email: authData.user.email },
          authData.user.email,
        );
        setUser(normalized);
        toast.success('Logged in successfully!');
        return normalized;
      }

      const normalized = persistUser(source, authData.user.email);
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      const message = error instanceof Error ? error.message : 'Logout failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [setUser, navigate]);

  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      await googleOAuthSignIn();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed';
      toast.error(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Password reset instructions sent to your email');
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
