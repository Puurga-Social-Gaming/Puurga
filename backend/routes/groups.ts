import * as express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import multer from 'multer';
import { normalizeImageUrl } from '../utils/url';
import { validateNotGhosted } from '../middleware/restrictGhosted';
import path from 'path';
import crypto from 'crypto';
import { wsManager } from '../websocketManager';

const router = express.Router();

async function getGroupMemberIds(groupId: string, excludeUserId?: string): Promise<string[]> {
  const { data } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);
  return (data || [])
    .map((m) => m.user_id as string)
    .filter((uid) => uid && uid !== excludeUserId);
}

const generateInviteCode = (): string => {
  return crypto.randomBytes(3).toString('hex');
};

// Configure multer for memory storage (direct to Supabase)
const storage = multer.memoryStorage();

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
          profile_image_url: normalizeImageUrl(group.profile_image_url),
          cover_image_url: normalizeImageUrl(group.cover_image_url),
          member_count: count || 0,
          is_member: !!membership,
          user_role: membership?.role || null,
          creator: creator ? {
            ...creator,
            avatar_url: normalizeImageUrl(creator.avatar_url)
          } : null
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
          profile: profile ? {
            ...profile,
            avatar_url: normalizeImageUrl(profile.avatar_url)
          } : null
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
      profile_image_url: normalizeImageUrl(group.profile_image_url),
      cover_image_url: normalizeImageUrl(group.cover_image_url),
      member_count: count || 0,
      members: membersWithProfiles,
      is_member: !!membership,
      user_role: membership?.role || null,
      creator: creator ? {
        ...creator,
        avatar_url: normalizeImageUrl(creator.avatar_url)
      } : null
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

    // Max 3 groups per user (as admin/creator or member)
    const { count: ownedCount, error: ownedErr } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (ownedErr) {
      console.warn('Group count check warning:', ownedErr.message);
    } else if ((ownedCount || 0) >= 3) {
      return res.status(400).json({
        error: 'You can be in a maximum of 3 groups',
        code: 'GROUP_LIMIT',
      });
    }

    const inviteCode = Math.random().toString(36).substring(2, 10).toLowerCase();

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        is_private: is_private || false,
        created_by: userId,
        credits: 0,
        invite_code: inviteCode,
      })
      .select()
      .single();

    if (error) {
      // Retry without invite_code if column missing
      if ((error as any).code === '42703' || /invite_code/i.test(error.message || '')) {
        const retry = await supabase
          .from('groups')
          .insert({
            name: name.trim(),
            description: description?.trim() || null,
            is_private: is_private || false,
            created_by: userId,
            credits: 0,
          })
          .select()
          .single();
        if (retry.error) {
          console.error('Supabase error creating group:', retry.error);
          return res.status(500).json({ error: 'Failed to create group', details: retry.error.message });
        }
        const { error: memberError } = await supabase.from('group_members').insert({
          group_id: retry.data.id,
          user_id: userId,
          role: 'admin',
        });
        if (memberError) {
          await supabase.from('groups').delete().eq('id', retry.data.id);
          return res.status(500).json({ error: 'Failed to add you as group admin', details: memberError.message });
        }
        return res.status(201).json({ ...retry.data, is_member: true, user_role: 'admin', member_count: 1 });
      }

      console.error('Supabase error creating group:', error);
      return res.status(500).json({ error: 'Failed to create group', details: error.message });
    }

    // Add creator as admin — must succeed or roll back
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: userId,
        role: 'admin',
      });

    if (memberError) {
      console.error('Supabase error adding member:', memberError);
      await supabase.from('groups').delete().eq('id', group.id);
      return res.status(500).json({
        error: 'Failed to add you as group admin',
        details: memberError.message,
      });
    }

    res.status(201).json({
      ...group,
      is_member: true,
      user_role: 'admin',
      member_count: 1,
    });
  } catch (error: any) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group', details: error?.message });
  }
});

// POST /api/groups/:id/join - Join a group
router.post('/:id/join', auth, validateNotGhosted, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    let groupId = id;

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

    // Max 3 members per group
    const { count: memberCount } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', id);

    if ((memberCount || 0) >= 3) {
      return res.status(400).json({
        error: 'This group is full (max 3 members)',
        code: 'GROUP_FULL',
      });
    }

    // Max 3 groups per user
    const { count: userGroups } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if ((userGroups || 0) >= 3) {
      return res.status(400).json({
        error: 'You can be in a maximum of 3 groups',
        code: 'GROUP_LIMIT',
      });
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

// POST /api/groups/join - Join a group via invite code
router.post('/join', auth, validateNotGhosted, async (req: AuthRequest, res) => {
  try {
    const { invite_code } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!invite_code) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    // Find group by invite code
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name, is_private')
      .eq('invite_code', invite_code.toLowerCase())
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }

    const { count: memberCount } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id);

    if ((memberCount || 0) >= 3) {
      return res.status(400).json({
        error: 'This group is full (max 3 members)',
        code: 'GROUP_FULL',
      });
    }

    const { count: userGroups } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if ((userGroups || 0) >= 3) {
      return res.status(400).json({
        error: 'You can be in a maximum of 3 groups',
        code: 'GROUP_LIMIT',
      });
    }

    // Add user to group
    const { data: membership, error } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: userId,
        role: 'member'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Successfully joined group', group, membership });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// GET /api/groups/:id/invite - Get group invite link
router.get('/:id/invite', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Check if user is a member
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Must be a member to get invite link' });
    }

    // Get group and generate invite code if not exists
    const { data: group, error } = await supabase
      .from('groups')
      .select('id, name, invite_code')
      .eq('id', id)
      .single();

    if (error || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    let inviteCode = group.invite_code;
    if (!inviteCode) {
      inviteCode = generateInviteCode();
      await supabase
        .from('groups')
        .update({ invite_code: inviteCode })
        .eq('id', id);
    }

    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${inviteCode}`;

    res.json({
      invite_code: inviteCode,
      invite_link: inviteLink
    });
  } catch (error) {
    console.error('Error getting invite link:', error);
    res.status(500).json({ error: 'Failed to get invite link' });
  }
});

// POST /api/groups/:id/invite/regenerate - Regenerate invite code (admin only)
router.post('/:id/invite/regenerate', auth, async (req: AuthRequest, res) => {
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
      return res.status(403).json({ error: 'Only admins can regenerate invite code' });
    }

    // Generate new invite code
    const inviteCode = generateInviteCode();

    const { data: group, error } = await supabase
      .from('groups')
      .update({ invite_code: inviteCode })
      .eq('id', id)
      .select('id, name')
      .single();

    if (error) throw error;

    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${inviteCode}`;

    res.json({
      message: 'Invite code regenerated',
      invite_code: inviteCode,
      invite_link: inviteLink
    });
  } catch (error) {
    console.error('Error regenerating invite code:', error);
    res.status(500).json({ error: 'Failed to regenerate invite code' });
  }
});

// GET /api/groups/invite/:inviteCode - Get group by invite code (preview)
router.get('/invite/:inviteCode', auth, async (req: AuthRequest, res) => {
  try {
    const { inviteCode } = req.params;
    const userId = req.user?.id;

    // Find group by invite code
    const { data: group, error } = await supabase
      .from('groups')
      .select('id, name, description, profile_image_url, cover_image_url, is_private')
      .eq('invite_code', inviteCode.toLowerCase())
      .single();

    if (error || !group) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Get member count
    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id);

    // Get members list
    const { data: members } = await supabase
      .from('group_members')
      .select('id, role, user_id')
      .eq('group_id', group.id)
      .order('joined_at', { ascending: true })
      .limit(10);

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
          profile: profile ? {
            ...profile,
            avatar_url: normalizeImageUrl(profile.avatar_url)
          } : null
        };
      })
    );

    res.json({
      ...group,
      profile_image_url: normalizeImageUrl(group.profile_image_url),
      cover_image_url: normalizeImageUrl(group.cover_image_url),
      member_count: count || 0,
      members: membersWithProfiles
    });
  } catch (error) {
    console.error('Error fetching group by invite code:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
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

    const fileExt = path.extname(req.file.originalname);
    const filename = `group-${id}-profile-${Date.now()}${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars') // Using avatars bucket as it already exists and is configured
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '31536000',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filename);

    const publicUrl = publicUrlData.publicUrl;

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

    res.json({ profile_image_url: normalizeImageUrl(publicUrl), group });
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

    const fileExt = path.extname(req.file.originalname);
    const filename = `group-${id}-cover-${Date.now()}${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '31536000',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filename);

    const publicUrl = publicUrlData.publicUrl;

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

    res.json({ cover_image_url: normalizeImageUrl(publicUrl), group });
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

    const chronological = [...(messages || [])].reverse();
    const messageIds = chronological.map((m) => m.id);

    const reactionsByMessage = new Map<string, Record<string, { count: number; reacted_by_me: boolean }>>();
    const readCounts = new Map<string, number>();

    if (messageIds.length > 0) {
      const [{ data: reactionRows }, { data: readRows }] = await Promise.all([
        supabase.from('group_message_reactions').select('message_id, user_id, emoji').in('message_id', messageIds),
        supabase.from('group_message_reads').select('message_id').in('message_id', messageIds),
      ]);

      (reactionRows || []).forEach((r: any) => {
        if (!reactionsByMessage.has(r.message_id)) reactionsByMessage.set(r.message_id, {});
        const bucket = reactionsByMessage.get(r.message_id)!;
        if (!bucket[r.emoji]) bucket[r.emoji] = { count: 0, reacted_by_me: false };
        bucket[r.emoji].count += 1;
        if (r.user_id === userId) bucket[r.emoji].reacted_by_me = true;
      });

      (readRows || []).forEach((r: any) => {
        readCounts.set(r.message_id, (readCounts.get(r.message_id) || 0) + 1);
      });
    }

    const messagesWithProfiles = await Promise.all(
      chronological.map(async (message: any) => {
        const { data: sender } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url')
          .eq('id', message.sender_id)
          .single();

        const isDeleted = Boolean(message.is_deleted);
        return {
          ...message,
          content: isDeleted ? null : message.content,
          images: isDeleted ? [] : (message.images || message.media || []),
          media: isDeleted ? [] : (message.images || message.media || []),
          reactions: reactionsByMessage.get(message.id) || {},
          read_count: readCounts.get(message.id) || 0,
          sender: sender
            ? {
                ...sender,
                avatar_url: normalizeImageUrl(sender.avatar_url),
              }
            : null,
        };
      })
    );

    res.json(messagesWithProfiles);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/groups/:id/messages - Send a message to group
router.post('/:id/messages', auth, validateNotGhosted, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { content, media, images, language: bodyLanguage } = req.body;
    const mediaUrls = Array.isArray(images) ? images : Array.isArray(media) ? media : [];

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const hasContent = typeof content === 'string' && content.trim().length > 0;
    if (!hasContent && mediaUrls.length === 0) {
      return res.status(400).json({ error: 'Message content or media required' });
    }

    const { TranslationService } = await import('../services/translationService');
    const sourceLanguage = TranslationService.normalizeLang(
      bodyLanguage || (await TranslationService.getUserLanguage(userId))
    );

    const { data: membership } = await supabase
      .from('group_members')
      .select('id, muted')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Must be a member to send messages' });
    }
    if (membership.muted) {
      return res.status(403).json({ error: 'You are muted in this group' });
    }

    const insertPayload: any = {
      group_id: id,
      sender_id: userId,
      content: hasContent ? content.trim() : '',
      language: sourceLanguage,
      created_at: new Date().toISOString(),
    };
    if (mediaUrls.length > 0) {
      insertPayload.images = mediaUrls;
    }

    let { data: message, error } = await supabase
      .from('group_messages')
      .insert(insertPayload)
      .select()
      .single();

    if (error && (error.code === '42703' || error.message?.includes('language'))) {
      delete insertPayload.language;
      const retry = await supabase.from('group_messages').insert(insertPayload).select().single();
      message = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    const { data: sender } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url')
      .eq('id', userId)
      .single();

    const messageLanguage = TranslationService.normalizeLang(
      (message as any).language || sourceLanguage
    );

    const baseFormatted = {
      ...message,
      language: messageLanguage,
      images: message.images || mediaUrls,
      media: message.images || mediaUrls,
      reactions: {},
      read_count: 0,
      sender: sender
        ? {
            ...sender,
            avatar_url: normalizeImageUrl(sender.avatar_url),
          }
        : null,
    };

    const memberIds = await getGroupMemberIds(id, userId);
    await Promise.all(
      memberIds.map(async (memberId) => {
        let translated_content: string | null = null;
        let translated_language: string | null = null;
        if (hasContent) {
          try {
            const result = await TranslationService.translateForRecipient({
              sourceType: 'group_message',
              sourceId: message.id,
              content: message.content,
              sourceLanguage: messageLanguage,
              recipientId: memberId,
            });
            translated_content = result.translatedContent;
            translated_language = result.translatedLanguage;
          } catch {
            /* ignore */
          }
        }
        wsManager.broadcastToUsers([memberId], {
          type: 'group_message',
          payload: {
            groupId: id,
            message: {
              ...baseFormatted,
              translated_content,
              translated_language,
            },
          },
        });
      })
    );

    res.status(201).json(baseFormatted);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

const GROUP_REACTION_EMOJIS = ['❤️', '👍', '🔥', '😂', '😮', '🎉'];

router.post('/:id/messages/:messageId/reactions', auth, async (req: AuthRequest, res) => {
  try {
    const { id, messageId } = req.params;
    const userId = req.user?.id;
    const emoji = typeof req.body?.emoji === 'string' ? req.body.emoji.trim() : '';
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!GROUP_REACTION_EMOJIS.includes(emoji)) {
      return res.status(400).json({ error: 'Invalid emoji', allowed: GROUP_REACTION_EMOJIS });
    }

    const { data: membership } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    const { data: existing } = await supabase
      .from('group_message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      await supabase.from('group_message_reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('group_message_reactions').delete().eq('message_id', messageId).eq('user_id', userId);
      await supabase.from('group_message_reactions').insert({
        message_id: messageId,
        user_id: userId,
        emoji,
      });
    }

    const { data: rows } = await supabase
      .from('group_message_reactions')
      .select('emoji, user_id')
      .eq('message_id', messageId);

    const reactions: Record<string, { count: number; reacted_by_me: boolean }> = {};
    (rows || []).forEach((r: any) => {
      if (!reactions[r.emoji]) reactions[r.emoji] = { count: 0, reacted_by_me: false };
      reactions[r.emoji].count += 1;
      if (r.user_id === userId) reactions[r.emoji].reacted_by_me = true;
    });

    const memberIds = await getGroupMemberIds(id);
    wsManager.broadcastToUsers(memberIds, {
      type: 'group_message_reaction',
      payload: { groupId: id, messageId, reactions },
    });

    res.json({ messageId, reactions });
  } catch (error) {
    console.error('Error reacting to group message:', error);
    res.status(500).json({ error: 'Failed to react' });
  }
});

router.put('/:id/messages/read', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: membership } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    const { data: recent } = await supabase
      .from('group_messages')
      .select('id')
      .eq('group_id', id)
      .neq('sender_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (recent && recent.length > 0) {
      const rows = recent.map((m) => ({
        message_id: m.id,
        user_id: userId,
        read_at: new Date().toISOString(),
      }));
      await supabase.from('group_message_reads').upsert(rows, {
        onConflict: 'message_id,user_id',
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking group messages read:', error);
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

router.post('/:id/typing', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { isTyping } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const memberIds = await getGroupMemberIds(id, userId);
    wsManager.broadcastToUsers(memberIds, {
      type: 'group_typing',
      payload: { groupId: id, userId, isTyping: !!isTyping },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send typing' });
  }
});

// POST /api/groups/:id/members/:memberId/mute - Mute a member (admin/moderator only)
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
