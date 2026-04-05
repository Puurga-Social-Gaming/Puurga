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

async function checkProfilesSchema(): Promise<void> {
  console.log('🔍 Checking profiles table schema...\n');

  // Get one profile to see the structure
  const { data: sampleProfile, error: sampleError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .limit(1)
    .single();

  if (sampleError) {
    console.error('❌ Error fetching sample profile:', sampleError);
  } else if (sampleProfile) {
    console.log('📋 Sample profile structure:');
    console.log(Object.keys(sampleProfile).join(', '));
    console.log('\n');

    // Check if email column exists
    if ('email' in sampleProfile) {
      console.log('✅ Email column EXISTS in profiles table');
    } else {
      console.log('❌ Email column DOES NOT EXIST in profiles table');
    }
  }

  // Try to insert a test profile to see the error
  console.log('\n🧪 Testing profile insert...');
  const testPayload = {
    id: 'test-id-' + Date.now(),
    email: 'test@example.com',
    full_name: 'Test User',
    username: 'test_' + Date.now(),
    role: 'user'
  };

  const { data: insertData, error: insertError } = await supabaseAdmin
    .from('profiles')
    .insert(testPayload)
    .select()
    .single();

  if (insertError) {
    console.error('❌ Insert failed:', insertError);
    console.error('   Code:', insertError.code);
    console.error('   Message:', insertError.message);
    console.error('   Details:', insertError.details);
    console.error('   Hint:', insertError.hint);
  } else {
    console.log('✅ Insert succeeded!');
    console.log('   Inserted ID:', insertData?.id);

    // Clean up test record
    await supabaseAdmin.from('profiles').delete().eq('id', testPayload.id);
    console.log('   Cleaned up test record');
  }
}

async function createMissingEmailColumn(): Promise<void> {
  console.log('\n⚠️  ATTENTION: This script cannot modify the schema directly.');
  console.log('   Please run this SQL in your Supabase dashboard:\n');
  console.log('   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;');
  console.log('');
}

checkProfilesSchema()
  .then(() => {
    console.log('\n✅ Schema check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
