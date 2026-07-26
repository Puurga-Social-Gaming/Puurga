import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

function isPlaceholderName(name?: string | null): boolean {
  if (!name?.trim()) return true;
  const n = name.trim().toLowerCase();
  return n === 'new user' || n === 'user' || n === 'unknown';
}

function baseUsername(value: string, fallbackId: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().slice(0, 24);
  if (cleaned.length >= 3 && !/^user_[a-f0-9]+$/i.test(cleaned)) return cleaned;
  return `u_${fallbackId.slice(0, 8)}`;
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

/** Creates or heals a profiles row for OAuth / first sign-in */
export async function ensureOAuthProfile(authUser: SupabaseAuthUser): Promise<void> {
  const { data: existing, error: lookupError } = await supabase
    .from('profiles')
    .select('id, full_name, username')
    .eq('id', authUser.id)
    .maybeSingle();

  if (lookupError) {
    console.error('Profile lookup failed:', lookupError);
    throw lookupError;
  }

  const email = authUser.email ?? '';
  const meta = authUser.user_metadata ?? {};
  const fullName =
    (!isPlaceholderName(meta.full_name as string) && (meta.full_name as string)) ||
    (!isPlaceholderName(meta.name as string) && (meta.name as string)) ||
    email.split('@')[0] ||
    'User';

  const usernameSeed =
    (meta.username as string | undefined) ||
    email.split('@')[0] ||
    authUser.id;
  const username = await uniqueUsername(
    baseUsername(usernameSeed, authUser.id),
    authUser.id,
  );

  if (existing) {
    const needsHeal =
      isPlaceholderName(existing.full_name) ||
      /^user_[a-f0-9]{6,12}$/i.test(existing.username || '');
    if (!needsHeal) return;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        username,
        email: email || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authUser.id);

    if (updateError) {
      console.error('OAuth profile heal failed:', updateError);
      throw updateError;
    }
    return;
  }

  const profileData = {
    id: authUser.id,
    email: email || null,
    full_name: fullName,
    username,
    avatar_url:
      (meta.avatar_url as string | undefined) ||
      (meta.picture as string | undefined) ||
      null,
    created_at: new Date().toISOString(),
  };

  const { error: insertError } = await supabase
    .from('profiles')
    .upsert([profileData], { onConflict: 'id' });

  if (insertError) {
    console.error('OAuth profile insert failed:', insertError);
    throw insertError;
  }
}
