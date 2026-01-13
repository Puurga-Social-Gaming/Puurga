import express from 'express';
import request from 'supertest';
import { supabase } from '../config/supabase';

// Simple test to verify the actual API endpoints work
async function testProfileEndpoints() {
  try {
    console.log('Testing profile API endpoints...');
    
    // Get a real user and create a token for testing
    const { data: users } = await supabase.auth.admin.listUsers();
    if (!users || users.users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    const userId = users.users[0].id;
    const userEmail = users.users[0].email;
    console.log('Testing with user:', userId, userEmail);
    
    // Create a test JWT token for this user
    const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail!,
    });
    
    if (tokenError) {
      console.error('❌ Error generating token:', tokenError);
      return;
    }
    
    // Test direct API calls to verify endpoints
    console.log('\n1. Testing GET /api/users/profile endpoint...');
    
    // Make a direct HTTP request to test the endpoint
    const baseUrl = 'http://localhost:3005';
    
    try {
      const response = await fetch(`${baseUrl}/api/users/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenData.properties?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const profileData = await response.json();
        console.log('✅ GET /api/users/profile successful');
        console.log('Profile data received:', {
          id: profileData.id,
          full_name: profileData.full_name,
          username: profileData.username,
          email: profileData.email
        });
      } else {
        console.log('❌ GET /api/users/profile failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.log('Error response:', errorText);
      }
    } catch (fetchError) {
      console.error('❌ Fetch error for GET profile:', fetchError);
    }
    
    console.log('\n2. Testing PUT /api/users/profile endpoint...');
    
    const updateData = {
      name: 'API Test User',
      bio: 'Updated via API test',
      location: 'API Test Location',
      website: 'https://api-test.com',
      isPrivate: false,
      messageRequests: 'everyone'
    };
    
    try {
      const updateResponse = await fetch(`${baseUrl}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokenData.properties?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (updateResponse.ok) {
        const updatedData = await updateResponse.json();
        console.log('✅ PUT /api/users/profile successful');
        console.log('Updated data:', {
          full_name: updatedData.full_name,
          bio: updatedData.bio,
          location: updatedData.location,
          website: updatedData.website
        });
      } else {
        console.log('❌ PUT /api/users/profile failed:', updateResponse.status, updateResponse.statusText);
        const errorText = await updateResponse.text();
        console.log('Error response:', errorText);
      }
    } catch (fetchError) {
      console.error('❌ Fetch error for PUT profile:', fetchError);
    }
    
    console.log('\n✅ Profile endpoint tests completed!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testProfileEndpoints();
