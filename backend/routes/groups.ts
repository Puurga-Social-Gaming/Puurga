import * as express from 'express';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import multer from 'multer';
import fs from 'fs';
import { normalizeImageUrl } from '../utils/url';
import { validateNotGhosted } from '../middleware/restrictGhosted';
import path from 'path';
import crypto from 'crypto';
import { wsManager } from '../websocketManager';
import { getUploadPath } from '../config/storage';
import { Profile, sequelize, Op } from '../models';
import { QueryTypes } from 'sequelize';

const router = express.Router();

async function getGroupMemberIds(groupId: string, excludeUserId?: string): Promise<string[]> {
  const rows = await sequelize.query(
    `SELECT user_id FROM group_members WHERE group_id = :groupId`,
    { replacements: { groupId }, type: QueryTypes.SELECT }
  );
  return (rows as any[])
    .map((m) => m.user_id as string)
    .filter((uid) => uid && uid !== excludeUserId);
}

async function getMemberRow(groupId: string, userId?: string): Promise<any | null> {
  if (!userId) return null;
  const rows = await sequelize.query(
    `SELECT id, role, muted, muted_until, joined_at, user_id FROM group_members
     WHERE group_id = :groupId AND user_id = :userId
     LIMIT 1`,
    { replacements: { groupId, userId }, type: QueryTypes.SELECT }
  );
  return (rows as any[])[0] || null;
}

async function getMemberCount(groupId: string): Promise<number> {
  const rows = await sequelize.query(
    `SELECT COUNT(*) AS count FROM group_members WHERE group_id = :groupId`,
    { replacements: { groupId }, type: QueryTypes.SELECT }
  );
  return Number((rows as any[])[0]?.count || 0);
}

async function getUserGroupCount(userId: string): Promise<number> {
  const rows = await sequelize.query(
    `SELECT COUNT(*) AS count FROM group_members WHERE user_id = :userId`,
    { replacements: { userId }, type: QueryTypes.SELECT }
  );
  return Number((rows as any[])[0]?.count || 0);
}

const generateInviteCode = (): string => {
  return crypto.randomBytes(3).toString('hex');
};

// Configure multer for memory storage (so req.file.buffer is available for local writes)
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

function saveLocalImage(filename: string, buffer: Buffer): string {
  const uploadDir = getUploadPath();
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return `/uploads/${filename}`;
}

// GET /api/groups - Get all groups
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    const rows = await sequelize.query(
      `SELECT g.* FROM groups g ORDER BY g.created_at DESC`,
      { type: QueryTypes.SELECT }
    );
    const groups = (rows as any[]) || [];

    const groupsWithDetails = await Promise.all(
      groups.map(async (group) => {
        const [memberCount, membership, creator] = await Promise.all([
          getMemberCount(group.id),
          getMemberRow(group.id, userId),
          Profile.findOne({ where: { id: group.created_by }, attributes: ['id', 'username', 'full_name', 'avatar_url'] }),
        ]);

        return {
          ...group,
          profile_image_url: normalizeImageUrl(group.profile_image_url),
          cover_image_url: normalizeImageUrl(group.cover_image_url),
          member_count: memberCount,
          is_member: !!membership,
          user_role: membership?.role || null,
          creator: creator
            ? {
                ...creator.toJSON(),
                avatar_url: normalizeImageUrl((creator as any).avatar_url),
              }
            : null,
        };
      })
    );

    res.json(groupsWithDetails);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// GET /api/groups/invite/:inviteCode - Get group by invite code (preview) — must be BEFORE /:id
router.get('/invite/:inviteCode', auth, async (req: AuthRequest, res) => {
  try {
    const { inviteCode } = req.params;

    // Find group by invite code
    const groupRows = await sequelize.query(
      `SELECT id, name, description, profile_image_url, cover_image_url, is_private
       FROM groups WHERE invite_code = :inviteCode LIMIT 1`,
      { replacements: { inviteCode: String(inviteCode).toLowerCase() }, type: QueryTypes.SELECT }
    );
    const group = (groupRows as any[])[0];

    if (!group) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Get member count
    const memberCount = await getMemberCount(group.id);

    // Get members list
    const memberRows = await sequelize.query(
      `SELECT id, role, user_id FROM group_members
       WHERE group_id = :groupId ORDER BY joined_at ASC LIMIT 10`,
      { replacements: { groupId: group.id }, type: QueryTypes.SELECT }
    );
    const members = (memberRows as any[]) || [];

    // Bulk fetch member profiles
    const profileIds = [...new Set(members.map((m: any) => m.user_id).filter(Boolean))];
    const profilesMap = new Map<string, any>();
    if (profileIds.length > 0) {
      const profiles = await Profile.findAll({
        where: { id: profileIds as any[] },
        attributes: ['id', 'username', 'full_name', 'avatar_url'],
      });
      (profiles || []).forEach((p: any) => profilesMap.set((p as any).id, p));
    }

    const membersWithProfiles = members.map((member: any) => {
      const profile = profilesMap.get(member.user_id);
      return {
        ...member,
        profile: profile
          ? {
              ...profile.toJSON(),
              avatar_url: normalizeImageUrl((profile as any).avatar_url),
            }
          : null,
      };
    });

    res.json({
      ...group,
      profile_image_url: normalizeImageUrl(group.profile_image_url),
      cover_image_url: normalizeImageUrl(group.cover_image_url),
      member_count: memberCount,
      members: membersWithProfiles,
    });
  } catch (error) {
    console.error('Error fetching group by invite code:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// GET /api/groups/:id - Get single group with details
router.get('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const groupRows = await sequelize.query(
      `SELECT g.* FROM groups g WHERE g.id = :id LIMIT 1`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    const group = (groupRows as any[])[0];

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const [memberCount, memberRows, membership, creator] = await Promise.all([
      getMemberCount(id),
      sequelize.query(
        `SELECT id, role, joined_at, user_id FROM group_members
         WHERE group_id = :id ORDER BY joined_at ASC`,
        { replacements: { id }, type: QueryTypes.SELECT }
      ),
      getMemberRow(id, userId),
      Profile.findOne({ where: { id: group.created_by }, attributes: ['id', 'username', 'full_name', 'avatar_url'] }),
    ]);
    const members = (memberRows as any[]) || [];

    // Bulk fetch member profiles
    const profileIds = [...new Set(members.map((m: any) => m.user_id).filter(Boolean))];
    const profilesMap = new Map<string, any>();
    if (profileIds.length > 0) {
      const profiles = await Profile.findAll({
        where: { id: profileIds as any[] },
        attributes: ['id', 'username', 'full_name', 'avatar_url'],
      });
      (profiles || []).forEach((p: any) => profilesMap.set((p as any).id, p));
    }

    const membersWithProfiles = members.map((member: any) => {
      const profile = profilesMap.get(member.user_id);
      return {
        ...member,
        profile: profile
          ? {
              ...profile.toJSON(),
              avatar_url: normalizeImageUrl((profile as any).avatar_url),
            }
          : null,
      };
    });

    res.json({
      ...group,
      profile_image_url: normalizeImageUrl(group.profile_image_url),
      cover_image_url: normalizeImageUrl(group.cover_image_url),
      member_count: memberCount,
      members: membersWithProfiles,
      is_member: !!membership,
      user_role: membership?.role || null,
      creator: creator
        ? {
            ...creator.toJSON(),
            avatar_url: normalizeImageUrl((creator as any).avatar_url),
          }
        : null,
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// POST /api/groups - Create new group
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    console.log('[groups POST /] req.user:', JSON.stringify(req.user || null)?.slice(0, 500), 'body:', JSON.stringify(req.body || null)?.slice(0, 500));
    const { name, description, is_private = false } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      console.error('[groups POST /] missing userId, req.user is', req.user);
      return res.status(401).json({ error: 'User not authenticated', details: `req.user is ${JSON.stringify(req.user)}` });
    }

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Ensure profile exists — groups.created_by FK references profiles(id)
    // If auth produced a user without a local profile row, create minimal one
    try {
      const existingProfile = await Profile.findByPk(userId);
      if (!existingProfile) {
        console.warn(`groups: auto-creating missing profile for ${userId}`);
        await Profile.create({
          id: userId,
          username: (req.user as any)?.username || `user_${String(userId).slice(0, 8)}`,
          full_name: (req.user as any)?.full_name || (req.user as any)?.username || 'User',
          email: (req.user as any)?.email || null,
        } as any);
      }
    } catch (profileErr: any) {
      console.error('groups: failed to ensure profile:', profileErr?.message);
      // continue — FK will surface if still missing
    }

    // Max 3 groups per user (as admin/creator or member)
    const ownedCount = await getUserGroupCount(userId);
    if (ownedCount >= 3) {
      return res.status(400).json({
        error: 'You can be in a maximum of 3 groups',
        code: 'GROUP_LIMIT',
      });
    }

    // Insert with retry on invite_code collision (UNIQUE)
    let group: any = null;
    let lastErr: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const inviteCode = Math.random().toString(36).substring(2, 10).toLowerCase();
      try {
        const insertRows = await sequelize.query(
          `INSERT INTO groups (name, description, is_private, created_by, credits, invite_code, created_at, updated_at)
           VALUES (:name, :description, :isPrivate, :createdBy, 0, :inviteCode, NOW(), NOW())
           RETURNING *`,
          {
            replacements: {
              name: name.trim(),
              description: description?.trim() || null,
              isPrivate: is_private || false,
              createdBy: userId,
              inviteCode,
            },
            type: QueryTypes.SELECT,
          }
        );
        group = (insertRows as any[])[0];
        if (group) break;
      } catch (insErr: any) {
        lastErr = insErr;
        const msg = String(insErr?.original?.message || insErr?.message || '');
        const isInviteCollision = msg.includes('invite_code') && (msg.includes('duplicate') || msg.includes('unique') || msg.includes('Unique'));
        const isFk = msg.includes('violates foreign key') || msg.includes('foreign key');
        console.error(`groups: insert attempt ${attempt + 1} failed:`, msg, insErr?.original?.detail || '');
        if (isFk) throw insErr; // profile FK — don't retry, surface
        if (!isInviteCollision) throw insErr;
        // else retry with new code
      }
    }

    if (!group) {
      console.error('[groups POST /] group is null after inserts, lastErr:', lastErr, 'userId:', userId);
      if (lastErr) throw lastErr;
      return res.status(500).json({ error: 'Failed to create group', details: `group is null after insert (userId=${userId}) lastErr=${String(lastErr)}` });
    }
    console.log('[groups POST /] created group', group.id, 'for user', userId);

    // Add creator as admin — must succeed or roll back
    let memberMade = false;
    try {
      await sequelize.query(
        `INSERT INTO group_members (group_id, user_id, role)
         VALUES (:groupId, :userId, 'admin')
         ON CONFLICT (group_id, user_id) DO NOTHING`,
        { replacements: { groupId: group.id, userId }, type: QueryTypes.INSERT }
      );
      memberMade = true;
    } catch (memberError: any) {
      console.error('Database error adding member:', memberError);
    }

    if (!memberMade) {
      await sequelize.query(
        `DELETE FROM groups WHERE id = :id`,
        { replacements: { id: group.id }, type: QueryTypes.DELETE }
      );
      return res.status(500).json({
        error: 'Failed to add you as group admin',
      });
    }

    res.status(201).json({
      ...group,
      is_member: true,
      user_role: 'admin',
      member_count: 1,
    });
  } catch (error: any) {
    console.error('Error creating group STACK:', error?.stack);
    console.error('Error creating group:', error?.original?.detail || error?.original?.message || error?.message, error);
    const detail = error?.stack || error?.original?.detail || error?.original?.message || error?.message || String(error);
    // Surface FK hint
    const isFk = String(detail).toLowerCase().includes('foreign key');
    res.status(500).json({
      error: 'Failed to create group',
      details: detail,
      hint: isFk ? 'Profile missing — please re-login or contact support' : undefined,
    });
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

    // Check if group exists
    const groupRows = await sequelize.query(
      `SELECT id, is_private FROM groups WHERE id = :id LIMIT 1`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    const group = (groupRows as any[])[0];

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is already a member
    const existingMember = await getMemberRow(id, userId);
    if (existingMember) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }

    // Max 3 members per group
    const memberCount = await getMemberCount(id);
    if (memberCount >= 3) {
      return res.status(400).json({
        error: 'This group is full (max 3 members)',
        code: 'GROUP_FULL',
      });
    }

    // Max 3 groups per user
    const userGroups = await getUserGroupCount(userId);
    if (userGroups >= 3) {
      return res.status(400).json({
        error: 'You can be in a maximum of 3 groups',
        code: 'GROUP_LIMIT',
      });
    }

    const memberRows = await sequelize.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES (:groupId, :userId, 'member')
       RETURNING id, group_id, user_id, role, joined_at`,
      { replacements: { groupId: id, userId }, type: QueryTypes.SELECT }
    );
    const membership = (memberRows as any[])[0];

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
    const groupRows = await sequelize.query(
      `SELECT id, name, is_private FROM groups WHERE invite_code = :inviteCode LIMIT 1`,
      { replacements: { inviteCode: String(invite_code).toLowerCase() }, type: QueryTypes.SELECT }
    );
    const group = (groupRows as any[])[0];

    if (!group) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Check if user is already a member
    const existingMember = await getMemberRow(group.id, userId);
    if (existingMember) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }

    const memberCount = await getMemberCount(group.id);
    if (memberCount >= 3) {
      return res.status(400).json({
        error: 'This group is full (max 3 members)',
        code: 'GROUP_FULL',
      });
    }

    const userGroups = await getUserGroupCount(userId);
    if (userGroups >= 3) {
      return res.status(400).json({
        error: 'You can be in a maximum of 3 groups',
        code: 'GROUP_LIMIT',
      });
    }

    const memberRows = await sequelize.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES (:groupId, :userId, 'member')
       RETURNING id, group_id, user_id, role, joined_at`,
      { replacements: { groupId: group.id, userId }, type: QueryTypes.SELECT }
    );
    const membership = (memberRows as any[])[0];

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
    const membership = await getMemberRow(id, userId);
    if (!membership) {
      return res.status(403).json({ error: 'Must be a member to get invite link' });
    }

    // Get group and generate invite code if not exists
    const groupRows = await sequelize.query(
      `SELECT id, name, invite_code FROM groups WHERE id = :id LIMIT 1`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    const group = (groupRows as any[])[0];

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    let inviteCode = group.invite_code;
    if (!inviteCode) {
      inviteCode = generateInviteCode();
      await sequelize.query(
        `UPDATE groups SET invite_code = :inviteCode, updated_at = NOW() WHERE id = :id`,
        { replacements: { inviteCode, id }, type: QueryTypes.UPDATE }
      );
    }

    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${inviteCode}`;

    res.json({
      invite_code: inviteCode,
      invite_link: inviteLink,
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
    const membership = await getMemberRow(id, userId);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can regenerate invite code' });
    }

    // Generate new invite code
    const inviteCode = generateInviteCode();

    const groupRows = await sequelize.query(
      `UPDATE groups SET invite_code = :inviteCode, updated_at = NOW()
       WHERE id = :id RETURNING id, name`,
      { replacements: { inviteCode, id }, type: QueryTypes.SELECT }
    );
    const group = (groupRows as any[])[0];

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${inviteCode}`;

    res.json({
      message: 'Invite code regenerated',
      invite_code: inviteCode,
      invite_link: inviteLink,
    });
  } catch (error) {
    console.error('Error regenerating invite code:', error);
    res.status(500).json({ error: 'Failed to regenerate invite code' });
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
    const membership = await getMemberRow(id, userId);
    if (!membership) {
      return res.status(400).json({ error: 'Not a member of this group' });
    }

    // Remove user from group
    await sequelize.query(
      `DELETE FROM group_members WHERE group_id = :groupId AND user_id = :userId`,
      { replacements: { groupId: id, userId }, type: QueryTypes.DELETE }
    );

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
    const membership = await getMemberRow(id, userId);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update group' });
    }

    const updateData: any = { updated_at: new Date() };
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (is_private !== undefined) updateData.is_private = is_private;

    const keys = Object.keys(updateData);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = keys.map((k) => `"${k}" = :${k}`).join(', ');
    const groupRows = await sequelize.query(
      `UPDATE groups SET ${setClause} WHERE id = :id RETURNING *`,
      {
        replacements: { ...updateData, id },
        type: QueryTypes.SELECT,
      }
    );
    const group = (groupRows as any[])[0];

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

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
    const membership = await getMemberRow(id, userId);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update images' });
    }

    const fileExt = path.extname(req.file.originalname) || '.jpg';
    const filename = `group-${id}-profile-${Date.now()}${fileExt}`;
    const publicUrl = saveLocalImage(filename, req.file.buffer);
    console.log('Group profile image uploaded locally:', publicUrl);

    const groupRows = await sequelize.query(
      `UPDATE groups SET profile_image_url = :publicUrl, updated_at = NOW()
       WHERE id = :id RETURNING *`,
      { replacements: { publicUrl, id }, type: QueryTypes.SELECT }
    );
    const group = (groupRows as any[])[0];

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

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
    const membership = await getMemberRow(id, userId);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update images' });
    }

    const fileExt = path.extname(req.file.originalname) || '.jpg';
    const filename = `group-${id}-cover-${Date.now()}${fileExt}`;
    const publicUrl = saveLocalImage(filename, req.file.buffer);
    console.log('Group cover image uploaded locally:', publicUrl);

    const groupRows = await sequelize.query(
      `UPDATE groups SET cover_image_url = :publicUrl, updated_at = NOW()
       WHERE id = :id RETURNING *`,
      { replacements: { publicUrl, id }, type: QueryTypes.SELECT }
    );
    const group = (groupRows as any[])[0];

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

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

    const membership = await getMemberRow(id, userId);
    if (!membership) {
      return res.status(403).json({ error: 'Must be a member to view messages' });
    }

    const messageRows = await sequelize.query(
      `SELECT * FROM group_messages
       WHERE group_id = :groupId
       ${before ? 'AND created_at < :before' : ''}
       ORDER BY created_at DESC
       LIMIT :limit`,
      {
        replacements: { groupId: id, before: before ? String(before) : undefined, limit: Number(limit) },
        type: QueryTypes.SELECT,
      }
    );

    const chronological = [...((messageRows as any[]) || [])].reverse();
    const messageIds = chronological.map((m: any) => m.id);

    // Reactions (group_message_reads table does not exist locally — read_count stays 0)
    const reactionsByMessage = new Map<string, Record<string, { count: number; reacted_by_me: boolean }>>();

    if (messageIds.length > 0) {
      const reactionRows = await sequelize.query(
        `SELECT message_id, user_id, emoji FROM group_message_reactions WHERE message_id IN (:messageIds)`,
        { replacements: { messageIds }, type: QueryTypes.SELECT }
      );

      ((reactionRows as any[]) || []).forEach((r: any) => {
        if (!reactionsByMessage.has(r.message_id)) reactionsByMessage.set(r.message_id, {});
        const bucket = reactionsByMessage.get(r.message_id)!;
        if (!bucket[r.emoji]) bucket[r.emoji] = { count: 0, reacted_by_me: false };
        bucket[r.emoji].count += 1;
        if (r.user_id === userId) bucket[r.emoji].reacted_by_me = true;
      });
    }

    // Bulk fetch sender profiles
    const senderIds = [...new Set(chronological.map((m: any) => m.sender_id).filter(Boolean))];
    const sendersMap = new Map<string, any>();
    if (senderIds.length > 0) {
      const senders = await Profile.findAll({
        where: { id: senderIds as any[] },
        attributes: ['id', 'username', 'full_name', 'avatar_url'],
      });
      (senders || []).forEach((s: any) => sendersMap.set((s as any).id, s));
    }

    const viewerLang = await (async () => {
      try {
        const { TranslationService } = await import('../services/translationService');
        return await TranslationService.getUserLanguage(userId);
      } catch {
        return 'en';
      }
    })();
    const autoTranslate = await (async () => {
      try {
        const { TranslationService } = await import('../services/translationService');
        return await TranslationService.userWantsAutoTranslate(userId);
      } catch {
        return false;
      }
    })();

    const messagesWithProfiles = await Promise.all(
      chronological.map(async (message: any) => {
        const sender = sendersMap.get(message.sender_id);
        const isDeleted = Boolean(message.is_deleted);
        const language = (() => {
          try {
            const { TranslationService } = require('../services/translationService');
            return TranslationService.normalizeLang(message.language);
          } catch {
            return message.language || 'en';
          }
        })();

        let translated_content: string | null = null;
        let translated_language: string | null = null;
        if (
          autoTranslate &&
          !isDeleted &&
          message.content &&
          String(message.content).trim() &&
          message.sender_id !== userId &&
          language !== viewerLang
        ) {
          try {
            const { TranslationService } = await import('../services/translationService');
            const t = await TranslationService.translateContent(
              'group_message',
              message.id,
              message.content,
              viewerLang,
              language
            );
            if (t && t !== message.content) {
              translated_content = t;
              translated_language = viewerLang;
            }
          } catch {
            /* keep original */
          }
        }

        return {
          ...message,
          content: isDeleted ? null : message.content,
          images: isDeleted ? [] : (message.images || message.media || []),
          media: isDeleted ? [] : (message.images || message.media || []),
          language,
          translated_content,
          translated_language,
          reactions: reactionsByMessage.get(message.id) || {},
          read_count: 0,
          sender: sender
            ? {
                ...sender.toJSON(),
                avatar_url: normalizeImageUrl((sender as any).avatar_url),
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

    const membership = await getMemberRow(id, userId);
    if (!membership) {
      return res.status(403).json({ error: 'Must be a member to send messages' });
    }
    if (membership.muted) {
      return res.status(403).json({ error: 'You are muted in this group' });
    }

    const messageRows = await sequelize.query(
      `INSERT INTO group_messages (group_id, sender_id, content, images, language, created_at)
       VALUES (:groupId, :senderId, :content, :images, :language, NOW())
       RETURNING *`,
      {
        replacements: {
          groupId: id,
          senderId: userId,
          content: hasContent ? content.trim() : '',
          images: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : JSON.stringify([]),
          language: sourceLanguage,
        },
        type: QueryTypes.SELECT,
      }
    );
    const message = (messageRows as any[])[0];

    if (!message) {
      return res.status(500).json({ error: 'Failed to send message' });
    }

    const sender = await Profile.findOne({ where: { id: userId }, attributes: ['id', 'username', 'full_name', 'avatar_url'] });

    const messageLanguage = TranslationService.normalizeLang(
      message.language || sourceLanguage
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
            ...sender.toJSON(),
            avatar_url: normalizeImageUrl((sender as any).avatar_url),
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
              claimedLanguage: messageLanguage,
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

    const membership = await getMemberRow(id, userId);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    const msgRows = await sequelize.query(
      `SELECT id, is_deleted FROM group_messages WHERE id = :messageId AND group_id = :groupId LIMIT 1`,
      { replacements: { messageId, groupId: id }, type: QueryTypes.SELECT }
    );
    const msg = (msgRows as any[])[0];
    if (!msg || msg.is_deleted) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const existingRows = await sequelize.query(
      `SELECT id FROM group_message_reactions
       WHERE message_id = :messageId AND user_id = :userId AND emoji = :emoji LIMIT 1`,
      { replacements: { messageId, userId, emoji }, type: QueryTypes.SELECT }
    );
    const existing = (existingRows as any[])[0];

    if (existing) {
      await sequelize.query(
        `DELETE FROM group_message_reactions WHERE id = :id`,
        { replacements: { id: existing.id }, type: QueryTypes.DELETE }
      );
    } else {
      // One reaction type per user per message: replace prior emoji if any
      await sequelize.query(
        `DELETE FROM group_message_reactions WHERE message_id = :messageId AND user_id = :userId`,
        { replacements: { messageId, userId }, type: QueryTypes.DELETE }
      );
      await sequelize.query(
        `INSERT INTO group_message_reactions (message_id, user_id, emoji)
         VALUES (:messageId, :userId, :emoji)
         ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
        { replacements: { messageId, userId, emoji }, type: QueryTypes.INSERT }
      );
    }

    const rowData = await sequelize.query(
      `SELECT emoji, user_id FROM group_message_reactions WHERE message_id = :messageId`,
      { replacements: { messageId }, type: QueryTypes.SELECT }
    );

    const reactions: Record<string, { count: number; reacted_by_me: boolean }> = {};
    ((rowData as any[]) || []).forEach((r: any) => {
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

    const membership = await getMemberRow(id, userId);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    // Note: the previous implementation wrote to group_message_reads, which does
    // not exist in the local Postgres schema. Kept as a no-op success so the
    // frontend contract is unchanged.
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
router.post('/:id/members/:memberId/mute', auth, async (req: AuthRequest, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user?.id;
    const { duration } = req.body; // duration in minutes, null for permanent

    // Check if user is admin or moderator
    const membership = await getMemberRow(id, userId);
    if (!membership || !['admin', 'moderator'].includes(membership.role)) {
      return res.status(403).json({ error: 'Only admins and moderators can mute members' });
    }

    // Update member with mute timestamp
    const muteUntil = duration ? new Date(Date.now() + duration * 60000) : null;

    await sequelize.query(
      `UPDATE group_members SET muted = true, muted_until = :muteUntil
       WHERE group_id = :groupId AND user_id = :memberId`,
      {
        replacements: { muteUntil, groupId: id, memberId },
        type: QueryTypes.UPDATE,
      }
    );

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
    const membership = await getMemberRow(id, userId);
    if (!membership || !['admin', 'moderator'].includes(membership.role)) {
      return res.status(403).json({ error: 'Only admins and moderators can unmute members' });
    }

    await sequelize.query(
      `UPDATE group_members SET muted = false, muted_until = null
       WHERE group_id = :groupId AND user_id = :memberId`,
      { replacements: { groupId: id, memberId }, type: QueryTypes.UPDATE }
    );

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
    const membership = await getMemberRow(id, userId);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }

    // Don't allow removing yourself
    if (memberId === userId) {
      return res.status(400).json({ error: 'Cannot remove yourself. Use leave endpoint instead.' });
    }

    await sequelize.query(
      `DELETE FROM group_members WHERE group_id = :groupId AND user_id = :memberId`,
      { replacements: { groupId: id, memberId }, type: QueryTypes.DELETE }
    );

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
    const membership = await getMemberRow(id, userId);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can change member roles' });
    }

    await sequelize.query(
      `UPDATE group_members SET role = :role
       WHERE group_id = :groupId AND user_id = :memberId`,
      { replacements: { role, groupId: id, memberId }, type: QueryTypes.UPDATE }
    );

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
    const membership = await getMemberRow(id, userId);
    if (!membership || !['admin', 'moderator'].includes(membership.role)) {
      return res.status(403).json({ error: 'Only admins and moderators can invite members' });
    }

    // Check if user is already a member
    const existingMember = await getMemberRow(id, invitedUserId);
    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // Add user to group
    const memberRows = await sequelize.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES (:groupId, :invitedUserId, 'member')
       RETURNING *`,
      { replacements: { groupId: id, invitedUserId }, type: QueryTypes.SELECT }
    );
    const newMember = (memberRows as any[])[0];

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
    const membership = await getMemberRow(id, userId);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete group' });
    }

    // Delete group (cascade will handle members and messages)
    await sequelize.query(
      `DELETE FROM groups WHERE id = :id`,
      { replacements: { id }, type: QueryTypes.DELETE }
    );

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

export default router;
