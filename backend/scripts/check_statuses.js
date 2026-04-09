const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: __dirname + '/../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // Check what columns exist by selecting *
  const { data, error } = await supabase.from('statuses').select('*').limit(1);
  
  if (error) {
    console.log('ERROR reading statuses:', error.message, error.code);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('COLUMNS:', Object.keys(data[0]).join(', '));
    console.log('SAMPLE:', JSON.stringify(data[0], null, 2));
  } else {
    console.log('Table exists but is empty. Testing columns individually...');
    
    // Test content
    const r1 = await supabase.from('statuses').select('content').limit(1);
    console.log('content column:', r1.error ? 'MISSING - ' + r1.error.message : 'EXISTS');
    
    // Test expires_at
    const r2 = await supabase.from('statuses').select('expires_at').limit(1);
    console.log('expires_at column:', r2.error ? 'MISSING - ' + r2.error.message : 'EXISTS');
    
    // Test type
    const r3 = await supabase.from('statuses').select('type').limit(1);
    console.log('type column:', r3.error ? 'MISSING - ' + r3.error.message : 'EXISTS');
  }
}

check().catch(e => console.error('Script error:', e.message));
