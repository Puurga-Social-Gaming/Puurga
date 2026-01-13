import { supabase } from '../config/supabase';

async function testNameUpdate() {
  try {
    console.log('Testing name update functionality...');
    
    // Get a real user ID
    const { data: users } = await supabase.auth.admin.listUsers();
    if (!users || users.users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    const userId = users.users[0].id;
    console.log('Testing with user:', userId);
    
    // Test 1: Check current profile
    console.log('\n1. Checking current profile...');
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (fetchError) {
      console.error('❌ Error fetching profile:', fetchError);
      return;
    }
    
    console.log('Current profile:', {
      id: currentProfile.id,
      full_name: currentProfile.full_name,
      username: currentProfile.username,
      email: currentProfile.email
    });
    
    // Test 2: Update name directly in database
    console.log('\n2. Testing direct name update...');
    const newName = 'Test Updated Name ' + Date.now();
    
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        full_name: newName,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
      
    if (updateError) {
      console.error('❌ Error updating name:', updateError);
    } else {
      console.log('✅ Name updated successfully');
      console.log('New name:', updatedProfile.full_name);
    }
    
    // Test 3: Simulate frontend API call
    console.log('\n3. Testing API-style update...');
    const apiUpdateData = {
      name: 'API Test Name ' + Date.now(),
      bio: currentProfile.bio,
      location: currentProfile.location,
      website: currentProfile.website,
      occupation: currentProfile.occupation,
      education: currentProfile.education,
      relationship: currentProfile.relationship,
      isPrivate: currentProfile.is_private,
      hideFromSuggestions: currentProfile.hide_from_suggestions,
      messageRequests: currentProfile.message_requests,
      showReadReceipts: currentProfile.show_read_receipts,
      showOnlineStatus: currentProfile.show_online_status,
      commentPrivacy: currentProfile.comment_privacy,
      storyPrivacy: currentProfile.story_privacy
    };
    
    // Simulate what the backend does
    const { data: apiUpdatedProfile, error: apiUpdateError } = await supabase
      .from('profiles')
      .update({
        full_name: apiUpdateData.name, // This is the key mapping
        bio: apiUpdateData.bio,
        location: apiUpdateData.location,
        website: apiUpdateData.website,
        occupation: apiUpdateData.occupation,
        education: apiUpdateData.education,
        relationship: apiUpdateData.relationship,
        is_private: apiUpdateData.isPrivate,
        hide_from_suggestions: apiUpdateData.hideFromSuggestions,
        message_requests: apiUpdateData.messageRequests,
        show_read_receipts: apiUpdateData.showReadReceipts,
        show_online_status: apiUpdateData.showOnlineStatus,
        comment_privacy: apiUpdateData.commentPrivacy,
        story_privacy: apiUpdateData.storyPrivacy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();
      
    if (apiUpdateError) {
      console.error('❌ Error in API-style update:', apiUpdateError);
    } else {
      console.log('✅ API-style update successful');
      console.log('Updated name via API simulation:', apiUpdatedProfile.full_name);
    }
    
    // Test 4: Check final state
    console.log('\n4. Final verification...');
    const { data: finalProfile, error: finalError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (finalError) {
      console.error('❌ Error in final check:', finalError);
    } else {
      console.log('✅ Final profile state:');
      console.log('Full name:', finalProfile.full_name);
      console.log('Username:', finalProfile.username);
      console.log('Updated at:', finalProfile.updated_at);
    }
    
    console.log('\n✅ Name update tests completed!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testNameUpdate();
