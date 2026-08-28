import sequelize from '../config/database';

/**
 * PostgreSQL-only groups migration.
 * Creates groups, group_members, group_messages and supporting tables
 * entirely in local Postgres — no Supabase / no RLS.
 */
export async function up() {
  await sequelize.query(`
    -- Groups
    CREATE TABLE IF NOT EXISTS groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      profile_image_url TEXT,
      cover_image_url TEXT,
      is_private BOOLEAN DEFAULT false,
      created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      credits INTEGER DEFAULT 0,
      invite_code TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Group members
    CREATE TABLE IF NOT EXISTS group_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
      muted BOOLEAN DEFAULT false,
      muted_until TIMESTAMPTZ,
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (group_id, user_id)
    );

    -- Group messages (rich fields matching the messaging tables)
    CREATE TABLE IF NOT EXISTS group_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      content TEXT,
      images JSONB DEFAULT '[]'::jsonb,
      language VARCHAR(5) DEFAULT 'en',
      is_edited BOOLEAN DEFAULT false,
      edited_at TIMESTAMPTZ,
      is_deleted BOOLEAN DEFAULT false,
      deleted_at TIMESTAMPTZ,
      is_encrypted BOOLEAN DEFAULT false,
      ciphertext TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Group message reactions
    CREATE TABLE IF NOT EXISTS group_message_reactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (message_id, user_id, emoji)
    );

    CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
    CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(invite_code);
    CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
    CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id);
    CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_group_reactions_message ON group_message_reactions(message_id);
  `);
}

export async function down() {
  await sequelize.query(`
    DROP TABLE IF EXISTS group_message_reactions;
    DROP TABLE IF EXISTS group_messages;
    DROP TABLE IF EXISTS group_members;
    DROP TABLE IF EXISTS groups;
  `);
}
