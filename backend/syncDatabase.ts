import sequelize from './config/database';
import { setupAssociations } from './models/associations';

async function syncDatabase() {
  try {
    console.log('Starting database synchronization...');
    
    // Set up associations first
    setupAssociations();
    
    // Sync all models
    // force: false will not drop existing tables
    // alter: true will update table structures to match models
    await sequelize.sync({ 
      force: false,
      alter: true 
    });
    
    console.log('✅ Database synchronized successfully!');
    console.log('All tables have been created/updated.');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection verified.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database synchronization failed:', error);
    process.exit(1);
  }
}

syncDatabase();