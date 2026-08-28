import { supabaseAdmin, isSupabaseAvailable } from '../config/supabase';

export type CreditSchemaSupport = {
  lastActiveColumn: 'last_active_at' | 'last_seen';
  hasInactivityColumns: boolean;
  hasDailyCapColumns: boolean;
  hasDailyLoginColumn: boolean;
  usesAccountStatus: boolean;
};

let cached: CreditSchemaSupport | null = null;

async function columnExists(column: string): Promise<boolean> {
  if (!isSupabaseAvailable || !supabaseAdmin) {
    return false;
  }
  const { error } = await supabaseAdmin.from('profiles').select(column).limit(1);
  return !error;
}

export async function getCreditSchemaSupport(): Promise<CreditSchemaSupport> {
  if (cached) return cached;

  const hasLastActiveAt = await columnExists('last_active_at');
  const hasInactivityColumns =
    (await columnExists('inactivity_level')) && (await columnExists('account_status'));
  const hasDailyCapColumns =
    (await columnExists('daily_likes_count')) && (await columnExists('daily_comments_count'));
  const hasDailyLoginColumn = await columnExists('last_daily_login_at');
  const usesAccountStatus = await columnExists('account_status');

  cached = {
    lastActiveColumn: hasLastActiveAt ? 'last_active_at' : 'last_seen',
    hasInactivityColumns,
    hasDailyCapColumns,
    hasDailyLoginColumn,
    usesAccountStatus,
  };

  console.log('CreditSchema:', cached);
  return cached;
}

export function resetCreditSchemaCache(): void {
  cached = null;
}
