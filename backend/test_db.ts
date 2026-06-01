import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.from('statuses').select('*').limit(1);
  if (error) console.error(error);
  console.log("Columns:", Object.keys(data?.[0] || {}));
}
run();
