// Simple script to check database data using the backend's Supabase client
import { supabase } from './backend/dist/config/supabase.js';

async function checkDatabaseData() {
  try {
    console.log('Checking friend_requests table...');
    const { data: requests, error: requestsError } = await supabase
      .from('friend_requests')
      .select('*')
      .limit(10);
    
    if (requestsError) {
      console.error('Error fetching friend_requests:', requestsError);
    } else {
      console.log('Friend requests found:', requests.length);
      console.log('Sample:', requests.slice(0, 2));
      
      // Group by receiver to see who has pending requests
      const requestsByReceiver = requests.reduce((acc, req) => {
        if (!acc[req.receiver_id]) acc[req.receiver_id] = [];
        acc[req.receiver_id].push(req);
        return acc;
      }, {});
      
      console.log('\nPending requests by receiver:');
      Object.entries(requestsByReceiver).forEach(([receiverId, reqs]) => {
        console.log(`  ${receiverId}: ${reqs.length} pending requests`);
      });
    }

    console.log('\nChecking friends table...');
    const { data: friends, error: friendsError } = await supabase
      .from('friends')
      .select('*')
      .limit(10);
    
    if (friendsError) {
      console.error('Error fetching friends:', friendsError);
    } else {
      console.log('Friends found:', friends.length);
      console.log('Sample:', friends.slice(0, 2));
    }

    console.log('\nChecking profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .limit(5);
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    } else {
      console.log('Profiles found:', profiles.length);
      console.log('Sample:', profiles);
    }

    // Check specific user data - let's see who might be receiving requests
    console.log('\nChecking detailed friend requests with profiles...');
    const { data: detailedRequests, error: detailedError } = await supabase
      .from('friend_requests')
      .select(`
        *,
        sender:profiles!friend_requests_sender_id_fkey(id, username, full_name, avatar_url),
        receiver:profiles!friend_requests_receiver_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq('status', 'pending')
      .limit(5);
    
    if (detailedError) {
      console.error('Error fetching detailed requests:', detailedError);
    } else {
      console.log('Detailed pending requests:');
      detailedRequests.forEach(req => {
        console.log(`  From: ${req.sender?.full_name} (${req.sender?.username}) -> To: ${req.receiver?.full_name} (${req.receiver?.username})`);
      });
    }

    // Check if the current user has any pending requests
    const currentUserId = '2d0dbbda-183b-419e-bd12-84b7cf07473f'; // Amena Knapp
    console.log(`\nChecking friend requests for current user: ${currentUserId}`);
    
    const { data: userRequests, error: userRequestsError } = await supabase
      .from('friend_requests')
      .select(`
        *,
        sender:profiles!friend_requests_sender_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq('receiver_id', currentUserId)
      .eq('status', 'pending');
    
    if (userRequestsError) {
      console.error('Error fetching user requests:', userRequestsError);
    } else {
      console.log(`User has ${userRequests.length} pending friend requests:`);
      userRequests.forEach(req => {
        console.log(`  From: ${req.sender?.full_name} (${req.sender?.username})`);
      });
    }

    // Check if the current user has any accepted friends
    const { data: userFriends, error: userFriendsError } = await supabase
      .from('friends')
      .select(`
        *,
        friend:profiles!friends_user_id_2_fkey(id, username, full_name, avatar_url)
      `)
      .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`);
    
    if (userFriendsError) {
      console.error('Error fetching user friends:', userFriendsError);
    } else {
      console.log(`User has ${userFriends.length} friends:`);
      userFriends.forEach(friend => {
        const friendId = friend.user_id_1 === currentUserId ? friend.user_id_2 : friend.user_id_1;
        console.log(`  Friend ID: ${friendId}, Status: ${friend.status}`);
      });
    }

    // Check if there are any users with email/password we can test
    console.log('\nChecking auth.users for login credentials...');
    const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
    
    if (authUsersError) {
      console.error('Error fetching auth users:', authUsersError);
    } else {
      console.log('Auth users found:', authUsers.users.length);
      console.log('Sample auth users (emails only):', authUsers.users.map(u => ({ id: u.id, email: u.email, email_confirmed: u.email_confirmed })));
    }

    // Check profiles table for user data
    console.log('\nChecking profiles table for user data...');
    const { data: profilesData, error: profilesDataError } = await supabase
      .from('profiles')
      .select('*')
      .limit(3);
    
    if (profilesDataError) {
      console.error('Error fetching profiles data:', profilesDataError);
    } else {
      console.log('Profiles found:', profilesData.length);
      console.log('Sample profile:', profilesData[0]);
    }

  } catch (error) {
    console.error('Database check failed:', error);
  }
}

checkDatabaseData();
