// Test authentication and API endpoints
import axios from 'axios';

async function testAuth() {
  // Try to get current user profile without token first
  try {
    console.log('Testing profile endpoint without token...');
    const response = await axios.get('http://localhost:3005/api/users/profile');
    console.log('Profile without token:', response.status, response.data);
  } catch (error) {
    console.log('Profile without token failed:', error.response?.status, error.response?.data);
  }

  // Check if we can get a valid token from the login endpoint
  try {
    console.log('\nTesting login endpoint...');
    const loginResponse = await axios.post('http://localhost:3005/api/auth/login', {
      email: 'test@example.com', // This might not work, but let's see
      password: 'password'
    });
    console.log('Login response:', loginResponse.data);
  } catch (error) {
    console.log('Login failed:', error.response?.status, error.response?.data);
  }
}

testAuth();
