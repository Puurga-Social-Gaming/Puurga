import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectFriendsTable() {
    console.log('Inspecting friends table...');
    const { data, error } = await supabase.from('friends').select('*').limit(1);

    if (error) {
        console.error('Error fetching friends:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in friends table:', Object.keys(data[0]));
    } else {
        // If no data, try to get column names via an error or another way
        // For now, let's just assume it's empty but try to fetch another record or use a different approach
        console.log('Friends table is empty, trying to get schema info...');
        const { data: columns, error: colError } = await supabase.rpc('inspect_table', { table_name: 'friends' });
        if (colError) {
            console.log('Could not get columns via RPC, trying a dummy insert...');
            const { error: insertError } = await supabase.from('friends').insert({}).select();
            console.log('Insert error hints at columns:', insertError?.message);
        } else {
            console.log('Columns:', columns);
        }
    }

    console.log('\nInspecting friend_requests table...');
    const { data: reqData, error: reqError } = await supabase.from('friend_requests').select('*').limit(1);
    if (reqError) {
        console.error('Error fetching friend_requests:', reqError);
    } else if (reqData && reqData.length > 0) {
        console.log('Columns in friend_requests table:', Object.keys(reqData[0]));
    }
}

inspectFriendsTable();
