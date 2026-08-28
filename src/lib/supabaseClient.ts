// Supabase client — optional during migration to self-hosted backend.
// When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set the client
// is null and all Supabase-dependent features (realtime, storage URLs)
// gracefully degrade while auth uses the backend JWT API instead.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Lazy-create the client only when env vars are present
let _supabase: any = null;

export function getSupabase() {
  if (!isSupabaseConfigured) return null;
  if (_supabase) return _supabase;

  // Dynamic import to avoid the createClient call when not configured
  const { createClient } = require('@supabase/supabase-js');
  _supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return _supabase;
}

// For backward compatibility — most files import { supabase } from here
// This will be null when env vars are missing (safe to call .auth etc on? NO — use getSupabase())
export const supabase = isSupabaseConfigured
  ? (() => {
      const { createClient } = require('@supabase/supabase-js');
      return createClient(supabaseUrl!, supabaseAnonKey!, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });
    })()
  : null;
