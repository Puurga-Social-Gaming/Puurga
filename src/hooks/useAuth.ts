import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabaseClient';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const { setUser } = useUser();
  const navigate = useNavigate();

  const register = useCallback(async (name: string, email: string, password: string, username: string) => {
    if (!name?.trim() || !email?.trim() || !password || !username?.trim()) {
      throw new Error('All fields are required');
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedName = name.trim();

    try {
      setLoading(true);

      // Check if email or username already exists
      try {
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('email, username')
          .or(`email.eq.${trimmedEmail},username.eq.${trimmedUsername}`)
          .maybeSingle();

        if (checkError) {
          if (checkError.message.includes('Failed to fetch')) {
            throw new Error('Network error. Please check your internet connection and try again.');
          }
          throw checkError;
        }
        if (existingUser) {
          if (existingUser.email === trimmedEmail) {
            throw new Error('Email already exists');
          }
          if (existingUser.username === trimmedUsername) {
            throw new Error('Username already exists');
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Network error')) {
          throw error;
        }
        console.error('Error checking existing user:', error);
        // Continue with registration if we can't check for existing users
      }

      // Create auth user
      console.log('Attempting to create auth user with:', {
        email: trimmedEmail,
        metadata: {
          full_name: trimmedName,
          username: trimmedUsername
        }
      });

      try {
        console.log('Starting registration process...');

        // Validate email format more strictly
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        console.log('Email being validated:', trimmedEmail);
        if (!emailRegex.test(trimmedEmail)) {
          throw new Error('Please enter a valid email address');
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: trimmedName,
              username: trimmedUsername
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

        if (authError) {
          console.error('Detailed auth error:', {
            error: authError,
            code: authError.code,
            message: authError.message,
            status: authError.status,
            name: authError.name,
            stack: authError.stack
          });

          if (authError.message.includes('Database error')) {
            console.error('Database error during registration:', authError);
            throw new Error('Unable to create account. Please try again later.');
          }
          if (authError.message.includes('Email address')) {
            throw new Error('Please enter a valid email address');
          }
          throw authError;
        }

        if (!authData.user) {
          console.error('No user data returned from signup');
          throw new Error('Failed to create user account');
        }

        console.log('Auth user created successfully:', {
          id: authData.user.id,
          email: authData.user.email,
          metadata: authData.user.user_metadata
        });

        // Store access token if available
        if (authData.session?.access_token) {
          localStorage.setItem('token', authData.session.access_token);
          console.log('Token stored after registration:', authData.session.access_token.substring(0, 20) + '...');
        } else {
          console.warn('No session token available after registration');
        }

        // Create user profile in 'profiles' table
        const profileData = {
          id: authData.user.id,
          full_name: trimmedName,
          username: trimmedUsername,
          avatar_url: null, // Default to null, can be updated later
          created_at: new Date().toISOString()
        };

        console.log('Attempting to create profile with data:', profileData);

        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert([profileData])
            .select()
            .single();

          if (profileError) {
            console.error('Profile creation error details:', {
              error: profileError,
              code: profileError.code,
              message: profileError.message,
              details: profileError.details,
              hint: profileError.hint,
              data: profileData
            });
            throw profileError;
          }

          if (!profile) {
            throw new Error('Failed to create user profile');
          }

          console.log('Profile created successfully:', profile);
          setUser(profile);
          toast.success('Registration successful! Welcome to Puurga!');
          return profile;
        } catch (error) {
          console.error('Profile creation failed:', error);
          // Fallback if profile creation fails, user is still authenticated
          const fallbackProfile = {
            id: authData.user.id,
            name: trimmedName,
            email: authData.user.email || '',
            username: trimmedUsername,
            avatar: null,
            createdAt: new Date().toISOString(),
            credits: 0
          };
          setUser(fallbackProfile);
          toast.success('Registration successful! Welcome to Puurga!');
          return fallbackProfile;
        }
      } catch (error) {
        console.error('Registration error:', error);
        const message = error instanceof Error ? error.message : 'Registration failed';
        toast.error(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
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

      console.log('Attempting to sign in with Supabase...');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        throw authError;
      }
      if (!authData.session) {
        console.error('No session created:', authData);
        throw new Error('No session created');
      }

      // Store access token so backend API receives Authorization header
      try {
        const token = authData.session.access_token;
        if (token) {
          localStorage.setItem('token', token);
          console.log('Token stored successfully:', token.substring(0, 20) + '...');
        } else {
          console.error('No access token in session');
        }
      } catch (e) {
        console.error('Token storage failed:', e);
      }

      console.log('Auth successful, fetching user profile...');
      // Get user profile from 'profiles' table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw profileError;
      }

      let finalProfile = profile;

      // If profile doesn't exist, create a fallback profile
      if (!profile) {
        console.warn('Profile not found for authenticated user, creating fallback...');
        console.log('User metadata:', authData.user.user_metadata);
        const newProfileData = {
          id: authData.user.id,
          full_name: authData.user.user_metadata.full_name || 'New User',
          username: authData.user.user_metadata.username || authData.user.email?.split('@')[0] || `user_${authData.user.id.substring(0, 8)}`,
          email: authData.user.email,
          avatar_url: null,
          created_at: new Date().toISOString()
        };
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfileData])
          .select()
          .single();

        if (createError) {
          console.error('Failed to create fallback profile:', createError);
          // Fallback to a minimal local profile if DB creation fails
          finalProfile = { id: authData.user.id, name: 'User', username: 'user', createdAt: new Date().toISOString(), email: authData.user.email || '', credits: 0 };
        } else if (createdProfile) {
          finalProfile = createdProfile;
          console.log('Fallback profile created successfully:', finalProfile);
        }
      }

      // Fetch latest user profile from backend
      try {
        const res = await fetch('/api/users/profile', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const backendProfile = await res.json();
          setUser(backendProfile);
          toast.success('Logged in successfully!');
          navigate('/home');
          return backendProfile;
        }
      } catch {
        // fallback to finalProfile
      }

      setUser(finalProfile);
      toast.success('Logged in successfully!');
      navigate('/home');
      return finalProfile;
    } catch (error) {
      console.error('Detailed login error:', error);
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [setUser, navigate]);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      navigate('/login');
      // Clear persisted token used by backend API
      try { localStorage.removeItem('token'); } catch (e) {
        // ignore storage errors
        console.debug('Token removal failed (non-fatal).');
      }
    } catch (error) {
      console.error('Logout error:', error);
      const message = error instanceof Error ? error.message : 'Logout failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [setUser, navigate]);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
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
    forgotPassword,
    loading
  };
}; 