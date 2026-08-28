
import { supabase, requireSupabase, requireSupabaseAdmin } from './config/supabase';

async function checkColumns() {
  const supabaseClient = requireSupabase();
  const supabaseAdminClient = requireSupabaseAdmin();
  const { data, error } = await supabaseClient.rpc('get_table_columns', { table_name: 'profiles' });
  if (error) {
    // If RPC doesn't exist, try a simple select
    const { data: selectData, error: selectError } = await supabaseClient.from('profiles').select('*').limit(1);
    if (selectError) {
      console.error('Error:', selectError);
    } else {
      console.log('Columns:', Object.keys(selectData[0] || {}));
    }
  } else {
    console.log('Columns:', data);
  }
}

checkColumns();
