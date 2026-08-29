import sequelize from '../config/database';
import { execSync } from 'child_process';
import path from 'path';

async function resetDatabase() {
  console.log('🔄 Wiping existing database tables and schema...');
  
  await sequelize.query(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO public;
    COMMENT ON SCHEMA public IS 'standard public schema';
  `);

  console.log('✅ Schema wiped clean.');
  console.log('🚀 Running migration system baseline...');
  
  execSync('npx ts-node scripts/migrate.ts', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });

  console.log('🎉 Database successfully reset and migrated from scratch!');
  process.exit(0);
}

resetDatabase().catch((err) => {
  console.error('❌ Error resetting database:', err);
  process.exit(1);
});
