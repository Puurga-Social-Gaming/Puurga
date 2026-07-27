/**
 * Apply message_trash migration (soft-delete / trash for DMs).
 * Usage: cd backend && npx ts-node scripts/applyMessageTrash.ts
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('Missing SUPABASE_URL / service role key in backend/.env');
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, '../migrations/20260716_message_trash.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('Applying:', sqlPath);

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Prefer RPC exec_sql if available; otherwise print SQL for manual run
  const { error: rpcError } = await supabase.rpc('exec_sql', { query: sql });
  if (rpcError) {
    console.warn('RPC exec_sql unavailable:', rpcError.message);
    console.log('\n--- Run this SQL in the Supabase SQL editor ---\n');
    console.log(sql);
    console.log('\n--- end ---\n');
    // Still try a lightweight probe / create via REST is not possible for DDL
    process.exit(rpcError.message.includes('Could not find') ? 0 : 1);
  }

  console.log('message_trash migration applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
