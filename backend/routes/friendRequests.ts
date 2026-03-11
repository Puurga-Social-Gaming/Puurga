import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { createNotification } from './createNotification';

const router = express.Router();

const getErrDetails = (err: any) => {
  if (!err) return undefined;
  return {
    code: err.code,
    message: err.message,
    details: err.details,
    hint: err.hint,
  };
};

// Send a friend request
router.post('/send', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { receiverId } = req.body;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!receiverId) {
      return res.status(400).json({ error: 'receiverId is required' });
    }

    if (user.id === receiverId) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    // Check if they're already friends
    const { data: friendRows, error: friendError } = await supabase
      .from('friends')
      .select('id, user_id_1, user_id_2')
      .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${receiverId}),and(user_id_1.eq.${receiverId},user_id_2.eq.${user.id})`);

    if (friendError) {
      // Missing table is handled gracefully
      if ((friendError as any).code !== '42P01' && (friendError as any).code !== '42703') {
        console.error('Error checking existing friendship:', friendError);
        return res.status(500).json({ error: 'Failed to check friendship', details: getErrDetails(friendError) });
      }
    } else if ((friendRows || []).length > 0) {
      return res.status(400).json({ message: 'You are already friends with this user', status: 'accepted' });
    }

    // Check if a friend request already exists (in either direction)
    const { data: existingRequests, error: checkError } = await supabase
      .from('friend_requests')
      .select('id, status, sender_id, receiver_id')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`);

    if (checkError) {
      if ((checkError as any).code === '42P01' || (checkError as any).code === '42703') {
        // Table/column missing; fall through to insert which will error with a clearer message
      } else {
        console.error('Error checking existing request:', checkError);
        return res.status(500).json({ error: 'Failed to check existing friend request', details: getErrDetails(checkError) });
      }
    }

    const existingRequest = Array.isArray(existingRequests) && existingRequests.length > 0
      ? (existingRequests[0] as any)
      : null;

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        // If the other user sent us a request, auto-accept it
        if (existingRequest.sender_id === receiverId) {
          // Accept the existing request
          const { error: updateError } = await supabase
            .from('friend_requests')
            .update({ status: 'accepted' })
            .eq('id', existingRequest.id);

          if (updateError) throw updateError;

          // Create friendship
          const { error: friendshipError } = await supabase
            .from('friends')
            .insert({
              user_id_1: user.id,
              user_id_2: receiverId,
              created_at: new Date().toISOString()
            });

          if (friendshipError) {
            console.error('Error creating friendship:', friendshipError);
          }

          // Notify the original sender that their request was accepted
          await createNotification({
            type: 'friend_request_accepted',
            senderId: user.id,
            receiverId: receiverId,
            // friendRequestId removed (column not in DB)
          });

          return res.json({ message: 'Friend request accepted', status: 'accepted' });
        }
        return res.status(400).json({ message: 'Friend request already exists', status: 'pending' });
      }
      if (existingRequest.status === 'accepted') {
        return res.status(400).json({ message: 'You are already friends with this user', status: 'accepted' });
      }
      // If rejected, allow sending a new request by updating the existing one
      if (existingRequest.status === 'rejected') {
        const { data: updatedRequest, error: updateError } = await supabase
          .from('friend_requests')
          .update({ 
            status: 'pending', 
            sender_id: user.id,
            receiver_id: receiverId
          })
          .eq('id', existingRequest.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Create notification for the receiver
        await createNotification({
          type: 'friend_request',
          senderId: user.id,
          receiverId: receiverId,
          // friendRequestId removed (column not in DB)
        });

        return res.json({ message: 'Friend request sent', status: 'pending', requestId: updatedRequest.id });
      }
    }

    // Create new friend request
    const { data: newRequest, error: insertError } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      // Handle table not existing
      if ((insertError as any).code === '42P01') {
        return res.status(500).json({ error: 'Friend requests table not found. Please run migrations.', details: getErrDetails(insertError) });
      }
      // Duplicate request (or unique constraint) - map to 400 with friendly message
      if ((insertError as any).code === '23505') {
        return res.status(400).json({ message: 'Friend request already exists', status: 'pending', details: getErrDetails(insertError) });
      }
      console.error('Error inserting friend request:', insertError);
      return res.status(500).json({ error: 'Failed to create friend request', details: getErrDetails(insertError) });
    }

    // Create notification for the receiver
    await createNotification({
      type: 'friend_request',
      senderId: user.id,
      receiverId: receiverId,
      // friendRequestId removed (column not in DB)
    });

    res.json({ message: 'Friend request sent', status: 'pending', requestId: newRequest.id });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request', details: getErrDetails(error) });
  }
});

// Get friend request status with a specific user
router.get('/status/:targetUserId', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { targetUserId } = req.params;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if they're already friends
    const { data: existingFriend, error: friendError } = await supabase
      .from('friends')
      .select('id')
      .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${targetUserId}),and(user_id_1.eq.${targetUserId},user_id_2.eq.${user.id})`)
      .maybeSingle();

    if (friendError && friendError.code !== 'PGRST116' && (friendError as any).code !== '42P01') {
      console.error('Error checking friendship:', friendError);
    }

    if (existingFriend) {
      return res.json({ status: 'accepted' });
    }

    // Check for existing friend request
    const { data: request, error } = await supabase
      .from('friend_requests')
      .select('id, status, sender_id, receiver_id')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id})`)
      .maybeSingle();

    if (error) {
      if ((error as any).code === '42P01') {
        return res.json({ status: 'none' });
      }
      if (error.code !== 'PGRST116') {
        throw error;
      }
    }

    if (!request) {
      return res.json({ status: 'none' });
    }

    // If the current user is the receiver of a pending request, return 'incoming'
    if (request.receiver_id === user.id && request.status === 'pending') {
      return res.json({ status: 'incoming', requestId: request.id });
    }

    res.json({ status: request.status, requestId: request.id });
  } catch (error) {
    console.error('Error checking friend request status:', error);
    res.status(500).json({ error: 'Failed to check friend request status' });
  }
});

// Accept a friend request
router.post('/:requestId/accept', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { requestId } = req.params;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the friend request
    const { data: request, error: fetchError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Only the receiver can accept
    if (request.receiver_id !== user.id) {
      return res.status(403).json({ error: 'You can only accept requests sent to you' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Friend request is not pending' });
    }

    // Update the request status
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // Create friendship (bidirectional entry)
    const { error: friendshipError } = await supabase
      .from('friends')
      .insert({
        user_id_1: request.sender_id,
        user_id_2: request.receiver_id,
        created_at: new Date().toISOString()
      });

    if (friendshipError) {
      console.error('Error creating friendship:', friendshipError);
      // Don't throw - the request was still accepted
    }

    // Notify the sender that their request was accepted
    await createNotification({
      type: 'friend_request_accepted',
      senderId: user.id,
      receiverId: request.sender_id,
      // friendRequestId removed (column not in DB)
    });

    res.json({ message: 'Friend request accepted', status: 'accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// Reject a friend request
router.post('/:requestId/reject', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { requestId } = req.params;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the friend request
    const { data: request, error: fetchError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Only the receiver can reject
    if (request.receiver_id !== user.id) {
      return res.status(403).json({ error: 'You can only reject requests sent to you' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Friend request is not pending' });
    }

    // Update the request status
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (updateError) throw updateError;

    res.json({ message: 'Friend request rejected', status: 'rejected' });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

export default router;
