import express from 'express';
import multer from 'multer';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { supabase } from '../config/supabase';
import { getUploadPath, generateUniqueFilename } from '../config/storage';
import { normalizeImageUrl } from '../utils/url';

const router = express.Router();

// Configure multer for file uploads (local disk, same as users avatar/cover)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, getUploadPath()),
  filename: (req, file, cb) => cb(null, generateUniqueFilename(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed!'));
    cb(null, true);
  }
});

// GET /api/statuses - list active statuses for friends/self
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    // Calculate 24 hours ago for filtering active statuses
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Fetch statuses from last 24 hours (since we don't have expires_at column)
    const { data: statuses, error: statusError } = await supabase
      .from('statuses')
      .select('id, user_id, media_url, created_at, updated_at')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (statusError) throw statusError;
    const list = statuses || [];
    if (list.length === 0) return res.json([]);

    // Collect user ids
    const userIds = Array.from(new Set(list.map(s => s.user_id).filter(Boolean)));

    // Fetch profile and avatar
    const [profilesRes, usersRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', userIds),
      supabase.from('users').select('id, avatar_url').in('id', userIds)
    ]);
    const profiles = (profilesRes.data || []) as Array<{ id: string; full_name?: string | null; username?: string | null; avatar_url?: string | null }>;
    const usersTbl = (usersRes.data || []) as Array<{ id: string; avatar_url?: string | null }>;

    const profileMap = new Map<string, { id: string; full_name?: string | null; username?: string | null; avatar_url?: string | null }>();
    for (const p of profiles) profileMap.set(p.id, p);
    const usersMap = new Map<string, { id: string; avatar_url?: string | null }>();
    for (const u of usersTbl) usersMap.set(u.id, u);

    // Use the same pattern as posts: check profiles table first (where new avatars are saved)
    // Fallback to users table for backwards compatibility
    const mapped = list.map(s => {
      const prof = profileMap.get(s.user_id as string);
      const urow = usersMap.get(s.user_id as string);
      const rawAvatar = (prof?.avatar_url) ?? (urow?.avatar_url) ?? '';
      const avatar = normalizeImageUrl(rawAvatar);

      // Calculate expiry time (24 hours from creation)
      const expiresAt = new Date(s.created_at);
      expiresAt.setHours(expiresAt.getHours() + 24);

      return {
        id: s.id,
        mediaUrl: s.media_url ? normalizeImageUrl(s.media_url) : undefined,
        type: s.media_url ? 'media' as const : 'text' as const,
        createdAt: s.created_at,
        expiresAt: expiresAt.toISOString(),
        User: {
          id: s.user_id,
          name: prof?.full_name ?? '',
          username: prof?.username ?? '',
          avatar,
          isFriend: undefined
        }
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching statuses:', error);
    // Graceful empty response for missing table/column
    const code = (error as any)?.code;
    if (code === '42P01' || code === '42703') {
      return res.status(200).json([]);
    }
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

// POST /api/statuses - create a status (optional image)
router.post('/', auth, upload.single('media'), async (req: AuthRequest, res) => {
  try {
    const { id: userId } = req.user;
    const { content } = req.body as { content?: string };

    let mediaUrl: string | null = null;
    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
    }

    // Insert only fields that exist in the current statuses table schema
    const insertPayload: any = {
      user_id: userId,
      media_url: mediaUrl,
    };

    console.log('Creating status with payload:', insertPayload);

    const { data, error } = await supabase
      .from('statuses')
      .insert([insertPayload])
      .select('*')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    console.log('Status created successfully:', data);

    // Fetch user profile info to return complete user data (same pattern as GET endpoint)
    const [profilesRes, usersRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, username, avatar_url').eq('id', userId).single(),
      supabase.from('users').select('id, avatar_url').eq('id', userId).maybeSingle()
    ]);

    const prof = profilesRes.data;
    const urow = usersRes.data;
    const rawAvatar = (urow?.avatar_url) ?? (prof?.avatar_url) ?? '';
    const avatar = normalizeImageUrl(rawAvatar);

    // Calculate expiry time (24 hours from creation)
    const expiresAt = new Date(data.created_at);
    expiresAt.setHours(expiresAt.getHours() + 24);

    res.status(201).json({
      id: data.id,
      mediaUrl: data.media_url ? normalizeImageUrl(data.media_url) : undefined,
      type: data.media_url ? 'media' as const : 'text' as const,
      createdAt: data.created_at,
      expiresAt: expiresAt.toISOString(),
      User: {
        id: userId,
        name: prof?.full_name ?? '',
        username: prof?.username ?? '',
        avatar,
        isFriend: undefined
      }
    });
  } catch (error) {
    console.error('Error creating status:', error);
    const code = (error as any)?.code;
    if (code === '42P01' || code === '42703') {
      return res.status(400).json({ error: 'Statuses feature is not available (missing table/column)' });
    }
    res.status(500).json({ error: 'Failed to create status', details: (error as any)?.message });
  }
});

export default router;
