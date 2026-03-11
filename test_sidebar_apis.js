// Test the same API endpoints that RightSidebar uses
import axios from 'axios';

// Get token from browser localStorage simulation
// In a real scenario, this would come from a logged-in user
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // This would be a real token

async function testSidebarAPIs() {
  const baseURL = 'http://localhost:3005/api';
  
  // Create API instance similar to the one used in the app
  const api = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add request interceptor similar to the app
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token') || testToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  console.log('Testing sidebar APIs...\n');

  // Test 1: Friend Requests
  try {
    console.log('1. Testing friend requests...');
    const response = await api.get('/friends/requests');
    console.log('✅ Friend requests:', response.data.length, 'items');
    console.log('Sample:', response.data.slice(0, 2));
  } catch (error) {
    console.log('❌ Friend requests failed:', error.response?.status, error.response?.data?.message || error.message);
  }

  // Test 2: Friend Suggestions
  try {
    console.log('\n2. Testing friend suggestions...');
    const response = await api.get('/friends/suggestions');
    console.log('✅ Friend suggestions:', response.data.length, 'items');
    console.log('Sample:', response.data.slice(0, 2));
  } catch (error) {
    console.log('❌ Friend suggestions failed:', error.response?.status, error.response?.data?.message || error.message);
  }

  // Test 3: Accepted Friends
  try {
    console.log('\n3. Testing accepted friends...');
    const response = await api.get('/friends/accepted');
    console.log('✅ Accepted friends:', response.data.length, 'items');
    console.log('Sample:', response.data.slice(0, 2));
  } catch (error) {
    console.log('❌ Accepted friends failed:', error.response?.status, error.response?.data?.message || error.message);
  }

  // Test 4: Online Users (Messages API)
  try {
    console.log('\n4. Testing online users...');
    const response = await api.get('/messages/users/online');
    console.log('✅ Online users:', response.data.length, 'items');
    console.log('Sample:', response.data.slice(0, 2));
  } catch (error) {
    console.log('❌ Online users failed:', error.response?.status, error.response?.data?.message || error.message);
  }

  console.log('\nTest completed!');
}

testSidebarAPIs();
