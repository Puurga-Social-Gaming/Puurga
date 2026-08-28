import express from 'express';
import { requireSupabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { createNotification } from './createNotification';
import { validateNotGhosted } from '../middleware/restrictGhosted';
import { areBlocked, syncMutualFollows } from '../utils/friendRelations';
import { progressionEngine } from '../services/progressionEngine';
import { DailyMissionService } from '../services/dailyMissionService';
import { FriendRequest, Friendship, User, Profile, Op } from '../models';

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
router.post('/send', auth, validateNotGhosted, async (req: AuthRequest, res) => {
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

    if (await areBlocked(user.id, receiverId)) {
      return res.status(403).json({
        error: 'Cannot send friend request due to a block',
        code: 'USER_BLOCKED',
      });
    }

    // Check if they're already friends using Sequelize
    const existingFriendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { user_id: user.id, friend_id: receiverId },
          { user_id: receiverId, friend_id: user.id }
        ]
      }
    });

    if (existingFriendship) {
      return res.status(400).json({ message: 'You are already friends with this user', status: 'accepted' });
    }

    // Check if a friend request already exists (in either direction) using Sequelize
    const existingRequest = await FriendRequest.findOne({
      where: {
        [Op.or]: [
          { sender_id: user.id, receiver_id: receiverId },
          { sender_id: receiverId, receiver_id: user.id }
        ]
      }
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        // If the other user sent us a request, auto-accept it
        if (existingRequest.sender_id === receiverId) {
          // Accept the existing request
          await existingRequest.update({ status: 'accepted' });

          // Create friendship
          await Friendship.create({
            user_id: user.id,
            friend_id: receiverId,
            status: 'accepted',
            created_at: new Date()
          });

          // Sync mutual follows
          await syncMutualFollows(user.id, receiverId);

          // Create notifications for both users
          await createNotification({
            type: 'friend_request_accepted',
            senderId: user.id,
            receiverId: receiverId,
          });

          await createNotification({
            type: 'friend_request_accepted',
            senderId: receiverId,
            receiverId: user.id,
          });

          // Emit progression events
          progressionEngine.safeEmit('friendRequestAccepted', { userId: user.id });
          progressionEngine.safeEmit('friendRequestAccepted', { userId: receiverId });

          // Track daily missions
          DailyMissionService.trackProgress(user.id, 'make_friends', 1);
          DailyMissionService.trackProgress(receiverId, 'make_friends', 1);

          return res.json({ message: 'Friend request accepted', status: 'accepted', requestId: existingRequest.id });
        } else {
          return res.status(400).json({ message: 'Friend request already sent', status: 'pending', requestId: existingRequest.id });
        }
      } else if (existingRequest.status === 'accepted') {
        return res.status(400).json({ message: 'You are already friends with this user', status: 'accepted' });
      } else {
        // Rejected request - allow re-sending
        await existingRequest.update({ status: 'pending' });

        // Create notification for the receiver
        await createNotification({
          type: 'friend_request',
          senderId: user.id,
          receiverId: receiverId,
        });

        return res.json({ message: 'Friend request sent', status: 'pending', requestId: existingRequest.id });
      }
    }

    // Create new friend request using Sequelize
    const newRequest = await FriendRequest.create({
      sender_id: user.id,
      receiver_id: receiverId,
      status: 'pending',
      created_at: new Date()
    });

    // Create notification for the receiver
    await createNotification({
      type: 'friend_request',
      senderId: user.id,
      receiverId: receiverId,
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

    // Check if they're already friends using Sequelize
    const existingFriendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { user_id: user.id, friend_id: targetUserId },
          { user_id: targetUserId, friend_id: user.id }
        ]
      }
    });

    if (existingFriendship) {
      return res.json({ status: 'accepted' });
    }

    // Check for existing friend request using Sequelize
    const request = await FriendRequest.findOne({
      where: {
        [Op.or]: [
          { sender_id: user.id, receiver_id: targetUserId },
          { sender_id: targetUserId, receiver_id: user.id }
        ]
      }
    });

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

    // Get the friend request using Sequelize
    const request = await FriendRequest.findByPk(requestId);

    if (!request) {
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
    await request.update({ status: 'accepted' });

    // Create friendship using Sequelize
    await Friendship.create({
      user_id: request.sender_id,
      friend_id: request.receiver_id,
      status: 'accepted',
      created_at: new Date()
    });

    await syncMutualFollows(request.sender_id, request.receiver_id);

    // Notify the sender that their request was accepted
    await createNotification({
      type: 'friend_request_accepted',
      senderId: user.id,
      receiverId: request.sender_id,
    });

    // Emit progression event (XP for both users)
    progressionEngine.safeEmit('FriendAdded', {
      userId: request.sender_id,
      friendId: request.receiver_id,
    });

    // Track daily mission progress
    DailyMissionService.trackProgress(request.sender_id, 'add_friend').catch(() => {});

    res.json({ message: 'Friend request accepted', status: 'accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// Cancel an outgoing pending friend request (sender only)
router.delete('/:requestId/cancel', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { requestId } = req.params;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const request = await FriendRequest.findByPk(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (request.sender_id !== user.id) {
      return res.status(403).json({ error: 'You can only cancel requests you sent' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be cancelled' });
    }

    await request.destroy();

    res.json({ message: 'Friend request cancelled', status: 'none' });
  } catch (error) {
    console.error('Error cancelling friend request:', error);
    res.status(500).json({ error: 'Failed to cancel friend request' });
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

    // Get the friend request using Sequelize
    const request = await FriendRequest.findByPk(requestId);

    if (!request) {
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
    await request.update({ status: 'rejected' });

    res.json({ message: 'Friend request rejected', status: 'rejected' });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

export default router;
