import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

function baseUsername(value: string, fallbackId: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().slice(0, 24);
  if (cleaned.length >= 3) return cleaned;
  return `user_${fallbackId.slice(0, 8)}`;
}

async function uniqueUsername(candidate: string, userId: string): Promise<string> {
  const { data: taken } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', candidate)
    .neq('id', userId)
    .maybeSingle();

  if (!taken) return candidate;
  return `${candidate.slice(0, 20)}_${userId.slice(0, 6)}`;
}

/** Creates a profiles row for first-time Google (or other OAuth) sign-in */
export async function ensureOAuthProfile(authUser: SupabaseAuthUser): Promise<void> {
  const { data: existing, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', authUser.id)
    .maybeSingle();

  if (lookupError) {
    console.error('Profile lookup failed:', lookupError);
    throw lookupError;
  }
  if (existing) return;

  const email = authUser.email ?? '';
  const meta = authUser.user_metadata ?? {};
  const fullName =
    (meta.full_name as string | undefined) ||
    (meta.name as string | undefined) ||
    email.split('@')[0] ||
    'New User';

  const usernameSeed =
    (meta.username as string | undefined) ||
    email.split('@')[0] ||
    authUser.id;
  const username = await uniqueUsername(
    baseUsername(usernameSeed, authUser.id),
    authUser.id,
  );

  const profileData = {
    id: authUser.id,
    full_name: fullName,
    username,
    avatar_url:
      (meta.avatar_url as string | undefined) ||
      (meta.picture as string | undefined) ||
      null,
    created_at: new Date().toISOString(),
  };

  const { error: insertError } = await supabase.from('profiles').insert([profileData]);
  if (insertError) {
    console.error('OAuth profile insert failed:', insertError);
    throw insertError;
  }
}
