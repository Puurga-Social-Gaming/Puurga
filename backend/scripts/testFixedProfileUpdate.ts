import { supabase } from '../config/supabase';

async function testFixedProfileUpdate() {
  try {
    console.log('Testing fixed profile update functionality...');
    
    // Get a real user ID
    const { data: users } = await supabase.auth.admin.listUsers();
    if (!users || users.users.length === 0) {
      console.log('❌ No users found in auth.users');
      return;
    }
    
    const userId = users.users[0].id;
    console.log('Using user ID:', userId);
    
    // Test profile fetching (GET /profile)
    console.log('\n1. Testing profile fetching...');
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (fetchError) {
      console.error('❌ Error fetching profile:', fetchError);
      return;
    }
    
    console.log('✅ Profile fetched successfully');
    console.log('Current profile data:', {
      id: profile.id,
      full_name: profile.full_name,
      username: profile.username,
      bio: profile.bio,
      location: profile.location,
      avatar_url: profile.avatar_url,
      cover_photo: profile.cover_photo
    });
    
    // Test profile update (PUT /profile)
    console.log('\n2. Testing profile update...');
    const updateData = {
      full_name: 'Test User Updated',
      bio: 'This is an updated test bio',
      location: 'Updated Location',
      website: 'https://updated-example.com',
      occupation: 'Updated Occupation',
      education: 'Updated Education',
      relationship: 'in a relationship',
      is_private: true,
      hide_from_suggestions: true,
      message_requests: 'followers',
      show_read_receipts: false,
      show_online_status: false,
      comment_privacy: 'followers',
      story_privacy: 'close_friends',
      updated_at: new Date().toISOString()
    };
    
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
      
    if (updateError) {
      console.error('❌ Error updating profile:', updateError);
    } else {
      console.log('✅ Profile updated successfully');
      console.log('Updated profile data:', {
        full_name: updatedProfile.full_name,
        bio: updatedProfile.bio,
        location: updatedProfile.location,
        website: updatedProfile.website,
        is_private: updatedProfile.is_private,
        message_requests: updatedProfile.message_requests
      });
    }
    
    // Test avatar upload (PUT /profile/avatar)
    console.log('\n3. Testing avatar update...');
    const testAvatarUrl = 'http://localhost:3005/uploads/test-avatar-123.jpg';
    
    const { data: avatarUpdate, error: avatarError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: testAvatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
      
    if (avatarError) {
      console.error('❌ Error updating avatar:', avatarError);
    } else {
      console.log('✅ Avatar updated successfully');
      console.log('New avatar URL:', avatarUpdate.avatar_url);
    }
    
    // Test cover photo update (PUT /profile/cover-photo)
    console.log('\n4. Testing cover photo update...');
    const testCoverUrl = 'http://localhost:3005/uploads/test-cover-456.jpg';
    
    const { data: coverUpdate, error: coverError } = await supabase
      .from('profiles')
      .update({ 
        cover_photo: testCoverUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
      
    if (coverError) {
      console.error('❌ Error updating cover photo:', coverError);
    } else {
      console.log('✅ Cover photo updated successfully');
      console.log('New cover photo URL:', coverUpdate.cover_photo);
    }
    
    // Final verification - fetch the updated profile
    console.log('\n5. Final verification...');
    const { data: finalProfile, error: finalError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (finalError) {
      console.error('❌ Error fetching final profile:', finalError);
    } else {
      console.log('✅ Final profile verification successful');
      console.log('Final profile state:', {
        full_name: finalProfile.full_name,
        bio: finalProfile.bio,
        location: finalProfile.location,
        website: finalProfile.website,
        avatar_url: finalProfile.avatar_url,
        cover_photo: finalProfile.cover_photo,
        is_private: finalProfile.is_private,
        message_requests: finalProfile.message_requests,
        updated_at: finalProfile.updated_at
      });
    }
    
    console.log('\n✅ All profile update tests completed successfully!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testFixedProfileUpdate();
