import { supabase } from '../config/supabase';

// Script to manually set a user into ghost mode for testing
async function setUserToGhostMode(userEmail: string) {
  try {
    console.log(`Setting user ${userEmail} to ghost mode...`);

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      console.error('User not found:', userError);
      return;
    }

    const userId = user.id;
    console.log('Found user ID:', userId);

    // Update profile to ghost mode
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_ghost: true,
        purge_count: 5,
        ghosted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error setting ghost mode:', updateError);
      return;
    }

    console.log('✅ Successfully set user to ghost mode!');
    console.log('User can now be redeemed by another user with 100 credits.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// To reset ghost mode (for testing)
async function resetGhostMode(userEmail: string) {
  try {
    console.log(`Resetting ghost mode for ${userEmail}...`);

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      console.error('User not found:', userError);
      return;
    }

    const userId = user.id;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_ghost: false,
        purge_count: 0,
        ghosted_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error resetting ghost mode:', updateError);
      return;
    }

    console.log('✅ Successfully reset ghost mode!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Usage: Replace with your test user email
const testUserEmail = 'test@example.com'; // CHANGE THIS TO YOUR TEST USER EMAIL

// Uncomment the function you want to run:
setUserToGhostMode(testUserEmail);
// resetGhostMode(testUserEmail);

export { setUserToGhostMode, resetGhostMode };
