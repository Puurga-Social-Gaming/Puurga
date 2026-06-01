const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUser(email) {
  try {
    console.log(`\n--- Promoting ${email} to Super Admin ---`);
    
    // 1. Find user in Auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      console.error(`User with email ${email} not found in Auth!`);
      return;
    }

    const userId = user.id;
    const fullName = user.user_metadata?.full_name || user.email.split('@')[0];
    console.log(`User found: ID = ${userId}, Name = ${fullName}`);

    // 2. Update Auth metadata
    const { error: metaError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { ...user.user_metadata, role: 'super_admin' }
    });
    if (metaError) console.error('Warning: Auth metadata update failed:', metaError.message);
    else console.log('✅ Auth metadata updated.');

    // 3. Get existing profile to preserve data
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // 4. Update 'profiles' table with all required fields
    const profileData = {
      id: userId,
      email: email.toLowerCase(),
      full_name: fullName,
      username: existingProfile?.username || fullName.toLowerCase().replace(/\s+/g, '_'),
      role: 'super_admin',
      updated_at: new Date().toISOString()
    };

    const { error: pError } = await supabase.from('profiles').upsert(profileData, { onConflict: 'id' });
    if (pError) console.error('Error updating profiles table:', pError.message);
    else console.log('✅ Profiles table updated.');

    console.log('\nSUCCESS! User restored as Super Admin. Please log out and log back in.');

  } catch (err) {
    console.error('Unexpected error:', err.message || err);
  }
}

const email = process.argv[2] || 'patrick@gmail.com';
fixUser(email);