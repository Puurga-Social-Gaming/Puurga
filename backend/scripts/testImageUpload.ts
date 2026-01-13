import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

async function testImageUpload() {
  try {
    console.log('Testing image upload functionality...');
    
    // Get a real user and create a token for testing
    const { data: users } = await supabase.auth.admin.listUsers();
    if (!users || users.users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    const userId = users.users[0].id;
    const userEmail = users.users[0].email;
    console.log('Testing with user:', userId);
    
    // Create a test JWT token for this user
    const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail!,
    });
    
    if (tokenError) {
      console.error('❌ Error generating token:', tokenError);
      return;
    }
    
    // Create a simple test image file
    const testImagePath = path.join(__dirname, 'test-image.txt');
    fs.writeFileSync(testImagePath, 'This is a test image file content');
    
    console.log('\n1. Testing avatar upload...');
    
    try {
      const formData = new FormData();
      formData.append('avatar', fs.createReadStream(testImagePath), {
        filename: 'test-avatar.jpg',
        contentType: 'image/jpeg'
      });
      
      const response = await fetch('http://localhost:3005/api/users/profile/avatar', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokenData.properties?.access_token || 'test-token'}`,
          ...formData.getHeaders()
        },
        body: formData
      });
      
      const responseText = await response.text();
      console.log('Avatar upload response status:', response.status);
      console.log('Avatar upload response:', responseText);
      
      if (response.ok) {
        console.log('✅ Avatar upload successful');
      } else {
        console.log('❌ Avatar upload failed');
      }
    } catch (fetchError) {
      console.error('❌ Fetch error for avatar upload:', fetchError);
    }
    
    console.log('\n2. Testing cover photo upload...');
    
    try {
      const formData = new FormData();
      formData.append('coverPhoto', fs.createReadStream(testImagePath), {
        filename: 'test-cover.jpg',
        contentType: 'image/jpeg'
      });
      
      const response = await fetch('http://localhost:3005/api/users/profile/cover-photo', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokenData.properties?.access_token || 'test-token'}`,
          ...formData.getHeaders()
        },
        body: formData
      });
      
      const responseText = await response.text();
      console.log('Cover photo upload response status:', response.status);
      console.log('Cover photo upload response:', responseText);
      
      if (response.ok) {
        console.log('✅ Cover photo upload successful');
      } else {
        console.log('❌ Cover photo upload failed');
      }
    } catch (fetchError) {
      console.error('❌ Fetch error for cover photo upload:', fetchError);
    }
    
    // Clean up test file
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    
    console.log('\n✅ Image upload tests completed!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testImageUpload();
