// Test with real user credentials
import axios from 'axios';

async function testWithRealUser() {
  const baseURL = 'http://localhost:3005/api';
  
  // Try to login with one of the existing users
  const testUsers = [
    { email: 'tomz@gmail.com', password: 'password123' },
    { email: 'rostechdigital1@gmail.com', password: 'password123' },
    { email: 'gloire@gmail.com', password: 'password123' },
    { email: 'adam.n.mukendi@gmail.com', password: 'password123' },
    { email: 'mashiyanechris@gmail.com', password: 'password123' },
    { email: 'augmentednote@gmail.com', password: 'password123' }
  ];

  let loggedInUser = null;
  let token = null;

  // Try to login with each user
  for (const user of testUsers) {
    try {
      console.log(`Trying login with: ${user.email}`);
      const response = await axios.post(`${baseURL}/auth/login`, user);
      
      if (response.data.token) {
        console.log(`✓ Login successful for ${user.email}`);
        loggedInUser = response.data.user;
        token = response.data.token;
        break;
      }
    } catch (error) {
      console.log(`✗ Login failed for ${user.email}:`, error.response?.data?.message || error.message);
    }
  }

  if (!token) {
    console.log('Could not login with any test user. You may need to:');
    console.log('1. Check the correct passwords');
    console.log('2. Or create a test user account');
    console.log('3. Or get a token from the browser localStorage');
    return;
  }

  console.log('\nLogged in user:', loggedInUser);
  console.log('Token preview:', token.substring(0, 50) + '...');

  // Test friend requests API with the valid token
  const api = axios.create({
    baseURL,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  try {
    console.log('\nTesting friend requests with valid token...');
    const requestsResponse = await api.get('/friends/requests');
    console.log('Friend Requests:', requestsResponse.data);
    console.log('Friend Requests count:', requestsResponse.data.length);
  } catch (error) {
    console.error('Error fetching friend requests:', error.response?.data || error.message);
  }

  try {
    console.log('\nTesting friend suggestions with valid token...');
    const suggestionsResponse = await api.get('/friends/suggestions');
    console.log('Friend Suggestions:', suggestionsResponse.data);
    console.log('Friend Suggestions count:', suggestionsResponse.data.length);
  } catch (error) {
    console.error('Error fetching friend suggestions:', error.response?.data || error.message);
  }

  try {
    console.log('\nTesting accepted friends with valid token...');
    const friendsResponse = await api.get('/friends/accepted');
    console.log('Accepted Friends:', friendsResponse.data);
    console.log('Accepted Friends count:', friendsResponse.data.length);
  } catch (error) {
    console.error('Error fetching accepted friends:', error.response?.data || error.message);
  }
}

testWithRealUser();
