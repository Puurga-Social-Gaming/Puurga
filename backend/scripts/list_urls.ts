import { supabase } from '../config/supabase';

async function listUrls() {
    const { data: profiles } = await supabase.from('profiles').select('avatar_url, cover_photo');
    const { data: posts } = await supabase.from('posts').select('media_url');

    const urls = new Set();
    profiles?.forEach(p => {
        if (p.avatar_url) urls.add(p.avatar_url);
        if (p.cover_photo) urls.add(p.cover_photo);
    });
    posts?.forEach(p => {
        if (p.media_url) {
            if (Array.isArray(p.media_url)) {
                p.media_url.forEach(u => urls.add(u));
            } else {
                urls.add(p.media_url);
            }
        }
    });

    console.log('Unique URLs in DB:');
    Array.from(urls).sort().forEach(u => console.log(u));
}

listUrls().catch(console.error);
