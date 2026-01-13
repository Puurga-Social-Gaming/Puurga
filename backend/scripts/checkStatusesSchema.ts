import { supabase } from '../config/supabase';

async function checkStatusesSchema() {
  try {
    console.log('Checking statuses table schema...');
    
    // Try to get table information using a query that should show us the actual columns
    const { data, error } = await supabase
      .from('statuses')
      .select('*')
      .limit(0); // Get no rows, just the structure
      
    if (error) {
      console.error('Error querying statuses table:', error);
      
      // Let's try to see what columns actually exist by trying different column names
      const commonColumns = ['id', 'user_id', 'content', 'media_url', 'type', 'created_at', 'updated_at', 'expires_at'];
      
      for (const column of commonColumns) {
        try {
          const { error: colError } = await supabase
            .from('statuses')
            .select(column)
            .limit(1);
            
          if (!colError) {
            console.log(`✅ Column '${column}' exists`);
          } else if (colError.code === 'PGRST204') {
            console.log(`❌ Column '${column}' does not exist`);
          } else {
            console.log(`? Column '${column}' - unknown error:`, colError.message);
          }
        } catch (e) {
          console.log(`? Column '${column}' - exception:`, e);
        }
      }
    } else {
      console.log('✅ Successfully queried statuses table');
      console.log('Table structure appears to be working');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkStatusesSchema();
