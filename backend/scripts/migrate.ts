/**
 * Puurga Migration Runner
 *
 * Runs all pending migrations in the backend/migrations folder.
 * Tracks which migrations have already been applied in a local
 * `_migrations` table so they are never run twice.
 *
 * Usage:
 *   ts-node scripts/migrate.ts          — run all pending migrations
 *   ts-node scripts/migrate.ts --status — list applied / pending
 */

import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import sequelize from '../config/database';

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const TRACKING_TABLE = '_migrations';

// ─── Bootstrap tracking table ───────────────────────────────────────────────

async function ensureTrackingTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getApplied(): Promise<Set<string>> {
  const [rows] = await sequelize.query(
    `SELECT name FROM ${TRACKING_TABLE} ORDER BY applied_at`
  ) as [{ name: string }[], unknown];
  return new Set(rows.map((r) => r.name));
}

async function markApplied(name: string) {
  await sequelize.query(
    `INSERT INTO ${TRACKING_TABLE} (name) VALUES (:name) ON CONFLICT DO NOTHING`,
    { replacements: { name } }
  );
}

// ─── Collect migration files ─────────────────────────────────────────────────

type MigrationFile = {
  name: string;   // filename used as the tracking key
  file: string;   // absolute path
  type: 'ts' | 'sql';
};

function collectMigrations(): MigrationFile[] {
  const allowed = /\.(ts|sql)$/;

  // Skip files that are not real versioned migrations
  const ignored = new Set([
    'add_content_column_now.sql',
    'add_images_to_messages.sql',
    'create_call_invites_table.sql',
    'create_friends_tables.sql',
    'create_get_friend_suggestions.sql',
    'create_groups_tables.sql',
    'create_messaging_tables.sql',
    'create_messaging_tables_simple.sql',
    'create_settings_tables.sql',
    'fix_purges_manually.sql',
    'fix_statuses_and_story_views.sql',
'20240121133500_create_get_user_relations_function.sql',
    'optimize_storage_listing.sql',
  ]);

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => allowed.test(f) && !f.endsWith('.js') && !ignored.has(f))
    .sort()                               // alphabetical = chronological
    .map((f) => ({
      name: f,
      file: path.join(MIGRATIONS_DIR, f),
      type: f.endsWith('.sql') ? 'sql' : 'ts',
    }));
}

// ─── Run a single migration ──────────────────────────────────────────────────

async function runTs(file: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(file);

  // Resolve the up() function — supports both export styles
  //   Style A (Sequelize CLI):  export = { async up(queryInterface) { ... } }
  //   Style B (direct):         export async function up() { ... }
  //   Style C (default export): export default { up() { ... } }
  let upFn: Function | undefined;
  if (typeof mod.up === 'function') {
    upFn = mod.up;
  } else if (typeof mod.default?.up === 'function') {
    upFn = mod.default.up;
  }

  if (!upFn) {
    throw new Error(`Migration has no exported 'up' function: ${file}`);
  }

  // Detect Style A by checking how many parameters the function declares.
  // Style A functions declare at least one param (queryInterface).
  // Style B functions declare zero params.
  const needsQueryInterface = upFn.length > 0;

  if (needsQueryInterface) {
    // Provide the Sequelize queryInterface so old CLI-style migrations work
    const qi = sequelize.getQueryInterface();
    await upFn(qi, sequelize.constructor);
  } else {
    await upFn();
  }
}


async function runSql(file: string) {
  const sql = fs.readFileSync(file, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await sequelize.query(stmt);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const statusOnly = process.argv.includes('--status');

  await ensureTrackingTable();
  const applied = await getApplied();
  const migrations = collectMigrations();
  const pending = migrations.filter((m) => !applied.has(m.name));

  if (statusOnly) {
    console.log('\n📋 Migration status\n');
    for (const m of migrations) {
      const tag = applied.has(m.name) ? '✅ applied ' : '⏳ pending ';
      console.log(`  ${tag} ${m.name}`);
    }
    console.log(
      `\n  Total: ${migrations.length} | Applied: ${applied.size} | Pending: ${pending.length}\n`
    );
    process.exit(0);
  }

  if (pending.length === 0) {
    console.log('✅ All migrations are up to date. Nothing to run.');
    process.exit(0);
  }

  console.log(`\n🚀 Running ${pending.length} pending migration(s)…\n`);

  for (const m of pending) {
    process.stdout.write(`  ▶ ${m.name} … `);
    try {
      if (m.type === 'ts') {
        await runTs(m.file);
      } else {
        await runSql(m.file);
      }
      await markApplied(m.name);
      console.log('✅ done');
    } catch (err: any) {
      console.log('❌ FAILED');
      console.error(`\n    Error: ${err.message}\n`);
      console.error('    Migration runner stopped. Fix the error and re-run.\n');
      process.exit(1);
    }
  }

  console.log('\n✅ All migrations applied successfully.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error in migration runner:', err);
  process.exit(1);
});
