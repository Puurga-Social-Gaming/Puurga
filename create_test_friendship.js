// Create a test friendship to populate the friends table
import { supabase } from './backend/dist/config/supabase.js';

async function createTestFriendship() {
  try {
    // Get a pending friend request
    const { data: pendingRequest, error: requestError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('status', 'pending')
      .limit(1)
      .single();

    if (requestError || !pendingRequest) {
      console.log('No pending friend requests found');
      return;
    }

    console.log('Found pending request:', pendingRequest);

    // Accept the friend request by updating its status
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', pendingRequest.id);

    if (updateError) {
      console.error('Error updating friend request:', updateError);
      return;
    }

    // Create a friendship record
    const { error: friendshipError } = await supabase
      .from('friends')
      .insert({
        user_id_1: pendingRequest.sender_id,
        user_id_2: pendingRequest.receiver_id,
        status: 'accepted', // Add status field
        created_at: new Date().toISOString()
      });

    if (friendshipError) {
      console.error('Error creating friendship:', friendshipError);
      return;
    }

    console.log('✓ Friendship created successfully!');
    console.log(`User ${pendingRequest.sender_id} is now friends with ${pendingRequest.receiver_id}`);

    // Check the friends table now
    const { data: friends, error: friendsError } = await supabase
      .from('friends')
      .select('*');

    if (friendsError) {
      console.error('Error checking friends table:', friendsError);
    } else {
      console.log(`Friends table now has ${friends.length} records`);
      console.log('Friends:', friends);
    }

  } catch (error) {
    console.error('Error creating test friendship:', error);
  }
}

createTestFriendship();
