import { supabase } from '../config/supabase';

async function updateProfilesSchema() {
  try {
    console.log('Ensuring role column exists in profiles table...');
    
    const sql = `
      -- 1. Create role enum if it doesn't exist
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin', 'business');
        END IF;
      END $$;

      -- 2. Add role column to profiles if it doesn't exist
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

      -- 3. Optionally update existing roles or add constraints
      -- COMMENT ON COLUMN profiles.role IS 'User role: user, admin, super_admin, business';
    `;

    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error updating profiles schema via RPC:', error);
      console.log('Falling back to direct check...');
      
      // Check if role column exists by trying to select it
      const { error: selectError } = await supabase
        .from('profiles')
        .select('role')
        .limit(1);
        
      if (selectError) {
        console.error('Role column definitely missing or inaccessible:', selectError.message);
        console.log('Manual action required: Run the following SQL in Supabase Dashboard:');
        console.log(sql);
      } else {
        console.log('✅ Role column already exists.');
      }
    } else {
      console.log('✅ Profiles schema updated successfully.');
    }
  } catch (error) {
    console.error('Unexpected error in schema update:', error);
  }
}

updateProfilesSchema();
