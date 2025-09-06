import sequelize from './config/database';
import User from './models/User';
import bcrypt from 'bcrypt';

const initializeDatabase = async () => {
  try {
    console.log('Testing connection...');
    await sequelize.authenticate();
    console.log('✅ Connection established successfully.');

    console.log('Syncing database...');
    await sequelize.sync({ force: true });
    console.log('✅ Database synced successfully');

    // Create a test user
    const hashedPassword = await bcrypt.hash('Test@123', 10);
    const testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      username: 'testuser',
      password: hashedPassword,
      avatar: undefined,
      bio: undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Test user created:', testUser.toJSON());
    console.log('Test user credentials:');
    console.log('Email: test@example.com');
    console.log('Password: Test@123');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  } finally {
    await sequelize.close();
  }
};

initializeDatabase(); 