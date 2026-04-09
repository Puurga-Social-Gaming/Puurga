import express from 'express';
import multer from 'multer';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { supabase } from '../config/supabase';
import { normalizeImageUrl } from '../utils/url';
import path from 'path';

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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed!'));
    cb(null, true);
  }
});

// Ensure the content column exists (run once on first request)
let contentColumnChecked = false;
async function ensureContentColumn() {
  if (contentColumnChecked) return;
  try {
    // Try to add the content column if it doesn't exist
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE statuses ADD COLUMN IF NOT EXISTS content TEXT;`
    }).maybeSingle();
  } catch (e) {
    // rpc might not exist, try raw query approach or just skip
    // Column will be handled gracefully below
    console.log('Note: Could not auto-add content column to statuses (this is ok if it already exists)');
  }
  contentColumnChecked = true;
}

// GET /api/statuses - list active statuses for friends/self
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    // Calculate 24 hours ago for filtering active statuses
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Try fetching with content column first, fall back without it
    let statuses: any[] | null = null;
    let hasContentColumn = true;

    const { data: statusesWithContent, error: err1 } = await supabase
      .from('statuses')
      .select('id, user_id, content, media_url, type, gradient_index, created_at, expires_at')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (err1) {
      // If error is about missing column, retry without content
      const msg = (err1 as any)?.message || '';
      if (msg.includes('content') || (err1 as any)?.code === '42703') {
        hasContentColumn = false;
        const { data: statusesBasic, error: err2 } = await supabase
          .from('statuses')
          .select('id, user_id, media_url, type, created_at')
          .gte('created_at', twentyFourHoursAgo.toISOString())
          .order('created_at', { ascending: false });

        if (err2) throw err2;
        statuses = statusesBasic;
      } else {
        throw err1;
      }
    } else {
      statuses = statusesWithContent;
    }

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
      const rawAvatar = (prof?.avatar_url) ?? (urow?.avatar_url) ?? '';
      const avatar = normalizeImageUrl(rawAvatar);

      // Use expires_at if available, otherwise calculate from created_at
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
        content: hasContentColumn ? (s.content || undefined) : undefined,
        mediaUrl: s.media_url ? normalizeImageUrl(s.media_url) : undefined,
        type: s.media_url ? 'media' as const : 'text' as const,
        gradientIndex: typeof s.gradient_index === 'number' ? s.gradient_index : 0,
        createdAt: s.created_at,
        expiresAt,
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
    const { content, gradientIndex } = req.body as { content?: string; gradientIndex?: number };

    // Validate - need either content or media
    if (!content && !req.file) {
      return res.status(400).json({ error: 'Status must have text content or an image' });
    }

    let mediaUrl: string | null = null;
    if (req.file) {
      const fileExt = path.extname(req.file.originalname);
      const filename = `status-${userId}-${Date.now()}${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars') // Reusing avatars bucket or could use a 'statuses' bucket if it exists
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: '31536000',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ STATUS MEDIA UPLOAD ERROR:', uploadError);
        return res.status(500).json({ error: 'Failed to upload status image' });
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filename);

      mediaUrl = publicUrlData.publicUrl;
    }

    // Calculate expiry (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Try inserting with content column first
    let data: any = null;
    const insertError: any = null;

    // Attempt with content + expires_at
    const fullPayload: any = {
      user_id: userId,
      content: content || null,
      media_url: mediaUrl,
      type: mediaUrl ? 'media' : 'text',
      gradient_index: typeof gradientIndex === 'number' ? gradientIndex : 0,
      expires_at: expiresAt.toISOString(),
    };

    console.log('Creating status with payload:', fullPayload);

    const result1 = await supabase
      .from('statuses')
      .insert([fullPayload])
      .select('*')
      .single();

    if (result1.error) {
      const errMsg = (result1.error as any)?.message || '';
      const errCode = (result1.error as any)?.code;

      // If content column doesn't exist, retry without it
      if (errMsg.includes('content') || errCode === '42703') {
        console.log('Content column not found, retrying without content...');
        const minimalPayload: any = {
          user_id: userId,
          media_url: mediaUrl,
          type: mediaUrl ? 'media' : 'text',
          gradient_index: typeof gradientIndex === 'number' ? gradientIndex : 0,
          expires_at: expiresAt.toISOString(),
        };

        const result2 = await supabase
          .from('statuses')
          .insert([minimalPayload])
          .select('*')
          .single();

        if (result2.error) {
          // Maybe expires_at also doesn't exist, try without it too
          const errMsg2 = (result2.error as any)?.message || '';
          if (errMsg2.includes('expires_at') || (result2.error as any)?.code === '42703') {
            console.log('expires_at column not found, retrying without it...');
            const barePayload: any = {
              user_id: userId,
              media_url: mediaUrl,
              type: mediaUrl ? 'media' : 'text',
              gradient_index: typeof gradientIndex === 'number' ? gradientIndex : 0,
            };

            const result3 = await supabase
              .from('statuses')
              .insert([barePayload])
              .select('*')
              .single();

            if (result3.error) throw result3.error;
            data = result3.data;
          } else {
            throw result2.error;
          }
        } else {
          data = result2.data;
        }
      }
      // If expires_at column doesn't exist, retry without it
      else if (errMsg.includes('expires_at') || errCode === '42703') {
        console.log('expires_at column not found, retrying without it...');
        const noExpiryPayload: any = {
          user_id: userId,
          content: content || null,
          media_url: mediaUrl,
          type: mediaUrl ? 'media' : 'text',
        };

        const result2 = await supabase
          .from('statuses')
          .insert([noExpiryPayload])
          .select('*')
          .single();

        if (result2.error) {
          // Maybe content also doesn't exist
          const errMsg2 = (result2.error as any)?.message || '';
          if (errMsg2.includes('content') || (result2.error as any)?.code === '42703') {
            const barePayload: any = {
              user_id: userId,
              media_url: mediaUrl,
              type: mediaUrl ? 'media' : 'text',
            };

            const result3 = await supabase
              .from('statuses')
              .insert([barePayload])
              .select('*')
              .single();

            if (result3.error) throw result3.error;
            data = result3.data;
          } else {
            throw result2.error;
          }
        } else {
          data = result2.data;
        }
      } else {
        throw result1.error;
      }
    } else {
      data = result1.data;
    }

    if (!data) {
      throw new Error('Failed to create status - no data returned');
    }

    console.log('Status created successfully:', data);

    // Fetch user profile info to return complete user data
    const [profilesRes, usersRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, username, avatar_url').eq('id', userId).single(),
      supabase.from('users').select('id, avatar_url').eq('id', userId).maybeSingle()
    ]);

    const prof = profilesRes.data;
    const urow = usersRes.data;
    const rawAvatar = (urow?.avatar_url) ?? (prof?.avatar_url) ?? '';
    const avatar = normalizeImageUrl(rawAvatar);

    // Calculate expiry time
    const calculatedExpiresAt = new Date(data.created_at);
    calculatedExpiresAt.setHours(calculatedExpiresAt.getHours() + 24);

    res.status(201).json({
      id: data.id,
      content: data.content || undefined,
      mediaUrl: data.media_url ? normalizeImageUrl(data.media_url) : undefined,
      type: data.media_url ? 'media' as const : 'text' as const,
      gradientIndex: typeof data.gradient_index === 'number' ? data.gradient_index : 0,
      createdAt: data.created_at,
      expiresAt: data.expires_at || calculatedExpiresAt.toISOString(),
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
