import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add perga_points column to users table if it doesn't exist
  try {
    await queryInterface.addColumn('users', 'perga_points', {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Game points earned by user in Perga games'
    });
    console.log('✅ Added perga_points column to users table');
  } catch (error: any) {
    // Column might already exist, check if it's the expected error
    if (error.message && error.message.includes('already exists')) {
      console.log('ℹ️  perga_points column already exists in users table');
    } else {
      throw error;
    }
  }

  // Also try to add to profiles table as fallback (some setups use profiles instead of users)
  try {
    await queryInterface.addColumn('profiles', 'perga_points', {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Game points earned by user in Perga games'
    });
    console.log('✅ Added perga_points column to profiles table');
  } catch (error: any) {
    // This is expected to fail if profiles table doesn't exist or column exists
    console.log('ℹ️  Skipped profiles table (may not exist or column already present)');
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  try {
    await queryInterface.removeColumn('users', 'perga_points');
    console.log('✅ Removed perga_points column from users table');
  } catch (error) {
    console.log('ℹ️  Could not remove perga_points from users table (may not exist)');
  }

  try {
    await queryInterface.removeColumn('profiles', 'perga_points');
    console.log('✅ Removed perga_points column from profiles table');
  } catch (error) {
    console.log('ℹ️  Could not remove perga_points from profiles table (may not exist)');
  }
}
