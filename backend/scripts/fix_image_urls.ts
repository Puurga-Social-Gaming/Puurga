import { supabase } from '../config/supabase';

async function fixImageUrls() {
    console.log('Starting image URL fix...');

    // 1. Fix Profiles (avatar_url)
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, avatar_url, cover_photo');

    if (profileError) {
        console.error('Error fetching profiles:', profileError);
    } else {
        console.log(`Checking ${profiles.length} profiles...`);
        for (const p of profiles) {
            let needsUpdate = false;
            const updateData: any = {};

            if (p.avatar_url && p.avatar_url.includes('http://localhost:3005')) {
                updateData.avatar_url = p.avatar_url.replace('http://localhost:3005', '');
                needsUpdate = true;
            }
            if (p.cover_photo && p.cover_photo.includes('http://localhost:3005')) {
                updateData.cover_photo = p.cover_photo.replace('http://localhost:3005', '');
                needsUpdate = true;
            }

            if (needsUpdate) {
                console.log(`Updating profile ${p.id}...`);
                await supabase.from('profiles').update(updateData).eq('id', p.id);
            }
        }
    }

    // 2. Fix Posts (media_url)
    const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, media_url');

    if (postsError) {
        console.error('Error fetching posts:', postsError);
    } else {
        console.log(`Checking ${posts.length} posts...`);
        for (const p of posts) {
            if (p.media_url && typeof p.media_url === 'string' && p.media_url.includes('http://localhost:3005')) {
                const newUrl = p.media_url.replace(/http:\/\/localhost:3005/g, '');
                console.log(`Updating post ${p.id}...`);
                await supabase.from('posts').update({ media_url: newUrl }).eq('id', p.id);
            }
        }
    }

    // 3. Fix Groups (profile_image_url, cover_image_url)
    const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id, profile_image_url, cover_image_url');

    if (groupsError) {
        console.error('Error fetching groups:', groupsError);
    } else {
        console.log(`Checking ${groups.length} groups...`);
        for (const g of groups) {
            let needsUpdate = false;
            const updateData: any = {};

            if (g.profile_image_url && g.profile_image_url.includes('http://localhost:3005')) {
                updateData.profile_image_url = g.profile_image_url.replace('http://localhost:3005', '');
                needsUpdate = true;
            }
            if (g.cover_image_url && g.cover_image_url.includes('http://localhost:3005')) {
                updateData.cover_image_url = g.cover_image_url.replace('http://localhost:3005', '');
                needsUpdate = true;
            }

            if (needsUpdate) {
                console.log(`Updating group ${g.id}...`);
                await supabase.from('groups').update(updateData).eq('id', g.id);
            }
        }
    }

    // 4. Fix Statuses (media_url)
    // Check if status table exists first by trying to select one
    const { error: statusCheckError } = await supabase.from('statuses').select('id').limit(1);
    if (!statusCheckError || (statusCheckError.code !== '42P01' && statusCheckError.code !== '42703')) {
        const { data: statuses, error: statusesError } = await supabase
            .from('statuses')
            .select('id, media_url');

        if (statusesError) {
            console.error('Error fetching statuses:', statusesError);
        } else {
            console.log(`Checking ${statuses.length} statuses...`);
            for (const s of statuses) {
                if (s.media_url && s.media_url.includes('http://localhost:3005')) {
                    const newUrl = s.media_url.replace('http://localhost:3005', '');
                    console.log(`Updating status ${s.id}...`);
                    await supabase.from('statuses').update({ media_url: newUrl }).eq('id', s.id);
                }
            }
        }
    } else {
        console.log('Statuses table not found or not accessible, skipping.');
    }

    console.log('Finished fixing image URLs.');
}

fixImageUrls().catch(console.error);
