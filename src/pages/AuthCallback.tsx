import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { ensureOAuthProfile } from '../services/oauthProfileService';
import { useUser } from '../context/UserContext';
import LoadingScreen from '../components/Loading/LoadingScreen';
import { preloadPosts } from '../utils/preloadPosts';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const completeOAuth = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        const { data: { session }, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!session?.user) {
          throw new Error('No session after Google sign-in');
        }

        localStorage.setItem('token', session.access_token);
        await ensureOAuthProfile(session.user);

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profile) {
          setUser({
            id: profile.id,
            name: profile.full_name ?? profile.name ?? '',
            username: profile.username ?? '',
            email: session.user.email ?? profile.email ?? '',
            avatar: profile.avatar_url ?? null,
            createdAt: profile.created_at ?? new Date().toISOString(),
            credits: profile.credits ?? 0,
          });
          localStorage.setItem('user', JSON.stringify(profile));
        }

        preloadPosts();
        toast.success('Signed in with Google');
        navigate('/home', { replace: true });
      } catch (error) {
        console.error('OAuth callback error:', error);
        const message =
          error instanceof Error ? error.message : 'Google sign-in failed';
        toast.error(message);
        navigate('/login', { replace: true });
      }
    };

    void completeOAuth();
  }, [navigate, setUser]);

  return <LoadingScreen />;
};

export default AuthCallback;
