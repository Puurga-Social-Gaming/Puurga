// Create friend requests for the current user (Amena Knapp)
import { supabase } from './backend/dist/config/supabase.js';

async function createRequestsForCurrentUser() {
  try {
    const currentUserId = '2d0dbbda-183b-419e-bd12-84b7cf07473f'; // Amena Knapp
    
    // Get some other users to send requests from
    const { data: otherUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .neq('id', currentUserId)
      .limit(3);

    if (usersError) {
      console.error('Error fetching other users:', usersError);
      return;
    }

    console.log('Creating friend requests for Amena Knapp from these users:');
    otherUsers.forEach(user => {
      console.log(`  - ${user.full_name} (${user.username})`);
    });

    // Create friend requests from these users to Amena
    for (const user of otherUsers) {
      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${currentUserId}),and(sender_id.eq.${currentUserId},receiver_id.eq.${user.id})`)
        .single();

      if (existingRequest) {
        console.log(`Request already exists between ${user.full_name} and Amena`);
        continue;
      }

      // Create new friend request
      const { data: newRequest, error: insertError } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: currentUserId,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Error creating request from ${user.full_name}:`, insertError);
      } else {
        console.log(`✓ Created friend request from ${user.full_name} to Amena`);
      }
    }

    // Check the results
    const { data: userRequests, error: checkError } = await supabase
      .from('friend_requests')
      .select(`
        *,
        sender:profiles!friend_requests_sender_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq('receiver_id', currentUserId);

    if (checkError) {
      console.error('Error checking results:', checkError);
    } else {
      console.log(`\nAmena has ${userRequests.length} total friend requests:`);
      userRequests.forEach(req => {
        console.log(`  From: ${req.sender?.full_name} (${req.sender?.username}) - Status: ${req.status}`);
      });
    }

    // Check if Amena has any friendships
    const { data: friendships, error: friendshipError } = await supabase
      .from('friends')
      .select('*')
      .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`);

    if (friendshipError) {
      console.error('Error checking friendships:', friendshipError);
    } else {
      console.log(`\nAmena has ${friendships.length} friendships:`);
      friendships.forEach(friend => {
        const friendId = friend.user_id_1 === currentUserId ? friend.user_id_2 : friend.user_id_1;
        console.log(`  Friend ID: ${friendId}, Status: ${friend.status}`);
      });
    }

    // Create the missing friendship from the accepted request
    if (userRequests.length > 0 && userRequests[0].status === 'accepted' && friendships.length === 0) {
      const acceptedRequest = userRequests[0];
      console.log(`\nCreating missing friendship for accepted request from ${acceptedRequest.sender?.full_name}`);
      
      const { error: friendshipCreateError } = await supabase
        .from('friends')
        .insert({
          user_id_1: acceptedRequest.sender_id,
          user_id_2: currentUserId,
          status: 'accepted',
          created_at: new Date().toISOString()
        });

      if (friendshipCreateError) {
        console.error('Error creating friendship:', friendshipCreateError);
      } else {
        console.log('✓ Created missing friendship!');
      }
    }

    // Let's create a new pending request from Christopher
    console.log('\nCreating a new pending friend request from Christopher...');
    
    const christopherId = 'ee8c7807-3603-4937-9d1c-fa5d01493152';
    
    // Check if Christopher already sent a request
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`and(sender_id.eq.${christopherId},receiver_id.eq.${currentUserId}),and(sender_id.eq.${currentUserId},receiver_id.eq.${christopherId})`)
      .single();

    if (!existingRequest) {
      // Create new pending request from Christopher
      const { data: newRequest, error: insertError } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: christopherId,
          receiver_id: currentUserId,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Error creating request from Christopher:`, insertError);
      } else {
        console.log(`✓ Created pending friend request from Christopher to Amena`);
      }
    } else {
      console.log('Christopher already sent a request to Amena');
    }

  } catch (error) {
    console.error('Error creating requests:', error);
  }
}

createRequestsForCurrentUser();
