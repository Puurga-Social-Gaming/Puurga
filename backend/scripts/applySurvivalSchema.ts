/**
 * Applies backend/scripts/apply-survival-schema.sql to the Puurga Supabase DB.
 *
 * Usage:
 *   SUPABASE_DB_URL='postgresql://postgres.[ref]:[password]@aws-0-....pooler.supabase.com:6543/postgres' \
 *     npx tsx scripts/applySurvivalSchema.ts
 *
 * Get the URL from: Supabase → Project Settings → Database → Connection string (URI)
 */
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

async function main(): Promise<void> {
  if (!dbUrl) {
    console.error(
      'Missing SUPABASE_DB_URL.\n' +
        'Supabase → Project Settings → Database → Connection string (URI),\n' +
        'then:\n' +
        "  SUPABASE_DB_URL='postgresql://...' npx tsx scripts/applySurvivalSchema.ts"
    );
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, 'apply-survival-schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('Connected. Applying survival schema...');
    await client.query(sql);
    const { rows } = await client.query(
      `SELECT
         (SELECT count(*)::int FROM user_survival_state) AS survival_rows,
         (SELECT count(*)::int FROM profiles) AS profiles`
    );
    console.log('Migration applied successfully.', rows[0]);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
});
