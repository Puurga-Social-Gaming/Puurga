const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Use hardcoded values for testing (you should replace with actual values)
const supabase = createClient(
  'https://your-project.supabase.co',
  'your-service-role-key'
);

async function testBucketAccess() {
  try {
    console.log('🔍 Testing Logos bucket access...');
    
    // Try to list files
    const { data: files, error } = await supabase.storage
      .from('Logos')
      .list();
    
    if (error) {
      console.error('❌ Error accessing bucket:', error);
      console.log('💡 Please check:');
      console.log('   1. Supabase URL is correct');
      console.log('   2. Service role key has proper permissions');
      console.log('   3. Bucket name "Logos" exists and is accessible');
      return;
    }
    
    console.log('✅ Successfully accessed Logos bucket!');
    console.log('📁 Files found:', files);
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }
}

testBucketAccess();
