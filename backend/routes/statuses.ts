import express from 'express';
import multer from 'multer';
import { auth, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { getUploadPath, generateUniqueFilename } from '../config/storage';

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
    const nowIso = new Date().toISOString();

    // Fetch active statuses
    const { data: statuses, error: statusError } = await supabase
      .from('statuses')
      .select('id, user_id, content, media_url, type, created_at, expires_at')
      .gt('expires_at', nowIso)
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

    const mapped = list.map(s => {
      const prof = profileMap.get(s.user_id as string);
      const urow = usersMap.get(s.user_id as string);
      const avatar = (urow?.avatar_url) ?? (prof?.avatar_url) ?? '';
      return {
        id: s.id,
        content: s.content ?? undefined,
        mediaUrl: s.media_url ?? undefined,
        type: (s.type as 'text' | 'media') ?? 'text',
        createdAt: s.created_at,
        expiresAt: s.expires_at,
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
    // Graceful empty response to avoid UI crash
    res.status(200).json([]);
  }
});

// POST /api/statuses - create a status (optional image)
router.post('/', auth, upload.single('media'), async (req: AuthRequest, res) => {
  try {
    const { id: userId } = req.user;
    const { content } = req.body as { content?: string };
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    let mediaUrl: string | null = null;
    if (req.file) {
      mediaUrl = `http://localhost:3005/uploads/${req.file.filename}`;
    }

    const type: 'text' | 'media' = mediaUrl ? 'media' : 'text';

    const { data, error } = await supabase
      .from('statuses')
      .insert([
        {
          user_id: userId,
          content: content || null,
          media_url: mediaUrl,
          type,
          expires_at: expiresAt.toISOString(),
        }
      ])
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.id,
      content: data.content ?? undefined,
      mediaUrl: data.media_url ?? undefined,
      type: data.type as 'text' | 'media',
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      User: { id: userId }
    });
  } catch (error) {
    console.error('Error creating status:', error);
    res.status(500).json({ error: 'Failed to create status' });
  }
});

export default router;
