const axios = require('axios');

// Test script to debug friend sidebar data
async function testFriendsAPI() {
  const baseURL = 'http://localhost:3005/api';
  
  // You'll need to get a valid token from a logged-in user
  // Check localStorage in the browser for the token
  const token = 'YOUR_TOKEN_HERE'; // Replace with actual token
  
  if (token === 'YOUR_TOKEN_HERE') {
    console.log('Please update the token in this script with a valid token from localStorage');
    return;
  }

  const api = axios.create({
    baseURL,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  try {
    console.log('Testing friend requests endpoint...');
    const requestsResponse = await api.get('/friends/requests');
    console.log('Friend Requests:', requests.data);
    console.log('Friend Requests count:', requests.data.length);
  } catch (error) {
    console.error('Error fetching friend requests:', error.response?.data || error.message);
  }

  try {
    console.log('\nTesting friend suggestions endpoint...');
    const suggestionsResponse = await api.get('/friends/suggestions');
    console.log('Friend Suggestions:', suggestions.data);
    console.log('Friend Suggestions count:', suggestions.data.length);
  } catch (error) {
    console.error('Error fetching friend suggestions:', error.response?.data || error.message);
  }

  try {
    console.log('\nTesting accepted friends endpoint...');
    const friendsResponse = await api.get('/friends/accepted');
    console.log('Accepted Friends:', friends.data);
    console.log('Accepted Friends count:', friends.data.length);
  } catch (error) {
    console.error('Error fetching accepted friends:', error.response?.data || error.message);
  }
}

testFriendsAPI();
