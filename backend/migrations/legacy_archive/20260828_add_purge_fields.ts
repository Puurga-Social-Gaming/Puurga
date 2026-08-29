import sequelize from '../config/database';

export async function up() {
  await sequelize.query(`
    ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS purge_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_ghost BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ghosted_at TIMESTAMP;
  `);
}

export async function down() {
  await sequelize.query(`
    ALTER TABLE profiles
    DROP COLUMN IF EXISTS purge_count,
    DROP COLUMN IF EXISTS is_ghost,
    DROP COLUMN IF EXISTS ghosted_at;
  `);
}
