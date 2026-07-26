import express from 'express';
import multer from 'multer';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { supabase } from '../config/supabase';
import { normalizeImageUrl } from '../utils/url';
import path from 'path';
import fs from 'fs';
import { getBidirectionalBlockedIds, getMutedIds } from '../utils/friendRelations';

const router = express.Router();

router.get('/debug', async (req, res) => {
  try {
    const { data, error } = await supabase.from('statuses').select('*').limit(1);
    res.json({ data, error });
  } catch (e: any) {
    res.json({ exception: e.message, stack: e.stack });
  }
});

// Configure multer for memory storage (direct to Supabase)
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

// Helper: Get friend IDs for a user (for privacy filtering)
async function getFriendIds(userId: string): Promise<string[]> {
  const { data: friendships } = await supabase
    .from('friendships')
    .select('friend_id, user_id')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (!friendships || friendships.length === 0) return [];

  const friendIds = friendships.map(f => 
    f.user_id === userId ? f.friend_id : f.user_id
  ).filter(id => id !== userId);

  return [...new Set(friendIds)];
}

// Helper: Get close friend IDs
async function getCloseFriendIds(userId: string): Promise<string[]> {
  const { data: closeFriends } = await supabase
    .from('close_friends')
    .select('friend_id')
    .eq('user_id', userId);

  return (closeFriends || []).map(f => f.friend_id);
}

// GET /api/statuses/feed - Get stories filtered by privacy
router.get('/feed', auth, async (req: AuthRequest, res) => {
  try {
    const { id: currentUserId } = req.user;
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Get current user's privacy and friend info
    const [profileRes, currentUserRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, username, avatar_url, story_privacy').eq('id', currentUserId).single(),
      supabase.from('users').select('id, avatar_url').eq('id', currentUserId).maybeSingle()
    ]);

    const currentUserPrivacy = (profileRes.data as any)?.story_privacy || 'everyone';
    const friendIds = await getFriendIds(currentUserId);
    const closeFriendIds = await getCloseFriendIds(currentUserId);

    // Fetch all active statuses from last 24 hours
    let statuses: any[] | null = null;
    let hasContentColumn = true;

    const { data: statusesWithContent, error: err1 } = await supabase
      .from('statuses')
      .select('id, user_id, content, media_url, type, gradient_index, created_at, expires_at, view_count')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .neq('user_id', currentUserId) // Exclude own stories (show separately)
      .order('created_at', { ascending: false });

    if (err1) {
      const msg = (err1 as any)?.message || '';
      if (msg.includes('content') || (err1 as any)?.code === '42703') {
        hasContentColumn = false;
        const { data: statusesBasic, error: err2 } = await supabase
          .from('statuses')
          .select('id, user_id, media_url, type, created_at, view_count')
          .gte('created_at', twentyFourHoursAgo.toISOString())
          .neq('user_id', currentUserId)
          .order('created_at', { ascending: false });

        if (err2) throw err2;
        statuses = statusesBasic;
      } else {
        throw err1;
      }
    } else {
      statuses = statusesWithContent;
    }

    // Fetch all user profiles for privacy filtering
    const userIds = Array.from(new Set((statuses || []).map(s => s.user_id).filter(Boolean)));
    const profilesRes = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, story_privacy')
      .in('id', userIds);

    const profilesMap = new Map<string, any>();
    for (const p of (profilesRes.data || [])) {
      profilesMap.set(p.id, p);
    }

    // Filter statuses by privacy settings
    let filteredStatuses = (statuses || []).filter(status => {
      if (!status.user_id) return false;
      
      const storyPrivacy = (profilesMap.get(status.user_id) as any)?.story_privacy || 'everyone';
      
      if (storyPrivacy === 'everyone') return true;
      if (storyPrivacy === 'followers') return friendIds.includes(status.user_id);
      if (storyPrivacy === 'close_friends') return closeFriendIds.includes(status.user_id);
      
      return true;
    });

    // Hide muted + blocked authors
    const [blockedIds, mutedIds] = await Promise.all([
      getBidirectionalBlockedIds(currentUserId),
      getMutedIds(currentUserId),
    ]);
    const hidden = new Set([...blockedIds, ...mutedIds]);
    if (hidden.size > 0) {
      filteredStatuses = filteredStatuses.filter((s) => !hidden.has(s.user_id));
    }

    if (filteredStatuses.length === 0) return res.json([]);

    // Collect filtered user ids
    const filteredUserIds = Array.from(new Set(filteredStatuses.map(s => s.user_id).filter(Boolean)));

    // Fetch profile and avatar for filtered users
    const [profilesData, usersData] = await Promise.all([
      supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', filteredUserIds),
      supabase.from('users').select('id, avatar_url').in('id', filteredUserIds)
    ]);

    const profileMap = new Map<string, { id: string; full_name?: string; username?: string; avatar_url?: string }>();
    for (const p of (profilesData.data || [])) profileMap.set(p.id, p);
    const usersMap = new Map<string, { id: string; avatar_url?: string }>();
    for (const u of (usersData.data || [])) usersMap.set(u.id, u);

    const mapped = filteredStatuses.map(s => {
      const prof = profileMap.get(s.user_id);
      const urow = usersMap.get(s.user_id);
      const rawAvatar = (prof?.avatar_url) ?? (urow?.avatar_url) ?? '';
      const avatar = normalizeImageUrl(rawAvatar);

      let expiresAt: string;
      if (s.expires_at) {
        expiresAt = s.expires_at;
      } else {
        const expiry = new Date(s.created_at);
        expiry.setHours(expiry.getHours() + 24);
        expiresAt = expiry.toISOString();
      }

      const isFriend = friendIds.includes(s.user_id);

      return {
        id: s.id,
        content: hasContentColumn ? (s.content || undefined) : undefined,
        mediaUrl: s.media_url ? normalizeImageUrl(s.media_url) : undefined,
        type: s.media_url ? 'media' as const : 'text' as const,
        gradientIndex: typeof s.gradient_index === 'number' ? s.gradient_index : 0,
        createdAt: s.created_at,
        expiresAt,
        viewCount: s.view_count || 0,
        User: {
          id: s.user_id,
          name: prof?.full_name ?? '',
          username: prof?.username ?? '',
          avatar,
          isFriend
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

// GET /api/statuses - list active statuses (legacy, returns all including own)
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const { id: userId } = req.user;
    
    // Use much longer time window to catch recent posts (7 days instead of 24 hours)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    console.log('[STATUSES] Fetching, userId:', userId, 'from:', sevenDaysAgo.toISOString());

    // Try with all fields first
    const { data: statusesWithContent, error: err1 } = await supabase
      .from('statuses')
      .select('id, user_id, content, media_url, type, gradient_index, created_at, expires_at, view_count')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (err1) {
      console.error('[STATUSES] Query error:', err1);
      // Return empty array instead of throwing
      return res.json([]);
    }

    const statuses = statusesWithContent || [];
    console.log('[STATUSES] Found:', statuses.length);
    if (statuses.length === 0) return res.json([]);

    const userIds = Array.from(new Set(statuses.map((s: any) => s.user_id).filter(Boolean)));

    const [profilesRes, usersRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', userIds),
      supabase.from('users').select('id, avatar_url').in('id', userIds)
    ]);

    const profileMap = new Map<string, any>();
    for (const p of (profilesRes.data || [])) profileMap.set(p.id, p);
    const usersMap = new Map<string, any>();
    for (const u of (usersRes.data || [])) usersMap.set(u.id, u);

    const friendIds = await getFriendIds(userId);

    const mapped = statuses.map((s: any) => {
      const prof = profileMap.get(s.user_id);
      const urow = usersMap.get(s.user_id);
      const rawAvatar = (prof?.avatar_url) ?? (urow?.avatar_url) ?? '';
      const avatar = normalizeImageUrl(rawAvatar);

      const isOwn = s.user_id === userId;
      const isFriend = friendIds.includes(s.user_id);

      let expiresAt: string;
      if (s.expires_at) {
        expiresAt = s.expires_at;
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
        gradientIndex: typeof s.gradient_index === 'number' ? s.gradient_index : 0,
        createdAt: s.created_at,
        expiresAt,
        viewCount: s.view_count || 0,
        isOwn,
        User: {
          id: s.user_id,
          name: prof?.full_name ?? '',
          username: prof?.username ?? '',
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

// GET /api/statuses/user/:userId - Get stories for a specific user
router.get('/user/:userId', auth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { id: currentUserId } = req.user;
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Get story owner's privacy setting
    const profileRes = await supabase
      .from('profiles')
      .select('id, story_privacy')
      .eq('id', userId)
      .single();

    const storyPrivacy = (profileRes.data as any)?.story_privacy || 'everyone';
    
    // Check if current user can view based on privacy
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

    const { data: statuses, error } = await supabase
      .from('statuses')
      .select('id, user_id, content, media_url, type, gradient_index, created_at, expires_at, view_count')
      .eq('user_id', userId)
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!statuses || statuses.length === 0) return res.json([]);

    // Get story owner info
    const [ownerProfileRes, ownerUserRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, username, avatar_url').eq('id', userId).single(),
      supabase.from('users').select('id, avatar_url').eq('id', userId).maybeSingle()
    ]);

    const ownerProfile = ownerProfileRes.data;
    const ownerUser = ownerUserRes.data;
    const avatar = normalizeImageUrl(ownerProfile?.avatar_url ?? ownerUser?.avatar_url ?? '');

    const mapped = statuses.map(s => ({
      id: s.id,
      content: s.content || undefined,
      mediaUrl: s.media_url ? normalizeImageUrl(s.media_url) : undefined,
      type: s.media_url ? 'media' as const : 'text' as const,
      gradientIndex: s.gradient_index || 0,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
      viewCount: s.view_count || 0,
      User: {
        id: userId,
        name: ownerProfile?.full_name ?? '',
        username: ownerProfile?.username ?? '',
        avatar
      }
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching user statuses:', error);
    res.status(500).json({ error: 'Failed to fetch user statuses' });
  }
});

// GET /api/statuses/:id/viewers - Get list of users who viewed a story
router.get('/:id/viewers', auth, async (req: AuthRequest, res) => {
  try {
    const { id: storyId } = req.params;
    const { id: currentUserId } = req.user;

    // First check if story exists and user owns it
    const { data: story, error: storyError } = await supabase
      .from('statuses')
      .select('id, user_id')
      .eq('id', storyId)
      .single();

    if (storyError || !story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Only story owner can see viewers list
    if (story.user_id !== currentUserId) {
      return res.status(403).json({ error: 'Not authorized to view viewers' });
    }

    // Get viewers with their info
    const { data: views, error: viewsError } = await supabase
      .from('story_views')
      .select('viewer_id, created_at')
      .eq('story_id', storyId)
      .order('created_at', { ascending: false });

    if (viewsError) throw viewsError;
    if (!views || views.length === 0) return res.json([]);

    const viewerIds = views.map(v => v.viewer_id);

    // Get viewer profiles
    const [profilesRes, usersRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', viewerIds),
      supabase.from('users').select('id, avatar_url').in('id', viewerIds)
    ]);

    const profileMap = new Map<string, any>();
    for (const p of (profilesRes.data || [])) profileMap.set(p.id, p);
    const usersMap = new Map<string, any>();
    for (const u of (usersRes.data || [])) usersMap.set(u.id, u);

    const viewers = views.map(view => {
      const prof = profileMap.get(view.viewer_id);
      const urow = usersMap.get(view.viewer_id);
      const avatar = normalizeImageUrl(prof?.avatar_url ?? urow?.avatar_url ?? '');

      return {
        id: view.viewer_id,
        name: prof?.full_name ?? '',
        username: prof?.username ?? '',
        avatar,
        viewedAt: view.created_at
      };
    });

    res.json(viewers);
  } catch (error) {
    console.error('Error fetching story viewers:', error);
    const code = (error as any)?.code;
    if (code === '42P01' || code === '42703') {
      return res.status(200).json([]); // story_views table doesn't exist yet
    }
    res.status(500).json({ error: 'Failed to fetch story viewers' });
  }
});

// POST /api/statuses/:id/view - Record a view + send notification
router.post('/:id/view', auth, async (req: AuthRequest, res) => {
  try {
    const { id: storyId } = req.params;
    const { id: viewerId } = req.user;

    // Get story info
    const { data: story, error: storyError } = await supabase
      .from('statuses')
      .select('id, user_id, view_count')
      .eq('id', storyId)
      .single();

    if (storyError || !story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Don't notify if viewing own story
    if (story.user_id === viewerId) {
      return res.json({ message: 'Own story' });
    }

    // Check if already viewed (prevent duplicate notifications)
    const { data: existingView } = await supabase
      .from('story_views')
      .select('id')
      .eq('story_id', storyId)
      .eq('viewer_id', viewerId)
      .maybeSingle();

    // Record view (upsert to handle duplicates)
    if (!existingView) {
      const { error: viewError } = await supabase.from('story_views').insert([{
        story_id: storyId,
        viewer_id: viewerId
      }]);
      
      // Only increment if story_views table exists (no error)
      if (!viewError) {
        const newCount = (story.view_count || 0) + 1;
        await supabase
          .from('statuses')
          .update({ view_count: newCount })
          .eq('id', storyId);
      }
    }

    // Get viewer info for notification
    const [viewerProfileRes, viewerUserRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', viewerId).single(),
      supabase.from('users').select('id').eq('id', viewerId).maybeSingle()
    ]);

    const viewerName = viewerProfileRes.data?.full_name || 'Someone';

    // Create notification for story owner
    await supabase.from('notifications').insert([{
      user_id: story.user_id,
      type: 'story_view',
      data: {
        storyId,
        viewerId,
        viewerName
      },
      from_user_id: viewerId
    }]);

    res.json({ success: true, message: 'View recorded' });
  } catch (error) {
    console.error('Error recording story view:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

// POST /api/statuses - create a status (optional image)
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
      const fileExt = path.extname(req.file.originalname);
      const filename = `story-${userId}-${Date.now()}${fileExt}`;

      // Try to use stories bucket, fallback gracefully if it doesn't exist
      try {
        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(filename, req.file.buffer, {
            contentType: req.file.mimetype,
            cacheControl: '31536000',
            upsert: false
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('stories')
            .getPublicUrl(filename);
          mediaUrl = publicUrlData.publicUrl;
        } else {
          console.log('Stories bucket not available, falling back to local disk:', uploadError.message);
          const uploadDir = path.join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
          mediaUrl = filename;
        }
      } catch (storageError) {
        console.log('Storage error (falling back to local disk):', storageError);
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
        mediaUrl = filename;
      }
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Build payload with only fields that match the table
    const fullPayload: any = {
      user_id: userId,
      media_url: mediaUrl,
      type: mediaUrl ? 'media' : 'text',
      gradient_index: !isNaN(gradientIndex) ? gradientIndex : 0,
      view_count: 0
    };

    // Only add content if provided (and if column exists)
    if (content) {
      fullPayload.content = content;
    }

    // Only add expires_at if column exists
    fullPayload.expires_at = expiresAt.toISOString();

    const { data, error } = await supabase
      .from('statuses')
      .insert([fullPayload])
      .select('*')
      .single();

    if (error) {
      const errMsg = (error as any)?.message || '';
      const errCode = (error as any)?.code;

      // Fallback without optional columns
      if (errMsg.includes('content') || errCode === '42703') {
        delete fullPayload.content;
        delete fullPayload.expires_at;
        const { data: data2, error: error2 } = await supabase
          .from('statuses')
          .insert([fullPayload])
          .select('*')
          .single();
        if (error2) throw error2;
        return res.status(201).json(formatStoryResponse(data2, userId));
      }
      if (errMsg.includes('expires_at') || errCode === '42703') {
        delete fullPayload.expires_at;
        const { data: data2, error: error2 } = await supabase
          .from('statuses')
          .insert([fullPayload])
          .select('*')
          .single();
        if (error2) throw error2;
        return res.status(201).json(formatStoryResponse(data2, userId));
      }
      throw error;
    }

    res.status(201).json(formatStoryResponse(data, userId));
  } catch (error) {
    console.error('Error creating status:', error);
    const code = (error as any)?.code;
    if (code === '42P01') {
      return res.status(400).json({ error: 'Stories feature is not available (table missing)' });
    }
    res.status(500).json({ error: 'Failed to create status', details: (error as any)?.message });
  }
});

// DELETE /api/statuses/:id - Delete own story
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const { id: storyId } = req.params;
    const { id: userId } = req.user;

    // Check ownership
    const { data: story, error: storyError } = await supabase
      .from('statuses')
      .select('id, user_id, media_url')
      .eq('id', storyId)
      .single();

    if (storyError || !story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (story.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this story' });
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('statuses')
      .delete()
      .eq('id', storyId);

    if (deleteError) throw deleteError;

    // Optionally delete media from storage
    if (story.media_url) {
      try {
        const urlParts = story.media_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        await supabase.storage.from('stories').remove([fileName]);
      } catch (e) {
        console.log('Could not delete story media:', e);
      }
    }

    res.json({ success: true, message: 'Story deleted' });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

// Helper function to format story response
function formatStoryResponse(data: any, userId: string) {
  const calculatedExpiresAt = new Date(data.created_at);
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

export default router;