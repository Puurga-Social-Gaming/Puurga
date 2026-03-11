// Test API endpoints without authentication to see the error responses
import axios from 'axios';

async function testAPIEndpoints() {
  const baseURL = 'http://localhost:3005/api';

  console.log('Testing friend suggestions endpoint without auth...');
  try {
    const response = await axios.get(`${baseURL}/friends/suggestions`);
    console.log('Suggestions response:', response.data);
  } catch (error) {
    console.log('Suggestions error:', error.response?.status, error.response?.data);
  }

  console.log('\nTesting accepted friends endpoint without auth...');
  try {
    const response = await axios.get(`${baseURL}/friends/accepted`);
    console.log('Accepted friends response:', response.data);
  } catch (error) {
    console.log('Accepted friends error:', error.response?.status, error.response?.data);
  }

  console.log('\nTesting friend requests endpoint without auth...');
  try {
    const response = await axios.get(`${baseURL}/friends/requests`);
    console.log('Friend requests response:', response.data);
  } catch (error) {
    console.log('Friend requests error:', error.response?.status, error.response?.data);
  }
}

testAPIEndpoints();
