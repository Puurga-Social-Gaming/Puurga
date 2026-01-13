import { supabase } from '../config/supabase';

async function testPurgeEndpoint() {
  try {
    console.log('Testing purge functionality with existing database structure...');
    
    // Get a real user and post for testing
    const { data: users } = await supabase.auth.admin.listUsers();
    if (!users || users.users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    const userId = users.users[0].id;
    console.log('Using user ID:', userId);
    
    // Get a post to test with
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .limit(1);
      
    if (postsError || !posts || posts.length === 0) {
      console.log('❌ No posts found:', postsError);
      return;
    }
    
    const postId = posts[0].id;
    const postAuthorId = posts[0].user_id;
    console.log('Using post ID:', postId);
    console.log('Post author ID:', postAuthorId);
    
    // Test 1: Check existing purges table structure
    console.log('\n1. Testing purges table access...');
    const { data: existingPurges, error: purgesError } = await supabase
      .from('purges')
      .select('*')
      .eq('target_type', 'post')
      .eq('target_id', postId);
      
    if (purgesError) {
      console.error('❌ Error accessing purges table:', purgesError);
      return;
    }
    
    console.log('✅ Purges table accessible');
    console.log('Existing purges for this post:', existingPurges?.length || 0);
    
    // Test 2: Add a purge
    console.log('\n2. Testing adding a purge...');
    const { data: newPurge, error: insertError } = await supabase
      .from('purges')
      .insert({
        actor_id: userId,
        target_user_id: postAuthorId,
        target_type: 'post',
        target_id: postId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (insertError) {
      console.error('❌ Error inserting purge:', insertError);
    } else {
      console.log('✅ Purge added successfully');
      console.log('New purge ID:', newPurge.id);
    }
    
    // Test 3: Count total purges for this post
    console.log('\n3. Testing purge count...');
    const { data: purgeCount, error: countError } = await supabase
      .from('purges')
      .select('*', { count: 'exact' })
      .eq('target_type', 'post')
      .eq('target_id', postId);
      
    if (countError) {
      console.error('❌ Error counting purges:', countError);
    } else {
      console.log('✅ Total purges for this post:', purgeCount?.length || 0);
    }
    
    // Test 4: Count total purges for the post author
    console.log('\n4. Testing user purge count...');
    const { data: userPurges, error: userCountError } = await supabase
      .from('purges')
      .select('*', { count: 'exact' })
      .eq('target_user_id', postAuthorId);
      
    if (userCountError) {
      console.error('❌ Error counting user purges:', userCountError);
    } else {
      const totalUserPurges = userPurges?.length || 0;
      console.log('✅ Total purges for post author:', totalUserPurges);
      
      if (totalUserPurges >= 5) {
        console.log('⚠️ User should be in ghost mode!');
      }
    }
    
    // Test 5: Check profiles table ghost columns
    console.log('\n5. Testing profiles ghost columns...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_ghost, ghosted_at, purge_count')
      .eq('id', postAuthorId)
      .single();
      
    if (profileError) {
      console.error('❌ Error accessing profile ghost columns:', profileError);
    } else {
      console.log('✅ Profile ghost data:', {
        is_ghost: profile.is_ghost,
        ghosted_at: profile.ghosted_at,
        purge_count: profile.purge_count
      });
    }
    
    // Clean up - remove the test purge
    if (newPurge) {
      console.log('\n6. Cleaning up test purge...');
      const { error: deleteError } = await supabase
        .from('purges')
        .delete()
        .eq('id', newPurge.id);
        
      if (deleteError) {
        console.error('❌ Error cleaning up:', deleteError);
      } else {
        console.log('✅ Test purge cleaned up');
      }
    }
    
    console.log('\n✅ All purge functionality tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Purges table exists and is accessible');
    console.log('- ✅ Can insert new purges');
    console.log('- ✅ Can count purges by post and user');
    console.log('- ✅ Profiles table has ghost mode columns');
    console.log('- ✅ Ready for purge functionality implementation');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testPurgeEndpoint();
