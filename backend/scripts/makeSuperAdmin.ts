import { supabase } from '../config/supabase';

async function makeSuperAdmin(email: string) {
  try {
    console.log(`Promoting user ${email} to Super Admin...`);
    
    const authUsers = await supabase.auth.admin.listUsers();
    const user = authUsers.data?.users.find(u => u.email === email);

    if (!user) {
      console.error('User not found in authentication table.');
      return;
    }

    console.log(`Checking profile for user ID: ${user.id}`);
    
    // Use upsert to handle case where profile might exist but be missing fields or have role mismatch
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        role: 'super_admin',
        // Fallback for metadata
        full_name: (user.user_metadata as any)?.full_name || 'Super Admin',
        username: (user.user_metadata as any)?.username || (user.email ? user.email.split('@')[0] : 'superadmin')
      }, { onConflict: 'id' });

    if (upsertError) throw upsertError;
    console.log(`✅ User ${email} promoted/upserted to super_admin in profiles.`);

    // Also update auth user metadata
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { role: 'super_admin' }
    });
    
    if (authUpdateError) {
      console.warn('⚠️ Could not update auth metadata, but profile is set:', authUpdateError.message);
    } else {
      console.log('✅ Auth metadata updated.');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

const targetEmail = process.argv[2] || 'admin@gmail.com';
makeSuperAdmin(targetEmail);
