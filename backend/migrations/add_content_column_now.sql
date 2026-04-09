-- Add content column to statuses table if it doesn't exist
ALTER TABLE statuses ADD COLUMN IF NOT EXISTS content TEXT;

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'statuses' 
ORDER BY ordinal_position;
