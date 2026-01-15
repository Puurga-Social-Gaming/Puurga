import { supabase } from '../config/supabase';

async function checkUsers() {
  try {
    console.log('Checking Supabase users...');
    
    // Check if we can connect to Supabase
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, username, email')
      .limit(5);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    console.log('Found profiles:', profiles?.length || 0);
    if (profiles && profiles.length > 0) {
      console.log('Sample profiles:');
      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.full_name} (${profile.username}) - ${profile.email || 'No email'}`);
      });
    }

    // Try to list auth users (requires service role key)
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error fetching auth users (may need service role key):', authError.message);
      } else {
        console.log('\nAuth users found:', authUsers.users.length);
        if (authUsers.users.length > 0) {
          console.log('Sample auth users:');
          authUsers.users.slice(0, 3).forEach((user, index) => {
            console.log(`${index + 1}. ${user.email} - Created: ${new Date(user.created_at).toLocaleDateString()}`);
          });
        }
      }
    } catch (authListError) {
      console.log('Cannot list auth users - service role key may not be configured');
    }

    // Suggest creating a test user
    console.log('\n=== To create a test user ===');
    console.log('You can either:');
    console.log('1. Use the Supabase dashboard to create a user');
    console.log('2. Register through your app');
    console.log('3. Use this script to create a test user (uncomment the code below)');
    
    // Create a test user for login
    const testEmail = 'test@puurga.com';
    const testPassword = 'TestPassword123!';
    
    console.log(`\nCreating test user: ${testEmail}`);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User',
        username: 'testuser'
      }
    });
    
    if (createError) {
      console.error('Error creating test user:', createError);
      if (createError.message.includes('already registered')) {
        console.log('✅ Test user already exists! You can use these credentials:');
        console.log(`Email: ${testEmail}`);
        console.log(`Password: ${testPassword}`);
      }
    } else {
      console.log('✅ Test user created successfully!');
      console.log(`Email: ${testEmail}`);
      console.log(`Password: ${testPassword}`);
      
      // Create profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: newUser.user.id,
          full_name: 'Test User',
          username: 'testuser',
          email: testEmail
        });
        
      if (profileError) {
        console.error('Error creating profile:', profileError);
      } else {
        console.log('✅ Profile created successfully!');
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkUsers();
