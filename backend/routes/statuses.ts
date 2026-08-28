import express from 'express';
import multer from 'multer';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { normalizeImageUrl } from '../utils/url';
import path from 'path';
import fs from 'fs';
import { getBidirectionalBlockedIds, getMutedIds } from '../utils/friendRelations';
import { getUploadPath } from '../config/storage';
import { Status, Profile, User, Friendship, sequelize, Op } from '../models';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
      return cb(new Error('Only image and video files are allowed!'));
    }
    cb(null, true);
  }
});

async function getFriendIds(userId: string): Promise<string[]> {
  const friendships = await Friendship.findAll({
    where: {
      [Op.or]: [
        { user_id: userId, status: 'accepted' },
        { friend_id: userId, status: 'accepted' }
      ]
    }
  });
  const friendIds = friendships.map((f: any) =>
    f.user_id === userId ? f.friend_id : f.user_id
  ).filter((id: string) => id !== userId);
  return [...new Set(friendIds)];
}

async function getCloseFriendIds(_userId: string): Promise<string[]> {
  return [];
}

function formatStoryResponse(data: any, userId: string) {
  const calculatedExpiresAt = new Date(data.created_at || data.expires_at);
  calculatedExpiresAt.setHours(calculatedExpiresAt.getHours() + 24);

  return {
    id: data.id,
    content: data.content || undefined,
    mediaUrl: data.media_url ? normalizeImageUrl(data.media_url) : undefined,
    type: data.media_url ? 'media' as const : 'text' as const,
    gradientIndex: data.gradient_index || 0,
    createdAt: data.created_at,
    expiresAt: data.expires_at || calculatedExpiresAt.toISOString(),
    viewCount: data.view_count || 0,
    User: {
      id: userId,
      name: '',
      username: '',
      avatar: ''
    }
  };
}

router.get('/debug', async (_req, res) => {
  try {
    const statuses = await Status.findAll({ limit: 1 });
    res.json({ data: statuses.map(s => s.toJSON()) });
  } catch (e: any) {
    res.json({ exception: e.message });
  }
});

// GET /api/statuses/feed
router.get('/feed', auth, async (req: AuthRequest, res) => {
  try {
    const { id: currentUserId } = req.user;
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const statuses = await Status.findAll({
      where: {
        created_at: { [Op.gte]: twentyFourHoursAgo },
        user_id: { [Op.ne]: currentUserId }
      },
      order: [['created_at', 'DESC']]
    });

    if (!statuses || statuses.length === 0) return res.json([]);

    const userIds = Array.from(new Set(statuses.map(s => s.user_id).filter(Boolean)));
    const friendIds = await getFriendIds(currentUserId);
    const closeFriendIds = await getCloseFriendIds(currentUserId);

    const [profiles, users] = await Promise.all([
      Profile.findAll({ where: { id: userIds }, attributes: ['id', 'full_name', 'username', 'avatar_url', 'story_privacy'] }),
      User.findAll({ where: { id: userIds }, attributes: ['id', 'avatar'] })
    ]);

    const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
    const usersMap = new Map(users.map((u: any) => [u.id, u]));

    const currentUserProfile = await Profile.findByPk(currentUserId);
    const currentUserPrivacy = (currentUserProfile as any)?.story_privacy || 'everyone';

    let filteredStatuses = statuses.filter(status => {
      const storyPrivacy = (profileMap.get(status.user_id) as any)?.story_privacy || 'everyone';
      if (storyPrivacy === 'everyone') return true;
      if (storyPrivacy === 'followers') return friendIds.includes(status.user_id);
      if (storyPrivacy === 'close_friends') return closeFriendIds.includes(status.user_id);
      return true;
    });

    const [blockedIds, mutedIds] = await Promise.all([
      getBidirectionalBlockedIds(currentUserId),
      getMutedIds(currentUserId),
    ]);
    const hidden = new Set([...blockedIds, ...mutedIds]);
    if (hidden.size > 0) {
      filteredStatuses = filteredStatuses.filter((s) => !hidden.has(s.user_id));
    }

    if (filteredStatuses.length === 0) return res.json([]);

    const mapped = filteredStatuses.map(s => {
      const prof = profileMap.get(s.user_id);
      const urow = usersMap.get(s.user_id);
      const rawAvatar = (prof as any)?.avatar_url ?? (urow as any)?.avatar ?? '';
      const avatar = normalizeImageUrl(rawAvatar);

      let expiresAt: string;
      if (s.expires_at) {
        expiresAt = s.expires_at.toISOString();
      } else {
        const expiry = new Date(s.created_at);
        expiry.setHours(expiry.getHours() + 24);
        expiresAt = expiry.toISOString();
      }

      return {
        id: s.id,
        content: s.content || undefined,
        mediaUrl: s.media_url ? normalizeImageUrl(s.media_url) : undefined,
        type: s.media_url ? 'media' as const : 'text' as const,
        gradientIndex: s.gradient_index || 0,
        createdAt: s.created_at,
        expiresAt,
        viewCount: s.view_count || 0,
        User: {
          id: s.user_id,
          name: (prof as any)?.full_name ?? '',
          username: (prof as any)?.username ?? '',
          avatar,
          isFriend: friendIds.includes(s.user_id)
        }
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching status feed:', error);
    const code = (error as any)?.code;
    if (code === '42P01' || code === '42703') {
      return res.status(200).json([]);
    }
    res.status(500).json({ error: 'Failed to fetch status feed' });
  }
});

// GET /api/statuses
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const { id: userId } = req.user;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const statuses = await Status.findAll({
      where: {
        created_at: { [Op.gte]: sevenDaysAgo }
      },
      order: [['created_at', 'DESC']],
      limit: 50
    });

    if (!statuses || statuses.length === 0) return res.json([]);

    const userIds = Array.from(new Set(statuses.map((s: any) => s.user_id).filter(Boolean)));
    const friendIds = await getFriendIds(userId);

    const [profiles, users] = await Promise.all([
      Profile.findAll({ where: { id: userIds }, attributes: ['id', 'full_name', 'username', 'avatar_url'] }),
      User.findAll({ where: { id: userIds }, attributes: ['id', 'avatar'] })
    ]);

    const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
    const usersMap = new Map(users.map((u: any) => [u.id, u]));

    const mapped = statuses.map((s: any) => {
      const prof = profileMap.get(s.user_id);
      const urow = usersMap.get(s.user_id);
      const rawAvatar = (prof as any)?.avatar_url ?? (urow as any)?.avatar ?? '';
      const avatar = normalizeImageUrl(rawAvatar);

      const isOwn = s.user_id === userId;
      const isFriend = friendIds.includes(s.user_id);

      let expiresAt: string;
      if (s.expires_at) {
        expiresAt = s.expires_at.toISOString();
      } else {
        const expiry = new Date(s.created_at);
        expiry.setHours(expiry.getHours() + 24);
        expiresAt = expiry.toISOString();
      }

      return {
        id: s.id,
        content: s.content || undefined,
        mediaUrl: s.media_url ? normalizeImageUrl(s.media_url) : undefined,
        type: s.media_url ? 'media' as const : 'text' as const,
        gradientIndex: s.gradient_index || 0,
        createdAt: s.created_at,
        expiresAt,
        viewCount: s.view_count || 0,
        isOwn,
        User: {
          id: s.user_id,
          name: (prof as any)?.full_name ?? '',
          username: (prof as any)?.username ?? '',
          avatar,
          isFriend: isOwn ? undefined : isFriend
        }
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching statuses:', error);
    const code = (error as any)?.code;
    if (code === '42P01' || code === '42703') {
      return res.status(200).json([]);
    }
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

// GET /api/statuses/user/:userId
router.get('/user/:userId', auth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { id: currentUserId } = req.user;
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const profile = await Profile.findByPk(userId);
    const storyPrivacy = (profile as any)?.story_privacy || 'everyone';

    if (storyPrivacy !== 'everyone') {
      const friendIds = await getFriendIds(userId);
      const closeFriendIds = await getCloseFriendIds(userId);
      if (storyPrivacy === 'followers' && !friendIds.includes(currentUserId)) {
        return res.json([]);
      }
      if (storyPrivacy === 'close_friends' && !closeFriendIds.includes(currentUserId)) {
        return res.json([]);
      }
    }

    const statuses = await Status.findAll({
      where: {
        user_id: userId,
        created_at: { [Op.gte]: twentyFourHoursAgo }
      },
      order: [['created_at', 'DESC']]
    });

    if (!statuses || statuses.length === 0) return res.json([]);

    const ownerProfile = await Profile.findByPk(userId);
    const ownerUser = await User.findByPk(userId);
    const avatar = normalizeImageUrl((ownerProfile as any)?.avatar_url ?? (ownerUser as any)?.avatar ?? '');

    const mapped = statuses.map(s => ({
      id: s.id,
      content: s.content || undefined,
      mediaUrl: s.media_url ? normalizeImageUrl(s.media_url) : undefined,
      type: s.media_url ? 'media' as const : 'text' as const,
      gradientIndex: s.gradient_index || 0,
      createdAt: s.created_at,
      expiresAt: s.expires_at?.toISOString(),
      viewCount: s.view_count || 0,
      User: {
        id: userId,
        name: (ownerProfile as any)?.full_name ?? '',
        username: (ownerProfile as any)?.username ?? '',
        avatar
      }
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching user statuses:', error);
    res.status(500).json({ error: 'Failed to fetch user statuses' });
  }
});

// GET /api/statuses/:id/viewers
router.get('/:id/viewers', auth, async (req: AuthRequest, res) => {
  try {
    const { id: storyId } = req.params;
    const { id: currentUserId } = req.user;

    const story = await Status.findByPk(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    if (story.user_id !== currentUserId) {
      return res.status(403).json({ error: 'Not authorized to view viewers' });
    }

    res.json([]);
  } catch (error) {
    console.error('Error fetching story viewers:', error);
    res.status(200).json([]);
  }
});

// POST /api/statuses/:id/view
router.post('/:id/view', auth, async (req: AuthRequest, res) => {
  try {
    const { id: storyId } = req.params;
    const { id: viewerId } = req.user;

    const story = await Status.findByPk(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (story.user_id === viewerId) {
      return res.json({ message: 'Own story' });
    }

    const newCount = (story.view_count || 0) + 1;
    await story.update({ view_count: newCount });

    res.json({ success: true, message: 'View recorded' });
  } catch (error) {
    console.error('Error recording story view:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

// POST /api/statuses - create a status
router.post('/', auth, upload.single('media'), async (req: AuthRequest, res) => {
  try {
    const { id: userId } = req.user;
    const content = req.body.content as string | undefined;
    const gradientIndex = req.body.gradientIndex !== undefined ? parseInt(String(req.body.gradientIndex), 10) : 0;

    if (!content && !req.file) {
      return res.status(400).json({ error: 'Status must have text content or an image' });
    }

    let mediaUrl: string | null = null;
    if (req.file) {
      const fileExt = path.extname(req.file.originalname) || '.jpg';
      const filename = `story-${userId}-${Date.now()}${fileExt}`;
      const uploadDir = getUploadPath();
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
      mediaUrl = filename;
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const statusData: any = {
      user_id: userId,
      media_url: mediaUrl,
      type: mediaUrl ? 'media' : 'text',
      gradient_index: !isNaN(gradientIndex) ? gradientIndex : 0,
      view_count: 0,
      expires_at: expiresAt,
    };
    if (content) {
      statusData.content = content;
    }

    const newStatus = await Status.create(statusData);
    const statusJson = (newStatus as any).toJSON();

    res.status(201).json(formatStoryResponse(statusJson, userId));
  } catch (error) {
    console.error('Error creating status:', error);
    const code = (error as any)?.code;
    if (code === '42P01') {
      return res.status(400).json({ error: 'Stories feature is not available (table missing)' });
    }
    res.status(500).json({ error: 'Failed to create status', details: (error as any)?.message });
  }
});

// DELETE /api/statuses/:id
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const { id: storyId } = req.params;
    const { id: userId } = req.user;

    const story = await Status.findByPk(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    if (story.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this story' });
    }

    await story.destroy();
    res.json({ success: true, message: 'Story deleted' });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

export default router;
