import dotenv from 'dotenv';
import path from 'path';

// Try different paths for .env file
const possiblePaths = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '.env'),
  '.env'
];

console.log('Current directory:', __dirname);
console.log('Looking for .env in:');
possiblePaths.forEach(p => {
  console.log('- ' + p);
  try {
    dotenv.config({ path: p });
  } catch (err) {
    console.error('Error loading from', p, ':', err);
  }
});

console.log('\nEnvironment variables:');
console.log('DB_HOST:', process.env.DB_HOST || 'not set');
console.log('DB_USER:', process.env.DB_USER || 'not set');
console.log('DB_PASS:', process.env.DB_PASS || 'not set');
console.log('DB_NAME:', process.env.DB_NAME || 'not set');
console.log('DB_PORT:', process.env.DB_PORT || 'not set'); 