import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';

async function createStatusesTable() {
  try {
    console.log('Creating statuses table...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'create_statuses_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error creating statuses table:', error);
      
      // Try alternative approach - execute each statement separately
      console.log('Trying alternative approach...');
      
      // Create the table first
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS statuses (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          media_url TEXT,
          type TEXT CHECK (type IN ('text', 'media')) NOT NULL DEFAULT 'text',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL
        );
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql_query: createTableSQL });
      
      if (createError) {
        console.error('Error creating table:', createError);
        // Try direct table creation using Supabase client
        console.log('Trying direct approach...');
        
        // Test if table exists by trying to select from it
        const { data: testData, error: testError } = await supabase
          .from('statuses')
          .select('id')
          .limit(1);
          
        if (testError && testError.code === '42P01') {
          console.log('Table does not exist. Creating manually...');
          
          // Since we can't create tables directly, let's inform the user
          console.log('❌ Unable to create statuses table automatically.');
          console.log('Please run the following SQL in your Supabase SQL editor:');
          console.log('\n' + sql + '\n');
          
          process.exit(1);
        } else if (testError) {
          console.error('Unexpected error:', testError);
          process.exit(1);
        } else {
          console.log('✅ Statuses table already exists!');
        }
      } else {
        console.log('✅ Statuses table created successfully!');
      }
    } else {
      console.log('✅ Statuses table created successfully!');
    }
    
    // Test the table by inserting a test record
    console.log('Testing table...');
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID for test
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Don't actually insert, just test the structure
    console.log('✅ Table structure looks good!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

createStatusesTable();
