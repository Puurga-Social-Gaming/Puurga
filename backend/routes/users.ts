import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import multer from 'multer';
import { getUploadPath, generateUniqueFilename } from '../config/storage';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getUploadPath());
  },
  filename: (req, file, cb) => {
    const uniqueFilename = generateUniqueFilename(file.originalname);
    cb(null, uniqueFilename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed! Received mimetype: ' + file.mimetype));
    }
    cb(null, true);
  },
});

// Get user profile
router.get('/profile', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Fetch base profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Fetch avatar_url and cover_photo from users table for consistency (if available)
    let userRow: { avatar_url?: string | null; cover_photo?: string | null; email?: string | null } | null = null;
    const userTbl = await supabase
      .from('users')
      .select('avatar_url, cover_photo, email')
      .eq('id', user.id)
      .maybeSingle();
    if (userTbl.error) {
      // If table/column missing, proceed without users row
      if ((userTbl.error as any).code === '42P01' || (userTbl.error as any).code === '42703') {
        userRow = null;
      } else {
        console.warn('Warning: failed to fetch users row for profile merge', userTbl.error);
      }
    } else {
      userRow = userTbl.data as any;
    }

    const pRec = profile as unknown as Record<string, unknown>;
    const pCover = typeof pRec.cover_photo === 'string' ? pRec.cover_photo : null;
    const pEmail = typeof pRec.email === 'string' ? pRec.email : null;

    const merged = {
      ...profile,
      avatar_url: userRow?.avatar_url ?? (typeof pRec.avatar_url === 'string' ? pRec.avatar_url : null),
      cover_photo: userRow?.cover_photo ?? pCover,
      email: userRow?.email ?? pEmail,
    };

    res.json(merged);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.user;
    const {
      name,
      email,
      bio,
      location,
      website,
      occupation,
      education,
      relationship,
      isPrivate,
      hideFromSuggestions,
      messageRequests,
      showReadReceipts,
      showOnlineStatus,
      commentPrivacy,
      storyPrivacy
    } = req.body;

    // Update email in the auth.users table if it has changed
    if (email && email !== req.user.email) {
      const { error: userError } = await supabase.auth.admin.updateUserById(id, { email });
      if (userError) {
        console.error('Error updating user email:', userError);
        // Decide if this should be a critical error
        return res.status(500).json({ error: 'Failed to update email' });
      }
    }

    // Update the rest of the profile in the profiles table
    const { data, error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: name,
        bio,
        location,
        website,
        occupation,
        education,
        relationship,
        is_private: isPrivate,
        hide_from_suggestions: hideFromSuggestions,
        message_requests: messageRequests,
        show_read_receipts: showReadReceipts,
        show_online_status: showOnlineStatus,
        comment_privacy: commentPrivacy,
        story_privacy: storyPrivacy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (profileError) throw profileError;

    res.json(data);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload profile avatar
router.put('/profile/avatar', auth, upload.single('avatar'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.user;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const publicUrl = `http://localhost:3005/uploads/${req.file.filename}`;

    const { data, error } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json({ avatar: data[0].avatar_url });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Upload cover photo
router.put('/profile/cover-photo', auth, upload.single('coverPhoto'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.user;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const publicUrl = `http://localhost:3005/uploads/${req.file.filename}`;

    const { data, error } = await supabase
      .from('users')
      .update({ cover_photo: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json({ coverPhoto: data[0].cover_photo });
  } catch (error) {
    console.error('Error uploading cover photo:', error);
    res.status(500).json({ error: 'Failed to upload cover photo' });
  }
});

// --- POST /api/upload ---
const uploadHandler = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

router.post('/upload', uploadHandler.array('images', 4), async (req, res) => {
  try {
    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }
    const bucket = 'posts'; // Change to your actual bucket name if different
    const urls = [];
    for (const file of req.files) {
      const ext = file.originalname.split('.').pop();
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const uploadResult = await supabase.storage.from(bucket).upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });
      if (uploadResult.error) {
        console.error('Supabase upload error:', uploadResult.error);
        return res.status(500).json({ error: 'Failed to upload image(s)' });
      }
      // Get public URL
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filename);
      urls.push(publicUrlData.publicUrl);
    }
    res.json({ urls });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// --- POST /api/posts ---
router.post('/posts', async (req, res) => {
  try {
    const { user_id, content, images } = req.body;
    if (!user_id || !content) {
      return res.status(400).json({ error: 'user_id and content are required' });
    }
    // images is an array of URLs; store as comma-separated string
    const media_url = Array.isArray(images) ? images.join(',') : images || null;
    const { data, error } = await supabase
      .from('posts')
      .insert([{ user_id, content, media_url }])
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// --- GET /api/posts/feed ---
router.get('/posts/feed', async (req, res) => {
  try {
    // 1) Fetch posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (postsError) throw postsError;

    const safePosts = posts || [];
    if (safePosts.length === 0) {
      return res.json([]);
    }

    // 2) Collect unique user_ids
    const userIds = Array.from(new Set(safePosts.map(p => p.user_id).filter(Boolean)));

    // 3) Fetch profile data from profiles and avatar from users (if table exists)
    const [profilesRes, usersRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', userIds),
      supabase.from('users').select('id, avatar_url').in('id', userIds),
    ]);

    const profiles = (profilesRes.data || []) as Array<{ id: string; full_name?: string | null; username?: string | null; avatar_url?: string | null }>;
    const usersTbl = Array.isArray(usersRes.data) ? (usersRes.data as Array<{ id: string; avatar_url?: string | null }>) : [];

    const profileMap = new Map<string, { id: string; full_name?: string | null; username?: string | null; avatar_url?: string | null }>();
    for (const p of profiles) profileMap.set(p.id, p);
    const usersMap = new Map<string, { id: string; avatar_url?: string | null }>();
    for (const u of usersTbl) usersMap.set(u.id, u);

    // 4) Map posts with images and merged user object
    const mapped = safePosts.map(post => {
      const prof = profileMap.get(post.user_id as string);
      const urow = usersMap.get(post.user_id as string);
      const avatar = (urow?.avatar_url) ?? (prof?.avatar_url) ?? '';

      const name = prof?.full_name ?? '';
      const username = prof?.username ?? '';
      return {
        ...post,
        images: typeof post.media_url === 'string' && post.media_url.length > 0
          ? post.media_url.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
        user: {
          id: post.user_id,
          name,
          username,
          avatar,
        },
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// --- GET /api/users/:id/stats ---
router.get('/:id/stats', auth, async (req: AuthRequest, res) => {
  try {
    const { id: userId } = req.params as { id: string };

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    // Posts by the user
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', userId);
    if (postsError) {
      if ((postsError as any).code === '42P01' || (postsError as any).code === '42703') {
        return res.json({ followers: 0, following: 0, posts: 0, puurgas: 0 });
      }
      throw postsError;
    }

    const postIds: string[] = (posts || []).map((p: { id: string }) => p.id);

    // Followers: users who follow this user
    const { data: followersRows, error: followersError } = await supabase
      .from('followers')
      .select('id')
      .eq('following_id', userId);
    if (followersError) {
      if ((followersError as any).code === '42P01' || (followersError as any).code === '42703') {
        return res.json({ followers: 0, following: 0, posts: (posts || []).length, puurgas: 0 });
      }
      throw followersError;
    }

    // Following: users this user follows
    const { data: followingRows, error: followingError } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', userId);
    if (followingError) {
      if ((followingError as any).code === '42P01' || (followingError as any).code === '42703') {
        return res.json({ followers: (followersRows || []).length, following: 0, posts: (posts || []).length, puurgas: 0 });
      }
      throw followingError;
    }

    // Puurgas: total likes received on this user's posts
    let puurgas = 0;
    if (postIds.length > 0) {
      const { data: likesRows, error: likesError } = await supabase
        .from('likes')
        .select('id')
        .in('post_id', postIds);
      if (likesError) {
        if ((likesError as any).code === '42P01' || (likesError as any).code === '42703') {
          puurgas = 0;
        } else {
          throw likesError;
        }
      } else {
        puurgas = (likesRows || []).length;
      }
    }

    res.json({
      followers: (followersRows || []).length,
      following: (followingRows || []).length,
      posts: (posts || []).length,
      puurgas,
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

export default router;