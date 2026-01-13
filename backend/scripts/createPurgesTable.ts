import { supabase } from '../config/supabase';

async function createPurgesTable() {
  try {
    console.log('Creating post_purges table and related columns...');
    
    // Create post_purges table
    console.log('1. Creating post_purges table...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS post_purges (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        post_id UUID NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(post_id, user_id)
      );
    `;
    
    const { error: tableError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    if (tableError) {
      console.error('❌ Error creating post_purges table:', tableError);
      console.log('Manual SQL to run in Supabase SQL Editor:');
      console.log(createTableSQL);
    } else {
      console.log('✅ post_purges table created');
    }
    
    // Create indexes
    console.log('2. Creating indexes...');
    const indexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_post_purges_post_id ON post_purges(post_id);
      CREATE INDEX IF NOT EXISTS idx_post_purges_user_id ON post_purges(user_id);
      CREATE INDEX IF NOT EXISTS idx_post_purges_created_at ON post_purges(created_at);
    `;
    
    const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexesSQL });
    if (indexError) {
      console.error('❌ Error creating indexes:', indexError);
      console.log('Manual SQL to run in Supabase SQL Editor:');
      console.log(indexesSQL);
    } else {
      console.log('✅ Indexes created');
    }
    
    // Add ghost mode columns to profiles
    console.log('3. Adding ghost mode columns to profiles...');
    const profilesSQL = `
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS is_ghost_mode BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS ghost_mode_activated_at TIMESTAMP WITH TIME ZONE;
    `;
    
    const { error: profilesError } = await supabase.rpc('exec_sql', { sql: profilesSQL });
    if (profilesError) {
      console.error('❌ Error adding ghost mode columns:', profilesError);
      console.log('Manual SQL to run in Supabase SQL Editor:');
      console.log(profilesSQL);
    } else {
      console.log('✅ Ghost mode columns added to profiles');
    }
    
    // Add purge count to posts
    console.log('4. Adding purge_count column to posts...');
    const postsSQL = `
      ALTER TABLE posts 
      ADD COLUMN IF NOT EXISTS purge_count INTEGER DEFAULT 0;
    `;
    
    const { error: postsError } = await supabase.rpc('exec_sql', { sql: postsSQL });
    if (postsError) {
      console.error('❌ Error adding purge_count column:', postsError);
      console.log('Manual SQL to run in Supabase SQL Editor:');
      console.log(postsSQL);
    } else {
      console.log('✅ purge_count column added to posts');
    }
    
    console.log('\n📋 If any errors occurred above, please run this SQL manually in Supabase SQL Editor:');
    console.log('----------------------------------------');
    console.log(createTableSQL);
    console.log(indexesSQL);
    console.log(profilesSQL);
    console.log(postsSQL);
    console.log('----------------------------------------');
    
    // Verify creation
    console.log('\n5. Verifying table creation...');
    const { data, error: verifyError } = await supabase
      .from('post_purges')
      .select('*')
      .limit(1);
      
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
    } else {
      console.log('✅ post_purges table verified and accessible');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createPurgesTable();
