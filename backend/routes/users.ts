import express from 'express';
import { supabase } from '../config/supabase';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import multer from 'multer';
import { getUploadPath, generateUniqueFilename } from '../config/storage';
import { validate as uuidValidate } from 'uuid';

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

// Helper function to normalize image URLs
const normalizeImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';

  // Convert localhost URLs to relative paths
  if (url.startsWith('http://localhost:3005/')) {
    return url.replace('http://localhost:3005', '');
  }

  // If it's a Supabase URL, keep it as is (external storage)
  if (url.includes('supabase.co/storage')) {
    return url;
  }

  // If it's already a relative URL, keep it
  if (url.startsWith('/uploads/')) {
    return url;
  }

  // If it's an external URL, keep it as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If it's just a filename, add the uploads prefix
  return `/uploads/${url}`;
};

// Update user language
router.patch('/me/language', auth, async (req: AuthRequest, res) => {
  try {
    const { language } = req.body;
    const { id } = req.user;

    if (!language) {
      return res.status(400).json({ error: 'Language is required' });
    }

    // Update profile language
    const { error } = await supabase
      .from('profiles')
      .update({
        language,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Language updated successfully', language });
  } catch (error) {
    console.error('Error updating language:', error);
    res.status(500).json({ error: 'Failed to update language' });
  }
});

// Get user profile
router.get('/profile', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Return profile with both snake_case and camelCase for compatibility
    const responseData = {
      ...profile,
      name: profile.full_name,
      avatar: normalizeImageUrl(profile.avatar_url),
      avatar_url: normalizeImageUrl(profile.avatar_url),
      coverPhoto: normalizeImageUrl(profile.cover_photo),
      cover_photo: normalizeImageUrl(profile.cover_photo),
      email: user.email
    };

    console.log('Profile fetched with images:', {
      avatar_url: profile.avatar_url,
      cover_photo: profile.cover_photo,
      avatar: responseData.avatar,
      coverPhoto: responseData.coverPhoto
    });

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.get('/points', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.user;

    const { data, error } = await supabase
      .from('users')
      .select('perga_points')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      const msg = String((error as any).message || '').toLowerCase();
      const code = String((error as any).code || '');
      if (code === '42703' || msg.includes('perga_points')) {
        return res.json({ points: null, supported: false });
      }
      return res.status(500).json({ error: 'Failed to fetch points' });
    }

    const points = Number((data as any)?.perga_points ?? 0);
    res.json({ points: Number.isFinite(points) ? points : 0, supported: true });
  } catch (error) {
    console.error('Error fetching points:', error);
    res.status(500).json({ error: 'Failed to fetch points' });
  }
});

router.put('/points', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.user;
    const rawPoints = (req.body as any)?.points;
    const rawDelta = (req.body as any)?.delta;

    const hasPoints = typeof rawPoints === 'number' && Number.isFinite(rawPoints);
    const hasDelta = typeof rawDelta === 'number' && Number.isFinite(rawDelta);
    if (!hasPoints && !hasDelta) {
      return res.status(400).json({ error: 'Provide either numeric points or delta' });
    }
    if (hasPoints && hasDelta) {
      return res.status(400).json({ error: 'Provide either points or delta, not both' });
    }

    let nextPoints = 0;

    if (hasDelta) {
      const { data: existing, error: existingErr } = await supabase
        .from('users')
        .select('perga_points')
        .eq('id', id)
        .maybeSingle();

      if (existingErr) {
        const msg = String((existingErr as any).message || '').toLowerCase();
        const code = String((existingErr as any).code || '');
        if (code === '42703' || msg.includes('perga_points')) {
          return res.json({ points: null, supported: false });
        }
        return res.status(500).json({ error: 'Failed to fetch points' });
      }

      const current = Number((existing as any)?.perga_points ?? 0);
      const safeCurrent = Number.isFinite(current) ? current : 0;
      nextPoints = Math.max(0, safeCurrent + Number(rawDelta));
    } else {
      nextPoints = Math.max(0, Number(rawPoints));
    }

    const { data: updated, error: updateErr } = await supabase
      .from('users')
      .update({ perga_points: nextPoints, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('perga_points')
      .maybeSingle();

    if (updateErr) {
      const msg = String((updateErr as any).message || '').toLowerCase();
      const code = String((updateErr as any).code || '');
      if (code === '42703' || msg.includes('perga_points')) {
        return res.json({ points: null, supported: false });
      }
      return res.status(500).json({ error: 'Failed to update points' });
    }

    const points = Number((updated as any)?.perga_points ?? nextPoints);
    res.json({ points: Number.isFinite(points) ? points : nextPoints, supported: true });
  } catch (error) {
    console.error('Error updating points:', error);
    res.status(500).json({ error: 'Failed to update points' });
  }
});

// Update user profile
router.put('/profile', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.user;
    const {
      name,
      username,
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

    // Check if username is being changed and if it's already taken
    if (username && username !== req.user.username) {
      const { data: existingUsername, error: usernameCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.trim().toLowerCase())
        .neq('id', id)
        .maybeSingle();

      if (usernameCheckError) {
        console.error('Error checking username:', usernameCheckError);
        return res.status(500).json({ error: 'Failed to validate username' });
      }

      if (existingUsername) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Update email in the auth.users table if it has changed
    if (email && email !== req.user.email) {
      const { error: userError } = await supabase.auth.admin.updateUserById(id, { email });
      if (userError) {
        console.error('Error updating user email:', userError);
        return res.status(500).json({ error: 'Failed to update email' });
      }
    }

    // Update the rest of the profile in the profiles table
    const updateData: any = {
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
    };

    // Only update username if provided
    if (username) {
      updateData.username = username.trim().toLowerCase();
    }

    const { data, error: profileError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (profileError) throw profileError;

    // Return complete profile with both snake_case and camelCase for compatibility
    const responseData = {
      ...data,
      name: data.full_name,
      avatar: data.avatar_url,
      coverPhoto: data.cover_photo,
      email: email || req.user.email
    };

    console.log('Profile updated successfully:', {
      username: data.username,
      full_name: data.full_name,
      email: responseData.email
    });

    res.json(responseData);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload profile avatar
router.put('/profile/avatar', auth, upload.single('avatar'), async (req: AuthRequest, res) => {
  try {
    console.log('Avatar upload request received');
    console.log('User ID:', req.user?.id);
    console.log('File info:', req.file ? {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    const { id } = req.user;
    if (!req.file) {
      console.log('No file uploaded in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const publicUrl = `/uploads/${req.file.filename}`;
    console.log('Generated public URL:', publicUrl);

    // First check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking profile existence:', checkError);
      throw checkError;
    }

    if (!existingProfile) {
      console.log('Profile does not exist, creating one...');
      // Create profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: id,
          avatar_url: publicUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        throw createError;
      }

      console.log('Profile created with avatar:', newProfile.avatar_url);
      return res.json({ avatar: newProfile.avatar_url });
    }

    console.log('Updating existing profile with avatar URL...');
    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase error updating avatar:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.error('No data returned from avatar update');
      throw new Error('No profile found to update');
    }

    console.log('Avatar updated successfully:', data[0].avatar_url);
    res.json({ avatar: data[0].avatar_url });
  } catch (error) {
    console.error('Error uploading avatar:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    res.status(500).json({ error: 'Failed to upload avatar', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Upload cover photo
router.put('/profile/cover-photo', auth, upload.single('coverPhoto'), async (req: AuthRequest, res) => {
  try {
    console.log('Cover photo upload request received');
    console.log('User ID:', req.user?.id);
    console.log('File info:', req.file ? {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    const { id } = req.user;
    if (!req.file) {
      console.log('No file uploaded in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const publicUrl = `/uploads/${req.file.filename}`;
    console.log('Generated public URL:', publicUrl);

    // First check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking profile existence:', checkError);
      throw checkError;
    }

    if (!existingProfile) {
      console.log('Profile does not exist, creating one...');
      // Create profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: id,
          cover_photo: publicUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        throw createError;
      }

      console.log('Profile created with cover photo:', newProfile.cover_photo);
      return res.json({ coverPhoto: newProfile.cover_photo });
    }

    console.log('Updating existing profile with cover photo URL...');
    const { data, error } = await supabase
      .from('profiles')
      .update({ cover_photo: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase error updating cover photo:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.error('No data returned from cover photo update');
      throw new Error('No profile found to update');
    }

    console.log('Cover photo updated successfully:', data[0].cover_photo);
    res.json({ coverPhoto: data[0].cover_photo });
  } catch (error) {
    console.error('Error uploading cover photo:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    res.status(500).json({ error: 'Failed to upload cover photo', details: error instanceof Error ? error.message : 'Unknown error' });
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

    // Helper function to normalize image URLs
    const normalizeImageUrl = (url: string): string => {
      if (!url) return '';
      
      // If it's already a localhost URL, keep it
      if (url.startsWith('http://localhost:3005/')) return url;
      
      // If it's a Supabase URL, extract filename and use local server
      if (url.includes('supabase.co/storage')) {
        const filename = url.split('/').pop();
        return filename ? `http://localhost:3005/uploads/${filename}` : '';
      }
      
      // If it's an external URL, try to extract filename and use local server
      if (url.includes('http')) {
        const filename = url.split('/').pop();
        return filename ? `http://localhost:3005/uploads/${filename}` : '';
      }

      // If it's just a filename, add the uploads prefix
      return `/uploads/${url}`;
    };

    // 4) Map posts with images and merged user object
    const mapped = safePosts.map(post => {
      const prof = profileMap.get(post.user_id as string);
      const urow = usersMap.get(post.user_id as string);
      const rawAvatar = (urow?.avatar_url) ?? (prof?.avatar_url) ?? '';
      const avatar = normalizeImageUrl(rawAvatar);

      const name = prof?.full_name ?? '';
      const username = prof?.username ?? '';

      // Process images with URL normalization
      let images: string[] = [];
      if (typeof post.media_url === 'string' && post.media_url.length > 0) {
        try {
          // Try to parse as JSON array first
          const parsed = JSON.parse(post.media_url);
          if (Array.isArray(parsed)) {
            images = parsed
              .map((url: string) => normalizeImageUrl(url))
              .filter(Boolean);
          } else {
            // Fallback to comma-separated parsing
            images = post.media_url
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
              .map(normalizeImageUrl)
              .filter(Boolean);
          }
        } catch {
          // If JSON parsing fails, try comma-separated parsing
          images = post.media_url
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
            .map(normalizeImageUrl)
            .filter(Boolean);
        }
      }

      return {
        ...post,
        images,
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

// GET /api/users/profile/:username - Get public profile by username or ID
router.get('/profile/:username_or_id', auth, async (req: AuthRequest, res) => {
  try {
    const { username_or_id } = req.params;
    const currentUserId = req.user?.id;

    if (!username_or_id) {
      return res.status(400).json({ error: 'Username or ID is required' });
    }

    let query = supabase.from('profiles').select('*');

    if (uuidValidate(username_or_id)) {
      query = query.eq('id', username_or_id);
    } else {
      query = query.eq('username', username_or_id.toLowerCase());
    }

    // Find user
    const { data: profile, error: profileError } = await query.single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get friends count
    const { count: friendsCount } = await supabase
      .from('friends')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`);

    // Get posts count
    const { count: postsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id);

    // Check if current user is friends with this user
    let isFriend = false;
    let hasPendingRequest = false;

    if (currentUserId && currentUserId !== profile.id) {
      // Check friendship
      const { data: friendship } = await supabase
        .from('friends')
        .select('id')
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_id.eq.${currentUserId})`)
        .maybeSingle();

      isFriend = !!friendship;

      // Check pending friend request
      if (!isFriend) {
        const { data: pendingRequest } = await supabase
          .from('friend_requests')
          .select('id')
          .eq('from_user_id', currentUserId)
          .eq('to_user_id', profile.id)
          .eq('status', 'pending')
          .maybeSingle();

        hasPendingRequest = !!pendingRequest;
      }
    }

    // Return public profile data
    res.json({
      id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      name: profile.full_name,
      avatar_url: normalizeImageUrl(profile.avatar_url),
      avatar: normalizeImageUrl(profile.avatar_url),
      cover_photo: normalizeImageUrl(profile.cover_photo),
      coverPhoto: normalizeImageUrl(profile.cover_photo),
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
      created_at: profile.created_at,
      createdAt: profile.created_at,
      friends_count: friendsCount || 0,
      friendsCount: friendsCount || 0,
      posts_count: postsCount || 0,
      postsCount: postsCount || 0,
      is_friend: isFriend,
      isFriend: isFriend,
      has_pending_request: hasPendingRequest,
      hasPendingRequest: hasPendingRequest,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// GET /api/users/:username/posts - Get user's posts by username
router.get('/:username/posts', auth, async (req: AuthRequest, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Find user by username
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('username', username.toLowerCase())
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (postsError) {
      throw postsError;
    }

    // Get like counts and check if current user liked each post
    const currentUserId = req.user?.id;
    const postsWithData = await Promise.all(
      (posts || []).map(async (post) => {
        // Get like count
        const { count: likeCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        // Get comment count
        const { count: commentCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        // Check if current user liked the post
        let liked = false;
        if (currentUserId) {
          const { data: userLike } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', currentUserId)
            .maybeSingle();
          liked = !!userLike;
        }

        // Process media URL
        let mediaUrl = null;
        if (post.media_url) {
          mediaUrl = normalizeImageUrl(post.media_url);
        }

        return {
          id: post.id,
          content: post.content,
          media_url: mediaUrl,
          mediaUrl: mediaUrl,
          created_at: post.created_at,
          createdAt: post.created_at,
          likes: likeCount || 0,
          like_count: likeCount || 0,
          comments: commentCount || 0,
          comment_count: commentCount || 0,
          liked: liked,
        };
      })
    );

    res.json(postsWithData);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
});

// GET /api/users/groups - Get all groups (temporary endpoint)
router.get('/groups', auth, async (req: AuthRequest, res) => {
  try {
    const { data: groups, error } = await supabase
      .from('groups')
      .select(`
        *,
        profiles!groups_created_by_fkey(username, full_name, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get member counts for each group
    const groupsWithCounts = await Promise.all(
      (groups || []).map(async (group) => {
        const { count } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id);

        const creator = group.profiles || {};
        const creatorWithNormalizedAvatar = {
          ...creator,
          avatar_url: normalizeImageUrl(creator.avatar_url)
        };

        return {
          ...group,
          profile_image_url: normalizeImageUrl(group.profile_image_url),
          cover_image_url: normalizeImageUrl(group.cover_image_url),
          member_count: count || 0,
          creator: creatorWithNormalizedAvatar
        };
      })
    );

    res.json(groupsWithCounts);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// POST /api/users/groups/create - Create new group (temporary endpoint)
router.post('/groups/create', auth, async (req: AuthRequest, res) => {
  try {
    console.log('Creating group with body:', req.body);
    console.log('User ID:', req.user?.id);

    const { name, description, is_private = false } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      console.error('No user ID found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    console.log('Inserting group into database...');
    const insertData: any = {
      name: name.trim(),
      description: description?.trim() || null,
      is_private: is_private || false,
      created_by: userId
    };
    console.log('Insert data:', insertData);

    const { data: group, error } = await supabase
      .from('groups')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating group:', error);
      throw error;
    }

    console.log('Group created:', group);

    // Add creator as admin member
    console.log('Adding creator as admin member...');
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: userId,
        role: 'admin'
      });

    if (memberError) {
      console.error('Supabase error adding member:', memberError);
      throw memberError;
    }

    console.log('Group creation complete');
    res.status(201).json(group);
  } catch (error: any) {
    console.error('Error creating group:', error);
    console.error('Error details:', error?.message, error?.code, error?.details);
    res.status(500).json({ error: 'Failed to create group', details: error?.message });
  }
});

// POST /api/users/groups/:id/join - Join group (temporary endpoint)
router.post('/groups/:id/join', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    console.log('Join group request - Group ID:', id, 'User ID:', userId);

    if (!userId) {
      console.error('No user ID found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, is_private')
      .eq('id', id)
      .single();

    console.log('Group lookup result:', group, 'Error:', groupError);

    if (groupError || !group) {
      console.error('Group not found:', id, groupError);
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

// PUT /api/users/groups/:id/profile-image - Upload group profile image (temporary endpoint)
router.put('/groups/:id/profile-image', auth, upload.single('profileImage'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if user is admin of the group
    const { data: membership, error: memberError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can update images' });
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

    res.json({ profileImage: publicUrl, group });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({ error: 'Failed to upload profile image' });
  }
});

// PUT /api/users/groups/:id/cover-image - Upload group cover image (temporary endpoint)
router.put('/groups/:id/cover-image', auth, upload.single('coverImage'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if user is admin of the group
    const { data: membership, error: memberError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can update images' });
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

    res.json({ coverImage: publicUrl, group });
  } catch (error) {
    console.error('Error uploading cover image:', error);
    res.status(500).json({ error: 'Failed to upload cover image' });
  }
});

export default router;