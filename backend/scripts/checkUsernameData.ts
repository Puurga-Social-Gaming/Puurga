import { supabase } from '../config/supabase';

async function checkUsernameData() {
  try {
    console.log('Checking username data in profiles table...');
    
    // Get all users to see what usernames are stored
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, username, email, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }
    
    console.log('✅ Found profiles:');
    profiles?.forEach((profile, index) => {
      console.log(`${index + 1}. Profile:`, {
        id: profile.id,
        full_name: profile.full_name,
        username: profile.username,
        email: profile.email,
        created_at: profile.created_at
      });
    });
    
    // Check auth users to see what metadata is stored
    console.log('\n📋 Checking auth users metadata...');
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    
    if (authUsers && authUsers.users.length > 0) {
      console.log('Auth users with metadata:');
      authUsers.users.slice(0, 5).forEach((user, index) => {
        console.log(`${index + 1}. Auth User:`, {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
          created_at: user.created_at
        });
      });
    }
    
    // Check if there's a mismatch between auth metadata and profile data
    if (profiles && profiles.length > 0 && authUsers && authUsers.users.length > 0) {
      console.log('\n🔍 Checking for mismatches...');
      
      const profile = profiles[0];
      const authUser = authUsers.users.find(u => u.id === profile.id);
      
      if (authUser) {
        console.log('Profile vs Auth comparison for user:', profile.id);
        console.log('Profile username:', profile.username);
        console.log('Auth metadata username:', authUser.user_metadata?.username);
        console.log('Auth metadata full_name:', authUser.user_metadata?.full_name);
        
        if (profile.username !== authUser.user_metadata?.username) {
          console.log('⚠️ Username mismatch detected!');
          console.log('Profile has:', profile.username);
          console.log('Auth metadata has:', authUser.user_metadata?.username);
        } else {
          console.log('✅ Username matches between profile and auth metadata');
        }
      }
    }
    
    console.log('\n✅ Username data check completed!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkUsernameData();
