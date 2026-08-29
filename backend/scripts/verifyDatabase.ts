import sequelize from '../config/database';
import {
  User, Post, Comment, Like, Reaction, Notification, Follower, FriendRequest,
  Friendship, Message, Conversation, ConversationParticipant, Status, PostPurge,
  UserSurvivalState, Profile
} from '../models';

async function verifyDatabase() {
  console.log('🔍 Starting database schema verification...\n');

  // 1. Authenticate Sequelize connection
  await sequelize.authenticate();
  console.log('✅ 1. Sequelize connection authentication succeeded.');

  // 2. Fetch all table names from PostgreSQL information_schema
  const [tables] = await sequelize.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `) as [{ table_name: string }[], unknown];

  const tableNames = tables.map(t => t.table_name);
  console.log(`\n📋 Found ${tableNames.length} tables in PostgreSQL public schema:`);
  console.log(tableNames.map(t => `  - ${t}`).join('\n'));

  // 3. Verify specific required tables
  const requiredTables = [
    'users', 'profiles', 'conversations', 'posts', 'comments', 'likes', 'reactions',
    'followers', 'friend_requests', 'friendships', 'messages', 'conversation_participants',
    'notifications', 'statuses', 'story_views', 'post_purges', 'user_survival_state',
    'survival_events', 'survival_history', 'global_settings', 'user_settings',
    'credit_transactions', 'redemption_activities', 'groups', 'group_members',
    'group_messages', 'group_message_reactions', 'message_trash', 'message_reactions',
    'user_blocks', 'user_mutes', 'translations', 'user_crypto_keys', 'shares',
    'push_subscriptions', 'superadmin_audit_logs', 'system_error_logs',
    'credit_transfers', 'credit_packages', 'certifications', 'user_certifications',
    'analytics_events', 'game_challenges', '_migrations'
  ];

  const missingTables = requiredTables.filter(t => !tableNames.includes(t));
  if (missingTables.length > 0) {
    console.error('❌ Missing expected tables:', missingTables);
    process.exit(1);
  }
  console.log('✅ 2. All 44 expected tables exist.');

  // 4. Verify critical columns that previously caused errors
  const [cols] = await sequelize.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND (
        (table_name = 'credit_transactions' AND column_name = 'type')
        OR (table_name = 'posts' AND column_name = 'visibility')
        OR (table_name = 'notifications' AND column_name = 'conversation_id')
        OR (table_name = 'notifications' AND column_name = 'receiver_id')
        OR (table_name = 'messages' AND column_name = 'sender_id')
      );
  `) as [{ table_name: string; column_name: string; data_type: string }[], unknown];

  console.log('\n🔍 Verifying previously problematic columns:');
  for (const col of cols) {
    console.log(`  - ${col.table_name}.${col.column_name} (${col.data_type}) ✅`);
  }

  if (cols.length < 5) {
    console.error('❌ Some critical columns are missing! Found:', cols);
    process.exit(1);
  }

  // 5. Test model interactions and User -> Profile auto-sync trigger
  console.log('\n🧪 Testing user creation & auto-sync trigger...');
  const testUser = await User.create({
    name: 'Audit Test User',
    username: 'audit_test_user_' + Date.now(),
    email: `audit_test_${Date.now()}@example.com`,
    password: 'password123',
    role: 'user',
  });

  console.log('  Created User ID:', testUser.id);

  const profile = await Profile.findByPk(testUser.id);
  if (!profile) {
    console.error('❌ Auto-sync trigger failed! Profile row was not created for User.');
    process.exit(1);
  }
  console.log('  Auto-synced Profile found:', profile.id, `(@${profile.username}) ✅`);

  // Clean up test user
  await testUser.destroy();
  console.log('  Cleaned up test user ✅');

  console.log('\n🎉 ALL DATABASE VERIFICATIONS PASSED SUCCESSFULLY!');
  process.exit(0);
}

verifyDatabase().catch((err) => {
  console.error('❌ Database verification failed:', err);
  process.exit(1);
});
