import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testUserCreation(): Promise<void> {
  console.log('🧪 Testing user creation flow...\n');

  const testEmail = `test_${Date.now()}@example.com`;
  const testUsername = `test_${Date.now().toString().slice(-8)}`;
  
  console.log('1. Creating auth user...');
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: 'testpassword123',
    email_confirm: true,
    user_metadata: { full_name: 'Test User', username: testUsername }
  });

  if (authError) {
    console.error('❌ Auth user creation failed:', authError.message);
    return;
  }

  console.log('✅ Auth user created:', authData.user?.id);

  if (!authData.user) {
    console.error('❌ No auth user returned');
    return;
  }

  const userId = authData.user.id;

  console.log('\n2. Inserting into profiles table...');
  
  const profilePayload = {
    id: userId,
    email: testEmail,
    full_name: 'Test User',
    username: testUsername,
    role: 'user',
    is_private: false,
    hide_from_suggestions: false,
    message_requests: 'everyone',
    show_read_receipts: true,
    show_online_status: true,
    comment_privacy: 'everyone',
    story_privacy: 'everyone',
    is_blocked: false
  };

  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert(profilePayload)
    .select()
    .single();

  if (profileError) {
    console.error('❌ Profile insert failed!');
    console.error('   Code:', profileError.code);
    console.error('   Message:', profileError.message);
    console.error('   Details:', profileError.details);
    console.error('   Hint:', profileError.hint);
    
    console.log('\n3. Cleaning up auth user...');
    await supabaseAdmin.auth.admin.deleteUser(userId);
    console.log('✅ Cleaned up auth user');
    return;
  }

  console.log('✅ Profile created:', profileData?.id);

  console.log('\n4. Cleaning up test data...');
  await supabaseAdmin.from('profiles').delete().eq('id', userId);
  await supabaseAdmin.auth.admin.deleteUser(userId);
  console.log('✅ Cleaned up test data');

  console.log('\n✅ User creation flow works correctly!');
}

testUserCreation()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
