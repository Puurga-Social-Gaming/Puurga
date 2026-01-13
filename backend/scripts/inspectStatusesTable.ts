import { supabase } from '../config/supabase';

async function inspectStatusesTable() {
  try {
    console.log('Inspecting statuses table...');
    
    // Check each column individually to see what exists
    const columnsToCheck = [
      'id', 'user_id', 'content', 'media_url', 'type', 
      'created_at', 'updated_at', 'expires_at', 'expiry_date', 'expire_at'
    ];
    
    const existingColumns: string[] = [];
    
    for (const column of columnsToCheck) {
      try {
        const { error } = await supabase
          .from('statuses')
          .select(column)
          .limit(1);
          
        if (!error) {
          existingColumns.push(column);
          console.log(`✅ Column '${column}' exists`);
        } else if (error.code === 'PGRST204') {
          console.log(`❌ Column '${column}' does not exist`);
        }
      } catch (e) {
        console.log(`❌ Column '${column}' - error checking`);
      }
    }
    
    console.log('\nExisting columns:', existingColumns);
    
    // Try to insert a minimal record with only the columns that exist
    if (existingColumns.includes('user_id') && existingColumns.includes('type')) {
      console.log('\nTrying to insert with existing columns...');
      
      // Get a real user ID first
      const { data: users } = await supabase.auth.admin.listUsers();
      if (users && users.users.length > 0) {
        const userId = users.users[0].id;
        
        const minimalStatus: any = {
          user_id: userId,
          type: 'text'
        };
        
        // Add media_url if it exists
        if (existingColumns.includes('media_url')) {
          minimalStatus.media_url = null;
        }
        
        // Try different expiry column names
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 24);
        
        if (existingColumns.includes('expires_at')) {
          minimalStatus.expires_at = expiryDate.toISOString();
        } else if (existingColumns.includes('expiry_date')) {
          minimalStatus.expiry_date = expiryDate.toISOString();
        } else if (existingColumns.includes('expire_at')) {
          minimalStatus.expire_at = expiryDate.toISOString();
        }
        
        console.log('Attempting to insert:', minimalStatus);
        
        const { data, error } = await supabase
          .from('statuses')
          .insert([minimalStatus])
          .select('*')
          .single();
          
        if (error) {
          console.error('Insert error:', error);
        } else {
          console.log('✅ Successfully inserted status:', data);
          
          // Clean up
          await supabase.from('statuses').delete().eq('id', data.id);
          console.log('✅ Cleaned up test record');
        }
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

inspectStatusesTable();
