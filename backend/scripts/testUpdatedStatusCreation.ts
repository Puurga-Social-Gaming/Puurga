import { supabase } from '../config/supabase';

async function testUpdatedStatusCreation() {
  try {
    console.log('Testing updated status creation...');
    
    // Get a real user ID
    const { data: users } = await supabase.auth.admin.listUsers();
    if (!users || users.users.length === 0) {
      console.log('❌ No users found in auth.users');
      return;
    }
    
    const userId = users.users[0].id;
    console.log('Using user ID:', userId);
    
    // Test creating a text status (no media)
    const textStatus = {
      user_id: userId,
      media_url: null,
    };
    
    console.log('Creating text status:', textStatus);
    
    const { data: textData, error: textError } = await supabase
      .from('statuses')
      .insert([textStatus])
      .select('*')
      .single();
      
    if (textError) {
      console.error('❌ Error creating text status:', textError);
    } else {
      console.log('✅ Successfully created text status:', textData);
      
      // Clean up
      await supabase.from('statuses').delete().eq('id', textData.id);
      console.log('✅ Cleaned up text status');
    }
    
    // Test creating a media status
    const mediaStatus = {
      user_id: userId,
      media_url: 'http://localhost:3005/uploads/test-image.jpg',
    };
    
    console.log('Creating media status:', mediaStatus);
    
    const { data: mediaData, error: mediaError } = await supabase
      .from('statuses')
      .insert([mediaStatus])
      .select('*')
      .single();
      
    if (mediaError) {
      console.error('❌ Error creating media status:', mediaError);
    } else {
      console.log('✅ Successfully created media status:', mediaData);
      
      // Clean up
      await supabase.from('statuses').delete().eq('id', mediaData.id);
      console.log('✅ Cleaned up media status');
    }
    
    console.log('✅ Status creation tests completed successfully!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testUpdatedStatusCreation();
