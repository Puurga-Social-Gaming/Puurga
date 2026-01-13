import { supabase } from '../config/supabase';

async function checkPurgesTable() {
  try {
    console.log('Checking if post_purges table exists...');
    
    // Try to query the post_purges table
    const { data, error } = await supabase
      .from('post_purges')
      .select('*')
      .limit(1);
      
    if (error) {
      if (error.message.includes('relation "public.post_purges" does not exist')) {
        console.log('❌ post_purges table does not exist');
        console.log('Need to create the table first');
        return false;
      } else {
        console.error('❌ Error checking post_purges table:', error);
        return false;
      }
    }
    
    console.log('✅ post_purges table exists');
    console.log('Sample data:', data);
    
    // Check if posts table has purge_count column
    console.log('\nChecking if posts table has purge_count column...');
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, purge_count')
      .limit(1);
      
    if (postsError) {
      if (postsError.message.includes('column "purge_count" does not exist')) {
        console.log('❌ posts table missing purge_count column');
        return false;
      } else {
        console.error('❌ Error checking posts table:', postsError);
        return false;
      }
    }
    
    console.log('✅ posts table has purge_count column');
    
    // Check if profiles table has ghost mode columns
    console.log('\nChecking if profiles table has ghost mode columns...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, is_ghost_mode, ghost_mode_activated_at')
      .limit(1);
      
    if (profilesError) {
      if (profilesError.message.includes('column "is_ghost_mode" does not exist')) {
        console.log('❌ profiles table missing ghost mode columns');
        return false;
      } else {
        console.error('❌ Error checking profiles table:', profilesError);
        return false;
      }
    }
    
    console.log('✅ profiles table has ghost mode columns');
    
    console.log('\n✅ All purge-related tables and columns exist!');
    return true;
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

checkPurgesTable();
