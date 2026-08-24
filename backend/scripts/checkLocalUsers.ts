import sequelize from '../config/database';

const checkLocalUsers = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to local PostgreSQL');

    // Check users table structure
    const [userSchema] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 Local Users Table Schema:');
    console.table(userSchema as any);

    // Check profiles table structure
    const [profileSchema] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'profiles'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 Local Profiles Table Schema:');
    console.table(profileSchema as any);

    // Get sample user data
    const [users] = await sequelize.query(`
      SELECT id, email, username, name, role, is_private, avatar
      FROM users
      LIMIT 3;
    `);

    console.log('\n👥 Sample Local Users:');
    console.table(users as any);

    // Get sample profile data
    const [profiles] = await sequelize.query(`
      SELECT id, full_name, username, email, role, avatar_url
      FROM profiles
      LIMIT 3;
    `);

    console.log('\n👤 Sample Local Profiles:');
    console.table(profiles as any);

    // Count users
    const [userCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM users;
    `);

    const countResult = userCount as any;
    console.log(`\n📈 Total Users: ${countResult[0]?.count || 0}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkLocalUsers();