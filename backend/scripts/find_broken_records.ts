import { supabase } from '../config/supabase';

async function findFiles() {
    const filenames = [
        '1770254133186-35yfrz8rydv.jpg',
        '1770438282895-pjttwsntgqr.png',
        '1770277216792-j1fkpj6ur7.jpg'
    ];

    for (const filename of filenames) {
        // Search profiles
        const { data: pAvatar } = await supabase.from('profiles').select('id, username').eq('avatar_url', `/uploads/${filename}`);
        const { data: pCover } = await supabase.from('profiles').select('id, username').eq('cover_photo', `/uploads/${filename}`);

        // Search posts (assuming media_url is string or array)
        const { data: posts } = await supabase.from('posts').select('id, user_id').filter('media_url', 'cs', `{"/uploads/${filename}"}`);

        // Search statuses
        const { data: statuses } = await supabase.from('statuses').select('id, user_id').eq('media_url', `/uploads/${filename}`);

        console.log(`Searching for ${filename}:`);
        if (pAvatar?.length) console.log(`  Found as avatar for users: ${pAvatar.map(u => u.username).join(', ')}`);
        if (pCover?.length) console.log(`  Found as cover for users: ${pCover.map(u => u.username).join(', ')}`);
        if (posts?.length) console.log(`  Found in posts: ${posts.map(p => p.id).join(', ')}`);
        if (statuses?.length) console.log(`  Found in statuses: ${statuses.map(s => s.id).join(', ')}`);
    }
}

findFiles().catch(console.error);
