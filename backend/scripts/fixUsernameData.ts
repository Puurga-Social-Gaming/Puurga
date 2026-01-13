import { supabase } from '../config/supabase';

async function fixUsernameData() {
  try {
    console.log('Fixing username data mismatches...');
    
    // Get all auth users
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    
    if (!authUsers || authUsers.users.length === 0) {
      console.log('❌ No auth users found');
      return;
    }
    
    let fixedCount = 0;
    
    for (const authUser of authUsers.users) {
      const userId = authUser.id;
      const authUsername = authUser.user_metadata?.username;
      const authFullName = authUser.user_metadata?.full_name;
      
      if (!authUsername) {
        console.log(`⚠️ Skipping user ${userId} - no username in auth metadata`);
        continue;
      }
      
      // Get the current profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('id', userId)
        .single();
        
      if (profileError) {
        console.log(`⚠️ Error fetching profile for user ${userId}:`, profileError.message);
        continue;
      }
      
      if (!profile) {
        console.log(`⚠️ No profile found for user ${userId}`);
        continue;
      }
      
      // Check if username needs to be fixed
      if (profile.username !== authUsername) {
        console.log(`🔧 Fixing username for user ${userId}:`);
        console.log(`  Current: ${profile.username}`);
        console.log(`  Should be: ${authUsername}`);
        
        const updateData: any = {
          username: authUsername,
          updated_at: new Date().toISOString()
        };
        
        // Also update full_name if it's different
        if (authFullName && profile.full_name !== authFullName) {
          updateData.full_name = authFullName;
          console.log(`  Also updating full_name: ${profile.full_name} → ${authFullName}`);
        }
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId);
          
        if (updateError) {
          console.error(`❌ Error updating profile for user ${userId}:`, updateError);
        } else {
          console.log(`✅ Successfully updated profile for user ${userId}`);
          fixedCount++;
        }
      } else {
        console.log(`✅ Username already correct for user ${userId}: ${profile.username}`);
      }
    }
    
    console.log(`\n✅ Username fix completed! Fixed ${fixedCount} profiles.`);
    
    // Verify the fixes
    console.log('\n🔍 Verifying fixes...');
    const { data: updatedProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (verifyError) {
      console.error('❌ Error verifying fixes:', verifyError);
    } else {
      console.log('Updated profiles:');
      updatedProfiles?.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.full_name} (@${profile.username})`);
      });
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixUsernameData();
