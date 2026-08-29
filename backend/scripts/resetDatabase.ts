import sequelize from '../config/database';
import { execSync } from 'child_process';
import path from 'path';

async function resetDatabase() {
  console.log('🔄 Wiping existing database tables...');
  
  await sequelize.query(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      -- Drop all tables in public schema
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public."' || r.tablename || '" CASCADE';
      END LOOP;
      
      -- Drop custom enums in public schema if any
      FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public."' || r.typname || '" CASCADE';
      END LOOP;
    END $$;
  `);

  console.log('✅ Tables wiped clean.');
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
