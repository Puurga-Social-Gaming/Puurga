const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('posts').select('visibility').limit(1);
  if (error) console.error(error);
  else console.log("Success:", data);
}
run();
