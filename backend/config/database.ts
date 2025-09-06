import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file from backend directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('Database config:', {
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'puurga',
  port: parseInt(process.env.DB_PORT || '5432'),
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

// Test the connection
sequelize
  .authenticate()
  .then(() => {
    console.log('✅ Database connection established successfully.');
  })
  .catch(err => {
    console.error('❌ Unable to connect to the database:', err);
  });

export default sequelize; 