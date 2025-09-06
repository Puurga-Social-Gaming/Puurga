import { Umzug, SequelizeStorage } from 'umzug';
import sequelize from '../config/database';

const umzug = new Umzug({
  migrations: {
    glob: ['../migrations/*.ts', { cwd: __dirname }],
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

(async () => {
  try {
    console.log('✅ Database connection established successfully.');
    await umzug.up();
    console.log('All migrations have been executed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
})(); 