import sequelize from './config/database';

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    
    // Test database creation
    await sequelize.sync({ force: true });
    console.log('✅ Database synchronized successfully');
    
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
};

testConnection(); 