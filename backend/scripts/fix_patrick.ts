const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Manually load env from the backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUser(email: string) {
  try {
    console.log(`\n--- Promoting ${email} to Super Admin ---`);
    
    // 1. Find user in Auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const user = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      console.error(`User with email ${email} not found in Auth!`);
      return;
    }

    const userId = user.id;
    console.log(`User found: ID = ${userId}`);

    // 2. Update Auth metadata
    const { error: metaError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { ...user.user_metadata, role: 'super_admin' }
    });
    if (metaError) console.error('Warning: Auth metadata update failed:', metaError.message);
    else console.log('✅ Auth metadata updated.');

    // 3. Update 'profiles' table
    const profileData = {
      id: userId,
      email: email.toLowerCase(),
      role: 'super_admin',
      updated_at: new Date().toISOString()
    };

    const { error: pError } = await supabase.from('profiles').upsert(profileData, { onConflict: 'id' });
    if (pError) console.error('Error updating profiles table:', pError.message);
    else console.log('✅ Profiles table updated/upserted.');

    // 4. Update 'users' table (since some parts of the app use this)
    const { error: uError } = await supabase.from('users').upsert(profileData, { onConflict: 'id' });
    if (uError) console.error('Error updating users table (might not exist):', uError.message);
    else console.log('✅ Users table updated/upserted.');

    console.log('\nSUCCESS! Please log out and log back in to see the changes.');

  } catch (err: any) {
    console.error('Unexpected error:', err.message || err);
  }
}


const email = process.argv[2] || 'patrick@gmail.com';
fixUser(email);
