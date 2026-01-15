import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const up = async () => {
  console.log('Creating groups tables...');

  // Create groups table
  const { error: groupsError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS groups (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        profile_image_url TEXT,
        cover_image_url TEXT,
        is_private BOOLEAN DEFAULT false,
        credits INTEGER DEFAULT 0,
        created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
  });

  if (groupsError) {
    console.error('Error creating groups table:', groupsError);
    throw groupsError;
  }

  // Create group_members table
  const { error: membersError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS group_members (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(group_id, user_id)
      );
    `
  });

  if (membersError) {
    console.error('Error creating group_members table:', membersError);
    throw membersError;
  }

  // Create indexes for better performance
  const { error: indexError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
      CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at);
      CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
      CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
    `
  });

  if (indexError) {
    console.error('Error creating indexes:', indexError);
    throw indexError;
  }

  console.log('Groups tables created successfully');
};

export const down = async () => {
  console.log('Dropping groups tables...');

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      DROP TABLE IF EXISTS group_members;
      DROP TABLE IF EXISTS groups;
    `
  });

  if (error) {
    console.error('Error dropping groups tables:', error);
    throw error;
  }

  console.log('Groups tables dropped successfully');
};
