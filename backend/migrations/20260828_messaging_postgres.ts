import sequelize from '../config/database';

/**
 * Postgres-only messaging migration.
 * Extends the local messages table with the columns the messaging feature needs
 * and creates the supporting tables (trash, reactions, blocks, mutes, settings,
 * translations, crypto keys) entirely in local Postgres — no Supabase.
 *
 * NOTE: The local messages table uses `sender_id` (not `from_user_id`). All
 * messaging route code (routes/messages.ts) references `sender_id`.
 */
export async function up() {
  await sequelize.query(`
    -- Rich message fields
    ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS images JSONB,
      ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS ciphertext TEXT;

    -- Per-user message trash ("delete for me") + snapshots for "delete for everyone"
    CREATE TABLE IF NOT EXISTS message_trash (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      from_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      content_snapshot TEXT,
      images_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at_snapshot TIMESTAMPTZ,
      scope TEXT NOT NULL CHECK (scope IN ('me', 'everyone')),
      deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (message_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_message_trash_user_deleted
      ON message_trash (user_id, deleted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_message_trash_conversation
      ON message_trash (conversation_id, user_id);

    -- Message reactions for DMs
    CREATE TABLE IF NOT EXISTS message_reactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (message_id, user_id, emoji)
    );

    CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
    CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);

    -- Peer-to-peer block relationships
    CREATE TABLE IF NOT EXISTS user_blocks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (blocker_id, blocked_id),
      CHECK (blocker_id <> blocked_id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
    CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

    -- Peer-to-peer mute relationships
    CREATE TABLE IF NOT EXISTS user_mutes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      muter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      muted_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (muter_id, muted_id),
      CHECK (muter_id <> muted_id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_mutes_muter ON user_mutes(muter_id);
    CREATE INDEX IF NOT EXISTS idx_user_mutes_muted ON user_mutes(muted_id);

    -- Per-user settings (used by live typing preview, etc.)
    CREATE TABLE IF NOT EXISTS user_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Translation cache used by the translation service
    CREATE TABLE IF NOT EXISTS translations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_type VARCHAR(20) NOT NULL,
      source_id UUID NOT NULL,
      target_language VARCHAR(5) NOT NULL,
      translated_text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT translations_unique_constraint UNIQUE (source_type, source_id, target_language)
    );

    CREATE INDEX IF NOT EXISTS translations_lookup_idx
      ON translations (source_type, source_id, target_language);

    -- E2E encryption keys
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS e2e_public_key TEXT;
    CREATE TABLE IF NOT EXISTS user_crypto_keys (
      user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
      public_key TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Useful indexes for messaging
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_unread
      ON messages (conversation_id, sender_id) WHERE read = false;
  `);
}

export async function down() {
  await sequelize.query(`
    DROP TABLE IF EXISTS message_trash;
    DROP TABLE IF EXISTS message_reactions;
    DROP TABLE IF EXISTS user_blocks;
    DROP TABLE IF EXISTS user_mutes;
    DROP TABLE IF EXISTS user_settings;
    DROP TABLE IF EXISTS translations;
    DROP TABLE IF EXISTS user_crypto_keys;
    ALTER TABLE messages DROP COLUMN IF EXISTS images;
    ALTER TABLE messages DROP COLUMN IF EXISTS language;
    ALTER TABLE messages DROP COLUMN IF EXISTS is_edited;
    ALTER TABLE messages DROP COLUMN IF EXISTS edited_at;
    ALTER TABLE messages DROP COLUMN IF EXISTS is_deleted;
    ALTER TABLE messages DROP COLUMN IF EXISTS deleted_at;
    ALTER TABLE messages DROP COLUMN IF EXISTS read_at;
    ALTER TABLE messages DROP COLUMN IF EXISTS is_encrypted;
    ALTER TABLE messages DROP COLUMN IF EXISTS ciphertext;
    ALTER TABLE profiles DROP COLUMN IF EXISTS e2e_public_key;
  `);
}
