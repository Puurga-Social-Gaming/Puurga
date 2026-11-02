/**
 * Promote / demote a user's role in both `users` and `profiles` tables.
 *
 * Usage:
 *   npm run role -- --email mashiyanechris@gmail.com --role super_admin
 *   npm run role -- --username chrissy --role super_admin
 *   npm run role -- --email someone@gmail.com --role user        (demote)
 *
 * Flags:
 *   --email     Email of the target user (use this OR --username)
 *   --username  Username of the target user
 *   --role      Role to set (default: super_admin). Typical values:
 *               super_admin | admin | moderator | user
 *   --list      Just list users and their current roles, change nothing
 */

import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { QueryTypes } from 'sequelize';
import sequelize from '../config/database';

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (key.includes('=')) {
        // --key=value form
        const eq = key.indexOf('=');
        const k = key.slice(0, eq);
        args[k] = key.slice(eq + 1);
      } else if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = 'true';
      }
    }
  }
  return args;
}

interface TargetUser {
  id: string;
  username: string;
  email: string;
  users_role: string | null;
  profiles_role: string | null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.list) {
    const all = await sequelize.query<TargetUser>(
      `SELECT u.id, u.username, u.email, u.role AS users_role, p.role AS profiles_role
       FROM users u
       LEFT JOIN profiles p ON p.id = u.id
       ORDER BY u.created_at ASC`,
      { type: QueryTypes.SELECT }
    );
    console.log('\n👥 Users and roles:');
    for (const u of all) {
      const role = u.users_role || u.profiles_role || 'user';
      if (role !== 'user' && role !== '') {
        console.log(`   ${role.padEnd(12)} ${u.username} <${u.email}>`);
      }
    }
    console.log(`   (${all.length} user(s) total, non-default roles shown)\n`);
    process.exit(0);
  }

  const email = (args.email || '').trim().toLowerCase();
  const username = (args.username || '').trim().toLowerCase();
  const role = (args.role || 'super_admin').trim();

  if (!email && !username) {
    console.error('❌ Missing --email or --username. Example:');
    console.error('   npm run role -- --email mashiyanechris@gmail.com --role super_admin');
    console.error('   npm run role -- --list');
    process.exit(1);
  }

  const where = email ? 'LOWER(u.email) = :email' : 'LOWER(u.username) = :username';
  const params: Record<string, string> = email ? { email } : { username };

  const rows = await sequelize.query<TargetUser>(
    `SELECT u.id, u.username, u.email, u.role AS users_role, p.role AS profiles_role
     FROM users u
     LEFT JOIN profiles p ON p.id = u.id
     WHERE ${where}`,
    { replacements: params, type: QueryTypes.SELECT }
  );

  if (!rows.length) {
    console.error(`❌ No user found with ${email ? 'email' : 'username'} "${email || username}"`);
    process.exit(1);
  }

  const user = rows[0];
  console.log(`\n👤 Found: ${user.username} <${user.email}> (id ${user.id})`);
  console.log(`   current role: users=${user.users_role || 'user'}, profiles=${user.profiles_role || 'user'}`);
  console.log(`   setting to:   ${role}`);

  await sequelize.query(
    `UPDATE users SET role = :role, updated_at = NOW() WHERE id = :id`,
    { replacements: { role, id: user.id }, type: QueryTypes.UPDATE }
  );
  await sequelize.query(
    `UPDATE profiles SET role = :role, updated_at = NOW() WHERE id = :id`,
    { replacements: { role, id: user.id }, type: QueryTypes.UPDATE }
  );

  console.log(`✅ Role updated to "${role}" on both users and profiles.`);
  console.log('   Log out and back in for the frontend to pick it up.\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error updating role:', err);
  process.exit(1);
});
