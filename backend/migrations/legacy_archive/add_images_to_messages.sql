-- Add images column to messages table to support picture sharing
ALTER TABLE messages ADD COLUMN IF NOT EXISTS images JSONB;

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;
