import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface ProfileUser {
  id: string;
  email: string | null;
  username: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface UserMismatch {
  profile: ProfileUser;
  issue: 'missing_in_auth' | 'email_mismatch' | 'orphaned_in_auth';
  authUser?: AuthUser;
}

interface SyncResult {
  profilesWithoutAuth: ProfileUser[];
  authWithoutProfiles: AuthUser[];
  mismatches: UserMismatch[];
}

async function checkAndSyncUsers(): Promise<SyncResult> {
  console.log('🔍 Starting user synchronization check...\n');

  console.log('📊 Fetching all profiles...');
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, username, full_name, role, created_at');

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError);
    process.exit(1);
  }

  console.log(`✅ Found ${profiles?.length || 0} profiles\n`);

  console.log('🔍 Fetching all auth users...');
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error fetching auth users:', authError);
    process.exit(1);
  }

  const authUsersMap = new Map<string, any>();
  authUsers?.users.forEach((user: any) => {
    authUsersMap.set(user.id, {
      id: user.id,
      email: user.email || 'unknown@example.com',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at || null
    });
  });

  console.log(`✅ Found ${authUsers?.users.length || 0} auth users\n`);

  const mismatches: UserMismatch[] = [];
  const profilesWithoutAuth: ProfileUser[] = [];
  const authWithoutProfiles: AuthUser[] = [];

  console.log('🔄 Checking for mismatches...\n');

  for (const profile of (profiles || []) as ProfileUser[]) {
    const authUser = authUsersMap.get(profile.id);

    if (!authUser) {
      profilesWithoutAuth.push(profile);
      mismatches.push({
        profile,
        issue: 'missing_in_auth'
      });
    } else if (profile.email && authUser.email !== profile.email.toLowerCase()) {
      mismatches.push({
        profile,
        issue: 'email_mismatch',
        authUser
      });
    }
  }

  const profileIds = new Set((profiles || []).map((p: any) => p.id));
  authUsersMap.forEach((authUser: any, id: string) => {
    if (!profileIds.has(id)) {
      authWithoutProfiles.push(authUser);
      mismatches.push({
        profile: { id, email: authUser.email, username: 'N/A', full_name: null, role: 'N/A', created_at: '' } as ProfileUser,
        issue: 'orphaned_in_auth',
        authUser
      });
    }
  });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📋 SYNCHRONIZATION REPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`📈 SUMMARY:`);
  console.log(`   • Total Profiles: ${profiles?.length || 0}`);
  console.log(`   • Total Auth Users: ${authUsers?.users.length || 0}`);
  console.log(`   • Profiles missing in Auth: ${profilesWithoutAuth.length}`);
  console.log(`   • Auth users orphaned (no profile): ${authWithoutProfiles.length}`);
  console.log(`   • Email mismatches: ${mismatches.filter(m => m.issue === 'email_mismatch').length}\n`);

  if (profilesWithoutAuth.length > 0) {
    console.log('⚠️  PROFILES WITHOUT AUTH RECORDS:');
    console.log('─────────────────────────────────────────────────────────────────');
    profilesWithoutAuth.forEach((profile, i) => {
      console.log(`\n${i + 1}. ID: ${profile.id}`);
      console.log(`   Username: @${profile.username}`);
      console.log(`   Email: ${profile.email || '(not set)'}`);
      console.log(`   Full Name: ${profile.full_name || '(not set)'}`);
      console.log(`   Role: ${profile.role}`);
      console.log(`   Created: ${profile.created_at}`);
    });
    console.log('');
  }

  if (authWithoutProfiles.length > 0) {
    console.log('⚠️  AUTH USERS WITHOUT PROFILES:');
    console.log('─────────────────────────────────────────────────────────────────');
    authWithoutProfiles.forEach((user, i) => {
      console.log(`\n${i + 1}. ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Last Sign In: ${user.last_sign_in_at || '(never)'}`);
    });
    console.log('');
  }

  const emailMismatches = mismatches.filter(m => m.issue === 'email_mismatch');
  if (emailMismatches.length > 0) {
    console.log('⚠️  EMAIL MISMATCHES:');
    console.log('─────────────────────────────────────────────────────────────────');
    emailMismatches.forEach((mismatch, i) => {
      console.log(`\n${i + 1}. Profile @${mismatch.profile.username} (${mismatch.profile.id})`);
      console.log(`   Profile Email: ${mismatch.profile.email}`);
      console.log(`   Auth Email: ${mismatch.authUser?.email}`);
    });
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');

  if (profilesWithoutAuth.length > 0) {
    console.log('💡 RECOMMENDED ACTIONS:');
    console.log('─────────────────────────────────────────────────────────────────\n');

    console.log('1. FOR PROFILES WITHOUT AUTH:');
    console.log('   These users cannot log in because they don\'t have auth records.');
    console.log('   Options:');
    console.log('   a) Delete these orphan profiles');
    console.log('   b) Create auth records manually (requires email verification)');
    console.log('   c) If you know the email/password, recreate via admin UI\n');

    console.log('2. FOR AUTH USERS WITHOUT PROFILES:');
    console.log('   These auth records have no corresponding profile.');
    console.log('   Options:');
    console.log('   a) Delete these orphan auth records');
    console.log('   b) Create profiles for them\n');

    console.log('3. FOR EMAIL MISMATCHES:');
    console.log('   Update either the profile or auth email to match.\n');
  }

  return { profilesWithoutAuth, authWithoutProfiles, mismatches };
}

async function cleanupOrphanProfiles(): Promise<void> {
  console.log('\n🧹 CLEANUP MODE - Removing orphan profiles...\n');

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, username');

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  const authIds = new Set(authUsers?.users.map((u: any) => u.id) || []);

  const orphanProfiles = (profiles as ProfileUser[] || []).filter(p => !authIds.has(p.id));

  if (orphanProfiles.length === 0) {
    console.log('✅ No orphan profiles to clean up.');
    return;
  }

  console.log(`Found ${orphanProfiles.length} orphan profiles:\n`);

  for (const profile of orphanProfiles) {
    console.log(`Deleting profile: @${profile.username} (${profile.id})...`);
    const { error } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', profile.id);

    if (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    } else {
      console.log(`   ✅ Deleted`);
    }
  }

  console.log('\n✅ Cleanup complete!');
}

async function cleanupOrphanAuthUsers(): Promise<void> {
  console.log('\n🧹 CLEANUP MODE - Removing orphan auth users...\n');

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id');

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();

  if (!authUsers) return;

  const profileIds = new Set(profiles?.map(p => p.id) || []);
  const orphanAuthUsers = authUsers.users.filter((u: any) => !profileIds.has(u.id));

  if (orphanAuthUsers.length === 0) {
    console.log('✅ No orphan auth users to clean up.');
    return;
  }

  console.log(`Found ${orphanAuthUsers.length} orphan auth users:\n`);

  for (const user of orphanAuthUsers) {
    console.log(`Deleting auth user: ${user.email} (${user.id})...`);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    } else {
      console.log(`   ✅ Deleted`);
    }
  }

  console.log('\n✅ Cleanup complete!');
}

async function syncEmails(): Promise<void> {
  console.log('\n🔄 SYNC MODE - Synchronizing emails between profiles and auth...\n');

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, username');

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();

  if (!profiles || !authUsers) return;

  const authUsersMap = new Map<string, any>();
  authUsers.users.forEach((user: any) => {
    authUsersMap.set(user.id, user);
  });

  let synced = 0;
  let failed = 0;

  for (const profile of profiles as ProfileUser[]) {
    const authUser = authUsersMap.get(profile.id);

    if (authUser && profile.email && authUser.email !== profile.email.toLowerCase()) {
      console.log(`Syncing email for @${profile.username}:`);
      console.log(`   Profile: ${profile.email}`);
      console.log(`   Auth: ${authUser.email}`);

      const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
        email: profile.email.toLowerCase()
      });

      if (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        failed++;
      } else {
        console.log(`   ✅ Synced`);
        synced++;
      }
    }
  }

  console.log(`\n✅ Synced ${synced} emails, ${failed} failed`);
}

const args = process.argv.slice(2);

if (args.includes('--cleanup-profiles')) {
  cleanupOrphanProfiles().catch(console.error);
} else if (args.includes('--cleanup-auth')) {
  cleanupOrphanAuthUsers().catch(console.error);
} else if (args.includes('--cleanup-all')) {
  Promise.all([cleanupOrphanProfiles(), cleanupOrphanAuthUsers()])
    .then(() => console.log('\n✅ All cleanups complete!'))
    .catch(console.error);
} else if (args.includes('--sync-emails')) {
  syncEmails().catch(console.error);
} else {
  checkAndSyncUsers().catch(console.error);
}
