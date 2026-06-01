import { supabase } from '../config/supabase';

async function fixBrokenAvatar() {
    const brokenFile = '1770277216792-j1fkpj6ur7.jpg';
    const brokenUrl = `/uploads/${brokenFile}`;

    console.log(`Fixing broken avatar reference: ${brokenUrl}`);

    // Find users with this avatar
    const { data: users, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('avatar_url', brokenUrl);

    if (error) {
        console.error('Error finding users:', error);
        return;
    }

    if (!users || users.length === 0) {
        console.log('No users found with broken avatar');
        return;
    }

    console.log(`Found ${users.length} user(s) with broken avatar:`);
    for (const user of users) {
        console.log(`  - ${user.username} (${user.id})`);
        
        // Update to default avatar
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: null })
            .eq('id', user.id);

        if (updateError) {
            console.error(`  Error updating ${user.username}:`, updateError);
        } else {
            console.log(`  ✓ Fixed ${user.username}`);
        }
    }
}

fixBrokenAvatar().catch(console.error);
