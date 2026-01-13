import { supabase } from '../config/supabase';

async function addStatusesColumns() {
  try {
    console.log('Adding missing columns to statuses table...');
    
    // Since we can't execute DDL directly, let's inform the user what SQL to run
    const sql = `
-- Add missing columns to statuses table
ALTER TABLE statuses 
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('text', 'media')) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Update existing records to have default expiry (24 hours from creation)
UPDATE statuses 
SET expires_at = created_at + INTERVAL '24 hours'
WHERE expires_at IS NULL;

-- Make expires_at NOT NULL after setting defaults
ALTER TABLE statuses 
ALTER COLUMN expires_at SET NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_statuses_expires_at ON statuses(expires_at);
CREATE INDEX IF NOT EXISTS idx_statuses_type ON statuses(type);
    `;
    
    console.log('❌ Cannot execute DDL directly through Supabase client.');
    console.log('Please run the following SQL in your Supabase SQL editor:');
    console.log('\n' + sql + '\n');
    
    // For now, let's modify the backend to work with the current table structure
    console.log('✅ Will modify backend code to work with current table structure');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

addStatusesColumns();
