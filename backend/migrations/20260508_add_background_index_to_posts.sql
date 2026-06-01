-- Add background_index column to posts table for consistent theme storage
ALTER TABLE posts ADD COLUMN IF NOT EXISTS background_index INTEGER DEFAULT 0;
