import User from '../models/User';
import sequelize from '../config/database';
import bcrypt from 'bcrypt';

const seedUsers = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    // Clear existing users
    await User.destroy({ where: {} });
    console.log('Cleared existing users');

    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10);
    console.log('Created hashed password:', hashedPassword);

    // Create test user
    const testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      username: 'testuser',
      password: hashedPassword,
      avatar: undefined,
      bio: undefined
    });

    console.log('Test user created:', {
      ...testUser.toJSON(),
      password: '***hidden***'
    });
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers(); 