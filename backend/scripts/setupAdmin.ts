import User from '../models/User';
import sequelize from '../config/database';
import bcrypt from 'bcrypt';

const setupAdmin = async () => {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      where: { email: 'admin@gmail.com' }
    });

    if (existingAdmin) {
      console.log('ℹ️ Admin user exists, updating password...');
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      await existingAdmin.update({
        password: hashedPassword
      });
      console.log('✅ Admin password updated');
      return;
    }

    // Create admin user if they don't exist
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@gmail.com',
      username: 'admin',
      password: hashedPassword,
      avatar: undefined,
      bio: undefined
    });

    console.log('✅ Admin user created successfully:', {
      id: admin.id,
      email: admin.email,
      username: admin.username
    });
  } catch (error) {
    console.error('❌ Error setting up admin:', error);
    process.exit(1);
  }
};

setupAdmin(); 