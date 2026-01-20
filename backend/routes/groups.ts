import * as express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
const multer = require('multer');
import { getUploadPath, generateUniqueFilename } from '../config/storage';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, getUploadPath());
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueFilename = generateUniqueFilename(file.originalname);
    cb(null, uniqueFilename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  },
});

// GET /api/groups - Get all groups
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    const { data: groups, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get member counts and check if user is a member
    const groupsWithDetails = await Promise.all(
      (groups || []).map(async (group) => {
        const { count } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id);

        // Check if current user is a member
        const { data: membership } = await supabase
          .from('group_members')
          .select('role')
          .eq('group_id', group.id)
          .eq('user_id', userId)
          .single();

        // Get creator info
        const { data: creator } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url')
          .eq('id', group.created_by)
          .single();

        return {
          ...group,
          member_count: count || 0,
          is_member: !!membership,
          user_role: membership?.role || null,
          creator
        };
      })
    );

    res.json(groupsWithDetails);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// GET /api/groups/:id - Get single group with details
router.get('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const { data: group, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get member count
    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', id);

    // Get members list
    const { data: members } = await supabase
      .from('group_members')
      .select(`
        id,
        role,
        joined_at,
        user_id
      `)
      .eq('group_id', id)
      .order('joined_at', { ascending: true });

    // Get member profiles
    const membersWithProfiles = await Promise.all(
      (members || []).map(async (member) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url')
          .eq('id', member.user_id)
          .single();

        return {
          ...member,
          profile
        };
      })
    );

    // Check if current user is a member
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    // Get creator info
    const { data: creator } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url')
      .eq('id', group.created_by)
      .single();

    res.json({
      ...group,
      member_count: count || 0,
      members: membersWithProfiles,
      is_member: !!membership,
      user_role: membership?.role || null,
      creator
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// POST /api/groups - Create new group
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    const { name, description, is_private = false } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        is_private: is_private || false,
        created_by: userId,
        credits: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating group:', error);
      return res.status(500).json({ error: 'Failed to create group', details: error.message });
    }

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: userId,
        role: 'admin'
      });

    if (memberError) {
      console.error('Supabase error adding member:', memberError);
      // Don't fail the whole request, group was created
    }

    res.status(201).json(group);
  } catch (error: any) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group', details: error?.message });
  }
});

// POST /api/groups/:id/join - Join a group
router.post('/:id/join', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, is_private')
      .eq('id', id)
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }

    // Add user to group
    const { data: membership, error } = await supabase
      .from('group_members')
      .insert({
        group_id: id,
        user_id: userId,
        role: 'member'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Successfully joined group', membership });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// POST /api/groups/:id/leave - Leave a group
router.post('/:id/leave', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user is a member
    const { data: membership, error: memberError } = await supabase
      .from('group_members')
      .select('id, role')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership) {
      return res.status(400).json({ error: 'Not a member of this group' });
    }

    // Remove user from group
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', id)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ message: 'Successfully left group' });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// PUT /api/groups/:id - Update group
router.put('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { name, description, is_private } = req.body;

    // Check if user is admin
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update group' });
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (is_private !== undefined) updateData.is_private = is_private;

    const { data: group, error } = await supabase
      .from('groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(group);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// PUT /api/groups/:id/profile-image - Upload group profile image
router.put('/:id/profile-image', auth, upload.single('profileImage'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if user is admin
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update images' });
    }

    const publicUrl = `/uploads/${req.file.filename}`;

    const { data: group, error } = await supabase
      .from('groups')
      .update({ 
        profile_image_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ profile_image_url: publicUrl, group });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({ error: 'Failed to upload profile image' });
  }
});

// PUT /api/groups/:id/cover-image - Upload group cover image
router.put('/:id/cover-image', auth, upload.single('coverImage'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if user is admin
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update images' });
    }

    const publicUrl = `/uploads/${req.file.filename}`;

    const { data: group, error } = await supabase
      .from('groups')
      .update({ 
        cover_image_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ cover_image_url: publicUrl, group });
  } catch (error) {
    console.error('Error uploading cover image:', error);
    res.status(500).json({ error: 'Failed to upload cover image' });
  }
});

// GET /api/groups/:id/messages - Get group messages
router.get('/:id/messages', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { limit = 50, before } = req.query;

    // Check if user is a member
    const { data: membership } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Must be a member to view messages' });
    }

    let query = supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', id)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) throw error;

    // Get sender profiles
    const messagesWithProfiles = await Promise.all(
      (messages || []).map(async (message) => {
        const { data: sender } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url')
          .eq('id', message.sender_id)
          .single();

        return {
          ...message,
          sender
        };
      })
    );

    // Return in chronological order
    res.json(messagesWithProfiles.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/groups/:id/messages - Send a message to group
router.post('/:id/messages', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { content } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Check if user is a member
    const { data: membership } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Must be a member to send messages' });
    }

    const { data: message, error } = await supabase
      .from('group_messages')
      .insert({
        group_id: id,
        sender_id: userId,
        content: content.trim()
      })
      .select()
      .single();

    if (error) throw error;

    // Get sender profile
    const { data: sender } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url')
      .eq('id', userId)
      .single();

    res.status(201).json({
      ...message,
      sender
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// POST /api/groups/:id/members/:memberId/mute - Mute a member (admin/moderator only)
router.post('/:id/members/:memberId/mute', auth, async (req: AuthRequest, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user?.id;
    const { duration } = req.body; // duration in minutes, null for permanent

    // Check if user is admin or moderator
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (!membership || !['admin', 'moderator'].includes(membership.role)) {
      return res.status(403).json({ error: 'Only admins and moderators can mute members' });
    }

    // Update member with mute timestamp
    const muteUntil = duration ? new Date(Date.now() + duration * 60000).toISOString() : null;
    
    const { error } = await supabase
      .from('group_members')
      .update({ 
        muted: true,
        muted_until: muteUntil
      })
      .eq('group_id', id)
      .eq('user_id', memberId);

    if (error) throw error;

    res.json({ message: 'Member muted successfully', muted_until: muteUntil });
  } catch (error) {
    console.error('Error muting member:', error);
    res.status(500).json({ error: 'Failed to mute member' });
  }
});

// POST /api/groups/:id/members/:memberId/unmute - Unmute a member (admin/moderator only)
router.post('/:id/members/:memberId/unmute', auth, async (req: AuthRequest, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user?.id;

    // Check if user is admin or moderator
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (!membership || !['admin', 'moderator'].includes(membership.role)) {
      return res.status(403).json({ error: 'Only admins and moderators can unmute members' });
    }

    const { error } = await supabase
      .from('group_members')
      .update({ 
        muted: false,
        muted_until: null
      })
      .eq('group_id', id)
      .eq('user_id', memberId);

    if (error) throw error;

    res.json({ message: 'Member unmuted successfully' });
  } catch (error) {
    console.error('Error unmuting member:', error);
    res.status(500).json({ error: 'Failed to unmute member' });
  }
});

// DELETE /api/groups/:id/members/:memberId - Remove a member (admin only)
router.delete('/:id/members/:memberId', auth, async (req: AuthRequest, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user?.id;

    // Check if user is admin
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }

    // Don't allow removing yourself
    if (memberId === userId) {
      return res.status(400).json({ error: 'Cannot remove yourself. Use leave endpoint instead.' });
    }

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', id)
      .eq('user_id', memberId);

    if (error) throw error;

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// PUT /api/groups/:id/members/:memberId/role - Change member role (admin only)
router.put('/:id/members/:memberId/role', auth, async (req: AuthRequest, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user?.id;
    const { role } = req.body;

    if (!['admin', 'moderator', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user is admin
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can change member roles' });
    }

    const { error } = await supabase
      .from('group_members')
      .update({ role })
      .eq('group_id', id)
      .eq('user_id', memberId);

    if (error) throw error;

    res.json({ message: 'Member role updated successfully', role });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

// POST /api/groups/:id/invite - Invite user to group (admin/moderator only)
router.post('/:id/invite', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { invitedUserId } = req.body;

    if (!invitedUserId) {
      return res.status(400).json({ error: 'Invited user ID is required' });
    }

    // Check if user is admin or moderator
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (!membership || !['admin', 'moderator'].includes(membership.role)) {
      return res.status(403).json({ error: 'Only admins and moderators can invite members' });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', id)
      .eq('user_id', invitedUserId)
      .single();

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // Add user to group
    const { data: newMember, error } = await supabase
      .from('group_members')
      .insert({
        group_id: id,
        user_id: invitedUserId,
        role: 'member'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'User invited successfully', member: newMember });
  } catch (error) {
    console.error('Error inviting user:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

// DELETE /api/groups/:id - Delete group (admin only)
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Check if user is admin
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete group' });
    }

    // Delete group (cascade will handle members and messages)
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

export default router;
