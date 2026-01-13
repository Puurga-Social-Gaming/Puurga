import { supabase } from '../config/supabase';

async function testProfileUpdate() {
  try {
    console.log('Testing profile update functionality...');
    
    // Get a real user ID
    const { data: users } = await supabase.auth.admin.listUsers();
    if (!users || users.users.length === 0) {
      console.log('❌ No users found in auth.users');
      return;
    }
    
    const userId = users.users[0].id;
    console.log('Using user ID:', userId);
    
    // First, check if the user has a profile
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return;
    }
    
    if (!existingProfile) {
      console.log('❌ No profile found for user. Creating one...');
      
      // Create a basic profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          full_name: 'Test User',
          username: 'testuser',
          bio: 'Test bio',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
        
      if (createError) {
        console.error('❌ Error creating profile:', createError);
        return;
      }
      
      console.log('✅ Created profile:', newProfile);
    } else {
      console.log('✅ Found existing profile:', existingProfile);
    }
    
    // Test profile update
    const updateData = {
      full_name: 'Updated Test User',
      bio: 'Updated test bio',
      location: 'Test Location',
      website: 'https://example.com',
      occupation: 'Test Occupation',
      education: 'Test Education',
      relationship: 'single',
      is_private: false,
      hide_from_suggestions: false,
      message_requests: 'everyone',
      show_read_receipts: true,
      show_online_status: true,
      comment_privacy: 'everyone',
      story_privacy: 'everyone',
      updated_at: new Date().toISOString()
    };
    
    console.log('Updating profile with:', updateData);
    
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
      
    if (updateError) {
      console.error('❌ Error updating profile:', updateError);
      
      // Check if it's a column issue
      if (updateError.code === 'PGRST204') {
        console.log('Column not found error. Let me check what columns exist...');
        
        // Try with minimal data
        const minimalUpdate = {
          full_name: 'Updated Test User',
          bio: 'Updated test bio',
          updated_at: new Date().toISOString()
        };
        
        const { data: minimalResult, error: minimalError } = await supabase
          .from('profiles')
          .update(minimalUpdate)
          .eq('id', userId)
          .select()
          .single();
          
        if (minimalError) {
          console.error('❌ Even minimal update failed:', minimalError);
        } else {
          console.log('✅ Minimal update succeeded:', minimalResult);
        }
      }
    } else {
      console.log('✅ Profile updated successfully:', updatedProfile);
    }
    
    // Test fetching the updated profile
    const { data: fetchedProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (fetchError) {
      console.error('❌ Error fetching updated profile:', fetchError);
    } else {
      console.log('✅ Fetched updated profile:', fetchedProfile);
    }
    
    // Test users table interaction (for avatar/cover photo)
    console.log('\nTesting users table interaction...');
    
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (userError) {
      console.error('❌ Error fetching user row:', userError);
    } else if (!userRow) {
      console.log('❌ No user row found');
    } else {
      console.log('✅ Found user row:', userRow);
      
      // Test updating avatar_url
      const { data: updatedUser, error: updateUserError } = await supabase
        .from('users')
        .update({ 
          avatar_url: 'http://localhost:3005/uploads/test-avatar.jpg',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
        
      if (updateUserError) {
        console.error('❌ Error updating user avatar:', updateUserError);
      } else {
        console.log('✅ Updated user avatar:', updatedUser);
      }
    }
    
    console.log('\n✅ Profile update tests completed!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testProfileUpdate();
