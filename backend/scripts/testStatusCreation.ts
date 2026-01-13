import { supabase } from '../config/supabase';

async function testStatusCreation() {
  try {
    console.log('Testing status creation...');
    
    // First, let's check if we can query the statuses table
    const { data: existingStatuses, error: queryError } = await supabase
      .from('statuses')
      .select('*')
      .limit(1);
      
    if (queryError) {
      console.error('Error querying statuses table:', queryError);
      return;
    }
    
    console.log('✅ Can query statuses table successfully');
    console.log('Existing statuses count:', existingStatuses?.length || 0);
    
    // Test creating a status with a dummy user ID
    const testUserId = '123e4567-e89b-12d3-a456-426614174000'; // Valid UUID format
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    const testStatus = {
      user_id: testUserId,
      media_url: null,
      type: 'text' as const,
      expires_at: expiresAt.toISOString()
    };
    
    console.log('Attempting to insert test status:', testStatus);
    
    const { data: insertData, error: insertError } = await supabase
      .from('statuses')
      .insert([testStatus])
      .select('*')
      .single();
      
    if (insertError) {
      console.error('Error inserting status:', insertError);
      
      // Check if it's a foreign key constraint error
      if (insertError.code === '23503') {
        console.log('❌ Foreign key constraint error - user_id does not exist in auth.users');
        console.log('This is expected since we used a dummy user ID');
        
        // Let's check what users exist
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
        if (usersError) {
          console.error('Error listing users:', usersError);
        } else {
          console.log('Available users:', users.users.length);
          if (users.users.length > 0) {
            const realUserId = users.users[0].id;
            console.log('Trying with real user ID:', realUserId);
            
            const realTestStatus = {
              user_id: realUserId,
              media_url: null,
              type: 'text' as const,
              expires_at: expiresAt.toISOString()
            };
            
            const { data: realInsertData, error: realInsertError } = await supabase
              .from('statuses')
              .insert([realTestStatus])
              .select('*')
              .single();
              
            if (realInsertError) {
              console.error('Error inserting with real user ID:', realInsertError);
            } else {
              console.log('✅ Successfully created status with real user ID:', realInsertData);
              
              // Clean up - delete the test status
              await supabase.from('statuses').delete().eq('id', realInsertData.id);
              console.log('✅ Cleaned up test status');
            }
          }
        }
      }
    } else {
      console.log('✅ Successfully created test status:', insertData);
      
      // Clean up - delete the test status
      await supabase.from('statuses').delete().eq('id', insertData.id);
      console.log('✅ Cleaned up test status');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testStatusCreation();
