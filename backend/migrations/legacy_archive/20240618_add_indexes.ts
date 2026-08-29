import { Sequelize } from 'sequelize';

interface MigrationContext {
  context: Sequelize;
}

export const up = async ({ context: sequelize }: MigrationContext) => {
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
    CREATE INDEX IF NOT EXISTS users_username_idx ON users (username);
  `);
};

export const down = async ({ context: sequelize }: MigrationContext) => {
  await sequelize.query(`
    DROP INDEX IF EXISTS users_email_idx;
    DROP INDEX IF EXISTS users_username_idx;
  `);
}; 