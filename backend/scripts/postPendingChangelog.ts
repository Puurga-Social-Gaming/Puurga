/**
 * Post every pending changelog entry found in backend/changelog-pending/.
 *
 * Called automatically by server-deploy.sh after each deployment, but can
 * also be run manually:  npm run changelog:pending
 *
 * How it works:
 *   1. Reads every *.json file in backend/changelog-pending/
 *   2. Posts each one as changelog entry + notification to ALL users
 *   3. Moves each posted file into .posted/ so it is never sent twice
 *
 * JSON format (per file):
 *   {
 *     "title":   "The Watchman: obstacles now play fair",
 *     "message": "Only direct hits hurt now.",
 *     "kind":    "fixed",          // added | fixed | changed | improved
 *     "route":   "/games/watchman" // where users land when they click
 *     "version": "1.4.0"           // optional
 *   }
 *
 * Files that fail to post are LEFT in place and retried on the next run.
 */

import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { ChangelogService, ChangelogKind } from '../services/changelogService';

const PENDING_DIR = path.join(__dirname, '..', 'changelog-pending');
const POSTED_DIR = path.join(PENDING_DIR, '.posted');

const KINDS: ChangelogKind[] = ['added', 'fixed', 'changed', 'improved'];

function ensureDirs() {
  if (!fs.existsSync(PENDING_DIR)) fs.mkdirSync(PENDING_DIR, { recursive: true });
  if (!fs.existsSync(POSTED_DIR)) fs.mkdirSync(POSTED_DIR, { recursive: true });
}

async function main() {
  ensureDirs();

  const files = fs
    .readdirSync(PENDING_DIR)
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.log('ℹ️  No pending changelog entries. Nothing to announce.');
    process.exit(0);
  }

  console.log(`\n📣 Announcing ${files.length} pending changelog entry(ies)…\n`);

  let ok = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(PENDING_DIR, file);
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, 'utf8');
    } catch (err: any) {
      console.log(`  ⚠️  ${file} — unreadable, skipped (${err.message})`);
      failed++;
      continue;
    }

    let entry: any;
    try {
      entry = JSON.parse(raw);
    } catch (err: any) {
      console.log(`  ⚠️  ${file} — invalid JSON, skipped (${err.message})`);
      failed++;
      continue;
    }

    const title = (entry.title || '').trim();
    if (!title) {
      console.log(`  ⚠️  ${file} — missing "title", skipped`);
      failed++;
      continue;
    }
    const kind = KINDS.includes(entry.kind) ? (entry.kind as ChangelogKind) : 'changed';

    try {
      const { entry: created, notified } = await ChangelogService.createEntry({
        title,
        message: entry.message || '',
        kind,
        route: entry.route || '',
        version: entry.version || '',
      });

      // Move to .posted/ so it is never announced twice
      fs.renameSync(filePath, path.join(POSTED_DIR, file));

      console.log(`  ✅ ${file}`);
      console.log(`      id: ${created.id}  kind: ${created.kind}  notified: ${notified} user(s)`);
      console.log(`      "${title}"`);
      ok++;
    } catch (err: any) {
      console.log(`  ❌ ${file} — FAILED, will retry next run: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n   Done: ${ok} posted, ${failed} skipped/failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error posting pending changelog entries:', err);
  process.exit(1);
});
