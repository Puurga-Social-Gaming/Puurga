import User from '../models/User';
import sequelize from '../config/database';
import bcrypt from 'bcrypt';

async function testAuthLocal() {
  await sequelize.authenticate();
  
  // Clean up previous admin
  await User.destroy({ where: { email: 'admin@gmail.com' } });

  // Create admin
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await User.create({
    name: 'Super Admin',
    email: 'admin@gmail.com',
    username: 'admin',
    password: hashedPassword,
    role: 'superadmin'
  });

  console.log('Created admin with password hash length:', admin.password.length);

  // Test find & compare
  const found = await User.findOne({ where: { email: 'admin@gmail.com' } });
  if (!found) {
    console.error('❌ User not found!');
    process.exit(1);
  }

  const isValid = await bcrypt.compare('Admin@123', found.password);
  if (isValid) {
    console.log('🎉 SUCCESS! Password bcrypt comparison passed! Authentication fixed!');
    process.exit(0);
  } else {
    console.error('❌ FAIL! Password bcrypt comparison failed!');
    process.exit(1);
  }
}

testAuthLocal().catch((err) => {
  console.error(err);
  process.exit(1);
});
