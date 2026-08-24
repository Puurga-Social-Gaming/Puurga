import { QueryInterface, DataTypes } from 'sequelize';
import sequelize from '../config/database';

const runMigration = async () => {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const queryInterface = sequelize.getQueryInterface();

    // Add purge_count column
    try {
      await queryInterface.addColumn('posts', 'purge_count', {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
      });
      console.log('✅ Added purge_count column to posts');
    } catch (error: any) {
      if (error.message.includes('duplicate column')) {
        console.log('ℹ️ purge_count column already exists');
      } else {
        throw error;
      }
    }

    // Add visibility column
    try {
      await queryInterface.addColumn('posts', 'visibility', {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'public'
      });
      console.log('✅ Added visibility column to posts');
    } catch (error: any) {
      if (error.message.includes('duplicate column')) {
        console.log('ℹ️ visibility column already exists');
      } else {
        throw error;
      }
    }

    // Add background_index column
    try {
      await queryInterface.addColumn('posts', 'background_index', {
        type: DataTypes.INTEGER,
        allowNull: true
      });
      console.log('✅ Added background_index column to posts');
    } catch (error: any) {
      if (error.message.includes('duplicate column')) {
        console.log('ℹ️ background_index column already exists');
      } else {
        throw error;
      }
    }

    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigration();