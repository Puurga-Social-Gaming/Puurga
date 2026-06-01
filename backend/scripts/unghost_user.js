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

async function unghostUser(email) {
  try {
    console.log(`\n--- Unghosting user ${email} ---`);
    
    // Find user
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      console.error(`User not found!`);
      return;
    }

    const userId = user.id;
    console.log(`User found: ID = ${userId}`);

    // Update profiles table - set is_ghost to false and purge_count to 0
    const { error: pError } = await supabase
      .from('profiles')
      .update({ 
        is_ghost: false,
        purge_count: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (pError) {
      console.error('Error updating profiles:', pError.message);
    } else {
      console.log('✅ Profile updated - is_ghost: false, purge_count: 0');
    }

    // Also check/update users table if it exists
    const { error: uError } = await supabase
      .from('users')
      .update({ 
        is_ghost: false,
        purge_count: 0
      })
      .eq('id', userId);
    
    if (!uError) {
      console.log('✅ Users table updated as well');
    }

    console.log('\nSUCCESS! User is no longer ghosted.');

  } catch (err) {
    console.error('Error:', err.message || err);
  }
}

const email = process.argv[2] || 'patrick@gmail.com';
unghostUser(email);