-- Create statuses table for user status updates
CREATE TABLE IF NOT EXISTS statuses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_url TEXT,
    type TEXT CHECK (type IN ('text', 'media')) NOT NULL DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_statuses_user_id ON statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_statuses_expires_at ON statuses(expires_at);
CREATE INDEX IF NOT EXISTS idx_statuses_created_at ON statuses(created_at);

-- Enable Row Level Security
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;

-- Create policies for statuses
CREATE POLICY "Users can view all active statuses" ON statuses
    FOR SELECT USING (expires_at > NOW());

CREATE POLICY "Users can insert their own statuses" ON statuses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own statuses" ON statuses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own statuses" ON statuses
    FOR DELETE USING (auth.uid() = user_id);
