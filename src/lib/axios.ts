import axios from 'axios';
import { toast } from 'react-hot-toast';
import { supabase } from './supabaseClient';

interface EnhancedError extends Error {
  response?: any;
  status?: number;
  data?: any;
}

// ─── Module-level token cache ────────────────────────────────────────────────
// We keep one authoritative copy of the current access token here.
// The request interceptor reads it synchronously — no await, no race conditions.
// It is updated whenever the Supabase auth state fires any event.
let _cachedToken: string | null = localStorage.getItem('token');

// One-time async seeding: pull the active session on module load so that we
// have a token even before any Supabase auth event fires. This does NOT block
// the request interceptor — it just fills the cache silently.
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.access_token && session.access_token !== _cachedToken) {
    _cachedToken = session.access_token;
    localStorage.setItem('token', _cachedToken);
  }
}).catch(() => { /* non-fatal */ });

// Keep the cache up-to-date for every Supabase auth event (TOKEN_REFRESHED,
// SIGNED_IN, SIGNED_OUT, etc.) — no more stale tokens after silent refreshes.
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.access_token) {
    _cachedToken = session.access_token;
    localStorage.setItem('token', _cachedToken);
  } else if (_event === 'SIGNED_OUT') {
    _cachedToken = null;
    localStorage.removeItem('token');
  }
});

// ─── Axios instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000, // Increased to 2 minutes to handle large video uploads
});

// ─── Request interceptor ─────────────────────────────────────────────────────
// Reads from the module-level cache — synchronous, zero race-condition risk.
api.interceptors.request.use(
  async (config) => {
    // Refresh the cache from localStorage in case another module wrote it
    let stored = localStorage.getItem('token');
    
    // If no token in memory or local storage, let's try getting it from Supabase session directly
    if (!stored) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          stored = session.access_token;
          localStorage.setItem('token', stored);
        }
      } catch (err) {
        console.warn('Failed to get session in interceptor:', err);
      }
    }

    if (stored && stored !== _cachedToken) _cachedToken = stored;

    if (_cachedToken) {
      config.headers.Authorization = `Bearer ${_cachedToken}`;
    }

    
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor ────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('❌ Response error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    // Network / server-unreachable
    if (!error.response) {
      toast.error('Network error - Please check if the server is running');
      return Promise.reject(new Error('Network error - Please check if the server is running'));
    }

    // ── 401 handler ────────────────────────────────────────────────────────────
    // Only attempt token refresh when:
    //  1. We had a token (requests without tokens should not trigger logout)
    //  2. We haven't already retried (prevents infinite loops)
    //  3. Avoid calling refreshSession if we can see the current session is fine
    //     (the 401 might come from Supabase rate-limiting our own refresh calls)
    if (error.response?.status === 401 && !error.config?._retry) {
      const tokenWasSent = !!(error.config?.headers?.['Authorization']);

      if (tokenWasSent) {
        error.config._retry = true;

        // First: check if the Supabase SDK already has a valid session (no
        // network call needed — getSession() reads from its internal cache).
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token && session.access_token !== _cachedToken) {
            // SDK gave us a fresher token — retry with it immediately
            _cachedToken = session.access_token;
            localStorage.setItem('token', _cachedToken);
            error.config.headers['Authorization'] = `Bearer ${_cachedToken}`;
            console.log('🔁 Token updated from session — retrying request');
            return api.request(error.config);
          }
          if (session?.access_token) {
            // We already had the same token and the server still 401'd —
            // not a token-staleness issue; don't nuke the session
            console.warn('🔒 Server 401 with valid token — not forcing logout');
          }
        } catch (sessionErr) {
          console.warn('getSession failed during 401 recovery:', sessionErr);
        }

        // Only force logout if we truly have no valid session at all
        const { data: { session: currentSession } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        if (!currentSession) {
          console.log('🔒 No valid session — clearing and redirecting to login');
          _cachedToken = null;
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          supabase.auth.signOut().catch((e: any) => console.error('SignOut error', e)).finally(() => {
            window.location.href = '/login';
          });
          return Promise.reject(new Error('Session expired. Please login again.'));
        }
      }

      // No token was sent — don't redirect (login page, public route, etc.)
      console.warn('401 received — no token was sent, skipping logout');
    }

    // ── Enhance and forward all other errors ──────────────────────────────────
    const enhancedError: EnhancedError = new Error(
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred'
    );
    enhancedError.response = error.response;
    enhancedError.status = error.response?.status;
    enhancedError.data = error.response?.data;
    return Promise.reject(enhancedError);
  }
);

export default api;