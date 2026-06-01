/**
 * Applies backend/migrations/20260427_credit_system_v2.sql to the Puurga Supabase DB.
 *
 * Usage:
 *   SUPABASE_DB_URL='postgresql://postgres.[ref]:[password]@...pooler.supabase.com:6543/postgres' \
 *     npx tsx scripts/applyCreditSystemV2Migration.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

async function main(): Promise<void> {
  if (!dbUrl) {
    console.error('Set SUPABASE_DB_URL (Supabase → Project Settings → Database → Connection string).');
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, '../migrations/20260427_credit_system_v2.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('Applying credit_system_v2 migration...');
    await client.query(sql);
    console.log('Migration applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
