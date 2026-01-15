import { supabase } from '../config/supabase';

async function testAuth() {
  try {
    console.log('Testing authentication...');
    
    // Test user credentials
    const testEmail = 'test@puurga.com';
    const testPassword = 'TestPassword123!';
    
    console.log(`\nAttempting to sign in with: ${testEmail}`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      return;
    }
    
    if (!authData.session) {
      console.error('❌ No session created');
      return;
    }
    
    console.log('✅ Authentication successful!');
    console.log('User ID:', authData.user.id);
    console.log('Email:', authData.user.email);
    console.log('Access Token (first 50 chars):', authData.session.access_token.substring(0, 50) + '...');
    console.log('Token expires at:', new Date(authData.session.expires_at! * 1000).toLocaleString());
    
    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();
    
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
    } else if (!profile) {
      console.log('⚠️ No profile found for this user');
    } else {
      console.log('✅ Profile found:');
      console.log('  Full Name:', profile.full_name);
      console.log('  Username:', profile.username);
      console.log('  Avatar URL:', profile.avatar_url || 'Not set');
      console.log('  Cover Photo:', profile.cover_photo || 'Not set');
    }
    
    console.log('\n=== Token Information ===');
    console.log('Store this token in localStorage with key "token":');
    console.log(authData.session.access_token);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testAuth();
