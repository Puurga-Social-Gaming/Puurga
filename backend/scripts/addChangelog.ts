/**
 * Post a changelog entry and notify every Purga user.
 *
 * Usage:
 *   npm run changelog -- --title "Fixed chat bug" --message "Messages now send again" --kind fixed --route /messages
 *   npm run changelog -- --title "New settings page" --kind added --route /settings --version 1.4.0
 *
 * Flags:
 *   --title    (required) Short headline shown in the notification
 *   --message  Longer description of what changed
 *   --kind     added | fixed | changed | improved   (default: changed)
 *   --route    In-app path users land on when they click the notification (e.g. /messages)
 *   --version  Optional version label (e.g. 1.4.0)
 *   --dry-run  Validate and print the entry without creating it or notifying users
 */

import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { ChangelogService, ChangelogKind } from '../services/changelogService';

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = 'true';
      }
    }
  }
  return args;
}

const KINDS: ChangelogKind[] = ['added', 'fixed', 'changed', 'improved'];

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const title = (args.title || '').trim();
  if (!title) {
    console.error('❌ Missing --title. Example:');
    console.error('   npm run changelog -- --title "Fixed chat bug" --message "Messages send again" --kind fixed --route /messages');
    process.exit(1);
  }

  const kind = (args.kind as ChangelogKind) || 'changed';
  if (!KINDS.includes(kind)) {
    console.error(`❌ Invalid --kind "${args.kind}". Use one of: ${KINDS.join(', ')}`);
    process.exit(1);
  }

  const params = {
    title,
    message: args.message || '',
    kind,
    route: args.route || '',
    version: args.version || '',
  };

  if (args['dry-run']) {
    console.log('Dry run — entry that would be posted:');
    console.log(params);
    process.exit(0);
  }

  console.log(`\n📣 Posting changelog entry: "${params.title}"`);
  const { entry, notified } = await ChangelogService.createEntry(params);

  console.log('✅ Changelog entry created');
  console.log(`   id:       ${entry.id}`);
  console.log(`   kind:     ${entry.kind}`);
  console.log(`   title:    ${entry.title}`);
  if (entry.message) console.log(`   message:  ${entry.message}`);
  if (entry.route) console.log(`   route:    ${entry.route}`);
  if (entry.version) console.log(`   version:  ${entry.version}`);
  console.log(`   notified: ${notified} user(s)\n`);

  // Supabase client keeps the process alive — exit explicitly
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error posting changelog entry:', err);
  process.exit(1);
});
