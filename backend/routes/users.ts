import express from 'express';
import { supabase } from '../config/supabase';
import { wsManager } from '../websocketManager';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import multer from 'multer';
import { normalizeImageUrl } from '../utils/url';
import { isProfileVisible } from '../services/settingsService';
import { logSuperAdminAction } from '../utils/auditLogger';
import { CreditService, CREDIT_CONFIG } from '../services/creditService';
import { validate as uuidValidate } from 'uuid';
import { PURGE_THRESHOLD } from '../constants/purgeConstants';
import { createNotification } from './createNotification';
import { validateNotGhosted } from '../middleware/restrictGhosted';
import { NotificationService } from '../services/notificationService';
import { serializeMediaUrls, parseMediaUrls } from '../utils/mediaUrls';
import { DailyMissionService } from '../services/dailyMissionService';
import { progressionEngine } from '../services/progressionEngine';

const router = express.Router();

// Configure multer for file uploads - use memoryStorage so req.file.buffer is available
// for uploading to Supabase Storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit to match nginx
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed! Received mimetype: ' + file.mimetype));
    }
    cb(null, true);
  },
});


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
      return res.status(401).json({ error: 'Not authenticated' });
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

    // Calculate stats
    const [
      { count: followersCount },
      { count: followingCount },
      { data: posts }
    ] = await Promise.all([
      supabase.from('friends').select('*', { count: 'exact', head: true }).eq('user_id_2', user.id),
      supabase.from('friends').select('*', { count: 'exact', head: true }).eq('user_id_1', user.id),
      supabase.from('posts').select('id').eq('user_id', user.id)
    ]);

    let puurgas = 0;
    if (posts && posts.length > 0) {
      const postIds = posts.map(p => p.id);
      try {
        const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).in('post_id', postIds);
        puurgas = count || 0;
      } catch {
        // likes table may not exist - fall back to reactions
        const { count } = await supabase.from('reactions').select('*', { count: 'exact', head: true }).in('post_id', postIds).eq('type', 'like');
        puurgas = count || 0;
      }
    }

    // Get credits from profile (prefer purga_points, fallback to credits)
    const credits = Number(profile.purga_points ?? profile.credits ?? 0);

    // Return profile with both snake_case and camelCase for compatibility
    // Prefer auth-resolved name/username (middleware heals "New User" placeholders)
    const responseData = {
      ...profile,
      full_name: user.full_name || profile.full_name,
      username: user.username || profile.username,
      name: user.full_name || profile.full_name,
      avatar: normalizeImageUrl(profile.avatar_url),
      avatar_url: normalizeImageUrl(profile.avatar_url),
      coverPhoto: normalizeImageUrl(profile.cover_photo),
      cover_photo: normalizeImageUrl(profile.cover_photo),
      email: user.email,
      credits,
      purga_points: credits,
      certification_slug: profile.certification_slug || null,
      certificationSlug: profile.certification_slug || null,
      logo_certified: Boolean(profile.logo_certified),
      logoCertified: Boolean(profile.logo_certified),
      account_status: profile.account_status || (profile.is_restricted ? 'restricted' : 'active'),
      inactivity_level: profile.inactivity_level || 0,
      last_active_at: profile.last_active_at || profile.last_seen,
      stats: {
        followers: followersCount || 0,
        following: followingCount || 0,
        posts: (posts || []).length,
        puurgas,
        credits
      }
    };

    console.log('Profile fetched with stats:', responseData.stats);

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/users/gallery - Get all user images (profile, cover, and post images)
router.get('/gallery', auth, async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = user.id;
    const galleryImages: Array<{
      id: string;
      imageUrl: string;
      category: 'profile' | 'cover' | 'post';
      alt: string;
      createdAt?: string;
    }> = [];

    // 1. Get profile picture
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('avatar_url, cover_photo, created_at')
      .eq('id', userId)
      .single();

    if (!profileError && profile) {
      if (profile.avatar_url) {
        galleryImages.push({
          id: `profile-${userId}`,
          imageUrl: normalizeImageUrl(profile.avatar_url),
          category: 'profile',
          alt: 'Profile picture',
          createdAt: profile.created_at
        });
      }

      if (profile.cover_photo) {
        galleryImages.push({
          id: `cover-${userId}`,
          imageUrl: normalizeImageUrl(profile.cover_photo),
          category: 'cover',
          alt: 'Cover photo',
          createdAt: profile.created_at
        });
      }
    }

    // 2. Get all post images
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, media_url, created_at')
      .eq('user_id', userId)
      .not('media_url', 'is', null)
      .order('created_at', { ascending: false });

    if (!postsError && posts) {
      posts.forEach((post) => {
        if (post.media_url) {
          let images: string[] = [];
          try {
            // Try to parse as JSON array first
            const parsed = JSON.parse(post.media_url);
            if (Array.isArray(parsed)) {
              images = parsed.filter(Boolean);
            } else {
              // Fallback to comma-separated parsing
              images = post.media_url
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean);
            }
          } catch {
            // If JSON parsing fails, try comma-separated parsing
            images = post.media_url
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean);
          }

          // Add each image from the post
          images.forEach((imageUrl, index) => {
            if (imageUrl) {
              galleryImages.push({
                id: `post-${post.id}-${index}`,
                imageUrl: normalizeImageUrl(imageUrl),
                category: 'post',
                alt: `Post image ${index + 1}`,
                createdAt: post.created_at
              });
            }
          });
        }
      });
    }

    // Sort by creation date (newest first)
    galleryImages.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    res.json(galleryImages);
  } catch (error) {
    console.error('Error fetching gallery images:', error);
    res.status(500).json({ error: 'Failed to fetch gallery images' });
  }
});

router.get('/points', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.user;

    const { data, error } = await supabase
      .from('profiles')
      .select('purga_points')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      const msg = String((error as any).message || '').toLowerCase();
      const code = String((error as any).code || '');
      if (code === '42703' || msg.includes('purga_points')) {
        return res.json({ points: null, supported: false });
      }
      return res.status(500).json({ error: 'Failed to fetch points' });
    }

    const points = Number((data as any)?.purga_points ?? 0);
    res.json({ points: Number.isFinite(points) ? points : 0, supported: true });
  } catch (error) {
    console.error('Error fetching points:', error);
    res.status(500).json({ error: 'Failed to fetch points' });
  }
});

// DEPRECATED: PUT /api/users/points — Use CreditService.awardCredits/deductCredits instead.
// Kept as a read-only endpoint for backward compatibility. No longer writes credits.
router.put('/points', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.user;

    const { data, error } = await supabase
      .from('profiles')
      .select('purga_points')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      const msg = String((error as any).message || '').toLowerCase();
      const code = String((error as any).code || '');
      if (code === '42703' || msg.includes('purga_points')) {
        return res.json({ points: null, supported: false });
      }
      return res.status(500).json({ error: 'Failed to fetch points' });
    }

    const points = Number((data as any)?.purga_points ?? 0);
    res.json({ points: Number.isFinite(points) ? points : 0, supported: true });
  } catch (error) {
    console.error('Error fetching points:', error);
    res.status(500).json({ error: 'Failed to fetch points' });
  }
});

// Update user profile
router.put('/profile', auth, async (req: AuthRequest, res) => {
  try {
    const isSuperAdmin = req.user.role === 'super_admin' || req.user.role === 'superadmin';
    const { targetId } = req.body;
    const id = (isSuperAdmin && targetId) ? targetId : req.user.id;

    if (isSuperAdmin && targetId && targetId !== req.user.id) {
      await logSuperAdminAction({
        superadminId: req.user.id,
        action: 'UPDATE_PROFILE_BYPASS',
        targetId: targetId,
        targetType: 'user',
        details: { updated_fields: Object.keys(req.body).filter(k => k !== 'targetId') },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }
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

    if (typeof bio === 'string' && bio.length > 300) {
      return res.status(400).json({ error: 'Bio must be 300 characters or less' });
    }

    // Check if username is being changed and if it's already taken
    console.log('Update profile request:', {
      currentId: id,
      currentUsername: req.user.username,
      newUsername: username
    });

    if (username && username.trim().toLowerCase() !== req.user.username?.trim().toLowerCase()) {
      console.log('Username change detected, checking availability...');
      const { data: existingUsername, error: usernameCheckError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', username.trim().toLowerCase())
        .neq('id', id)
        .maybeSingle();

      if (usernameCheckError) {
        console.error('Error checking username:', usernameCheckError);
        return res.status(500).json({ error: 'Failed to validate username' });
      }

      if (existingUsername) {
        console.warn('Username taken by:', existingUsername);
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
      bio: typeof bio === 'string' ? bio.slice(0, 300) : bio,
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
      avatar: normalizeImageUrl(data.avatar_url),
      avatar_url: normalizeImageUrl(data.avatar_url),
      coverPhoto: normalizeImageUrl(data.cover_photo),
      cover_photo: normalizeImageUrl(data.cover_photo),
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

    // Upload to Supabase Storage (avatars bucket)
    const ext = req.file.originalname.split('.').pop();
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    console.log('🚀 UPLOADING TO SUPABASE STORAGE - AVATARS BUCKET:', filename);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '31536000',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ SUPABASE UPLOAD ERROR:', uploadError);
      return res.status(500).json({ error: 'Failed to upload avatar to storage' });
    }

    console.log('✅ SUPABASE UPLOAD SUCCESSFUL, getting public URL...');
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filename);

    const publicUrl = publicUrlData.publicUrl;
    console.log('🎯 FINAL SUPABASE URL:', publicUrl);

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

      // Also try to update users table if it exists (non-blocking)
      supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', id)
        .then(({ error }) => {
          if (error) {
            console.warn('Could not update users table avatar (this is OK if table/column doesn\'t exist):', error);
          } else {
            console.log('Avatar also set in users table');
          }
        });

      return res.json({ avatar: newProfile.avatar_url });
    }

    console.log('Updating existing profile with avatar URL...');

    // Update both profiles and users tables to keep them in sync
    // This ensures posts/statuses will get the correct avatar regardless of which table is checked first
    const [profileUpdate, usersUpdate] = await Promise.all([
      supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single(),
      supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', id)
        .select()
        .maybeSingle() // Use maybeSingle in case users table doesn't exist or row doesn't exist
    ]);

    if (profileUpdate.error) {
      console.error('Supabase error updating profile avatar:', profileUpdate.error);
      throw profileUpdate.error;
    }

    if (usersUpdate.error) {
      // Log but don't fail - users table might not exist or might not have avatar_url column
      console.warn('Could not update users table avatar (this is OK if table/column doesn\'t exist):', usersUpdate.error);
    }

    if (!profileUpdate.data) {
      console.error('No data returned from profile avatar update');
      throw new Error('No profile found to update');
    }

    console.log('Avatar updated successfully in profiles:', profileUpdate.data.avatar_url);
    if (usersUpdate.data) {
      console.log('Avatar also updated in users table:', usersUpdate.data.avatar_url);
    }

    res.json({ avatar: normalizeImageUrl(profileUpdate.data.avatar_url) });
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

    // Upload to Supabase Storage (covers bucket)
    const ext = req.file.originalname.split('.').pop();
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    console.log('Uploading to Supabase Storage covers bucket:', filename);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('covers')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '31536000',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload cover photo to storage' });
    }

    console.log('Upload successful, getting public URL...');
    const { data: publicUrlData } = supabase.storage
      .from('covers')
      .getPublicUrl(filename);

    const publicUrl = publicUrlData.publicUrl;
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
    res.json({ coverPhoto: normalizeImageUrl(data[0].cover_photo) });
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
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per file
});

router.post('/upload', auth, uploadHandler.array('media', 10), async (req: AuthRequest, res) => {
  try {
    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
      return res.status(400).json({ error: 'No media uploaded' });
    }
    const bucket = 'Media'; // Use Media bucket for both images and videos
    const urls = [];
    for (const file of req.files) {
      const ext = file.originalname.split('.').pop();
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const uploadResult = await supabase.storage.from(bucket).upload(filename, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '31536000',
        upsert: false,
      });
      if (uploadResult.error) {
        console.error('Supabase upload error:', uploadResult.error);
        return res.status(500).json({ error: 'Failed to upload media' });
      }
      // Get signed URL instead of public URL (more reliable for private buckets)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from(bucket).createSignedUrl(filename, 31536000); // 1 year expiry

      if (signedUrlError) {
        console.error('Error creating signed URL:', signedUrlError);
        return res.status(500).json({ error: 'Failed to create signed URL' });
      }
      urls.push(signedUrlData.signedUrl);
    }
    res.json({ urls });
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ error: 'Failed to upload media' });
  }
});

// --- GET /api/proxy/image ---
router.get('/proxy/image', auth, async (req: AuthRequest, res) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Only allow proxying Supabase storage URLs
    if (!url.includes('supabase.co/storage/v1/object/public/')) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    // Extract bucket and file path from URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/object/public/');
    if (pathParts.length !== 2) {
      return res.status(400).json({ error: 'Invalid Supabase URL format' });
    }

    const [bucket, ...filePathParts] = pathParts[1].split('/');
    const filePath = filePathParts.join('/');

    // Get signed URL for the file
    const { data: signedUrlData, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error || !signedUrlData) {
      console.error('Error creating signed URL for proxy:', error);
      return res.status(500).json({ error: 'Failed to create signed URL' });
    }

    // Redirect to signed URL
    res.redirect(302, signedUrlData.signedUrl);
  } catch (error) {
    console.error('Error in image proxy:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

// --- POST /api/posts ---
router.post('/posts', auth, validateNotGhosted, async (req: AuthRequest, res) => {
  try {
    const { content, images, media_layout, visibility, background_color, background_type, background_index } = req.body;
    const user_id = req.user.id;

    console.log('Post creation request:', { user_id, content: content?.substring(0, 50), imagesCount: images?.length, media_layout, visibility, background_color, background_type, background_index });

    const isRestricted = await CreditService.checkRestricted(user_id);
    if (isRestricted) {
      console.log('User is restricted:', user_id);
      return res.status(403).json({ error: 'Account restricted. Cannot create posts.' });
    }

    const hasContent = content && content.trim().length > 0;
    const hasMedia = Array.isArray(images) && images.length > 0;
    if (!hasContent && !hasMedia) {
      return res.status(400).json({ error: 'Post must have text or media' });
    }

    const mediaList = Array.isArray(images)
      ? images.filter((u: unknown) => typeof u === 'string' && u.trim())
      : typeof images === 'string' && images.trim()
        ? [images.trim()]
        : [];
    const media_url = serializeMediaUrls(mediaList);
    
    // SAFE INSERT: Only use columns guaranteed to exist in the posts table
    const safePostData: any = {
      user_id,
      content: content || '',
      media_url,
    };

    console.log('Inserting post (safe):', { user_id, media_url: media_url?.substring(0, 100) });

    let { data, error } = await supabase
      .from('posts')
      .insert([safePostData])
      .select();

    if (error) {
      console.error('❌ Supabase insert error (safe insert):', error);
      return res.status(500).json({ 
        error: 'Failed to create post', 
        details: error.message,
        hint: error.hint,
        code: error.code
      });
    }

    const createdPost = data && data[0];
    if (!createdPost) {
      return res.status(500).json({ error: 'Post insert returned no data' });
    }

    console.log('Post inserted successfully:', createdPost.id);

    // OPTIONAL UPDATE: Try to set extra columns (visibility, background, media_layout)
    // These columns may not exist yet in the database — that's OK, we just skip them
    const validVisibility = ['public', 'friends', 'private'];
    const postVisibility = validVisibility.includes(visibility) ? visibility : 'public';
    const extraFields: any = {};
    if (media_layout) extraFields.media_layout = media_layout;
    if (postVisibility !== 'public') extraFields.visibility = postVisibility;
    if (background_color) extraFields.background_color = background_color;
    if (background_type && background_type !== 'none') extraFields.background_type = background_type;
    if (typeof background_index === 'number') extraFields.background_index = background_index;

    if (Object.keys(extraFields).length > 0) {
      const { error: updateError } = await supabase
        .from('posts')
        .update(extraFields)
        .eq('id', createdPost.id);

      if (updateError) {
        // Non-fatal: columns may not exist yet, just log and continue
        console.warn('⚠️  Could not set extra post fields (columns may not exist):', updateError.message);
      } else {
        // Merge extra fields into the response
        Object.assign(createdPost, extraFields);
      }
    }

    // Award credits (0.20 credits per post)
    await CreditService.awardCredits(user_id, CREDIT_CONFIG.AWARD_CREATE_POST, 'post', 'Create post');
    await CreditService.updateLastActiveAt(user_id);

    // Emit progression event (XP, future: achievements, missions)
    progressionEngine.safeEmit('PostCreated', { userId: user_id, postId: createdPost.id });

    // Track daily mission progress
    DailyMissionService.trackProgress(user_id, 'create_post').catch(() => {});

    console.log('Post created successfully:', createdPost.id);
    const responseImages = parseMediaUrls(createdPost.media_url || media_url)
      .map((url) => normalizeImageUrl(url))
      .filter(Boolean);

    res.json({
      ...createdPost,
      images: responseImages,
      comments: 0,
      user: {
        id: user_id,
        name: '',
        username: '',
        avatar: '',
      },
    });
  } catch (error) {
    console.error('Unexpected error creating post:', error);
    res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// --- GET /api/posts/feed ---
router.get('/posts/feed', auth, async (req: AuthRequest, res) => {
  try {
    const currentUserId = req.user.id;

    // 1) Fetch posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (postsError) throw postsError;

    let safePosts = posts || [];
    if (safePosts.length === 0) {
      return res.json([]);
    }

    // 2) Get current user's friends for visibility filtering
    const { data: friendships } = await supabase
      .from('friends')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`);

    const friendIds = new Set(
      (friendships || []).map(f =>
        f.user_id_1 === currentUserId ? f.user_id_2 : f.user_id_1
      )
    );

    // 3) Filter posts by visibility
    // Default visibility to 'public' for posts that don't have the column set (backward compatibility)
    safePosts = safePosts.filter(post => {
      const visibility = post.visibility || 'public';

      // Public posts are visible to everyone
      if (visibility === 'public') return true;

      // Private posts only visible to author
      if (visibility === 'private') {
        return post.user_id === currentUserId;
      }

      // Friends-only posts visible to author and their friends
      if (visibility === 'friends') {
        return post.user_id === currentUserId || friendIds.has(post.user_id);
      }

      return true; // Fallback: show if unknown visibility
    });

    if (safePosts.length === 0) {
      return res.json([]);
    }

    // 4) Collect unique user_ids
    const userIds = Array.from(new Set(safePosts.map(p => p.user_id).filter(Boolean)));

    // 5) Fetch profile data from profiles and avatar from users (if table exists)
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

    // Use the shared normalizeImageUrl function
    // Note: This function returns relative paths for local files and keeps Supabase URLs as absolute

    // 6) Map posts with images and merged user object
    const mapped = safePosts.map(post => {
      const prof = profileMap.get(post.user_id as string);
      const urow = usersMap.get(post.user_id as string);
      // Check profiles first since that's where new avatars are saved
      // Fallback to users table for backwards compatibility
      const rawAvatar = (prof?.avatar_url) ?? (urow?.avatar_url) ?? '';
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
      const code = (postsError as any).code;
      const msg = String((postsError as any).message || (postsError as any).details || '').toLowerCase();
      if (
        code === '42P01' ||
        code === '42703' ||
        msg.includes('fetch failed') ||
        msg.includes('timeout') ||
        msg.includes('network')
      ) {
        return res.json({ followers: 0, following: 0, posts: 0, puurgas: 0 });
      }
      throw postsError;
    }

    const postIds: string[] = (posts || []).map((p: { id: string }) => p.id);

    // Prefer followers table (mutual follows). Fallback to friends graph.
    let followersCount = 0;
    let followingCount = 0;

    const followersQ = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    if (!followersQ.error) {
      followersCount = followersQ.count || 0;
      const followingQ = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);
      followingCount = followingQ.error ? 0 : followingQ.count || 0;
    } else {
      // Fallback: friends graph (directional columns)
      const { count: fbFollowers } = await supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .eq('user_id_2', userId);
      const { count: fbFollowing } = await supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .eq('user_id_1', userId);
      followersCount = fbFollowers || 0;
      followingCount = fbFollowing || 0;

      // If directional counts look empty but friendships exist, use mutual friends count
      if (!followersCount && !followingCount) {
        const { getAcceptedFriendIds } = await import('../utils/friendRelations');
        const friendIds = await getAcceptedFriendIds(userId);
        followersCount = friendIds.length;
        followingCount = friendIds.length;
      }
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
      followers: followersCount || 0,
      following: followingCount || 0,
      posts: (posts || []).length,
      puurgas,
    });
  } catch (error: any) {
    console.error('Error fetching user stats:', error);
    // Soft-fail — sidebar stats must never break Home
    return res.json({ followers: 0, following: 0, posts: 0, puurgas: 0 });
  }
});

// --- POST /api/users/:id/purge ---
router.post('/:id/purge', auth, validateNotGhosted, async (req: AuthRequest, res) => {
  try {
    const targetUserId = req.params.id;
    const purgerId = req.user.id;

    if (String(targetUserId) === String(purgerId)) {
      return res.status(403).json({ error: 'Cannot purge yourself' });
    }

    // Check if user already purged this person by checking notifications
    const { data: existingPurge, error: checkError } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'purge')
      .eq('sender_id', purgerId)
      .eq('receiver_id', targetUserId)
      .maybeSingle();

    if (existingPurge) {
      return res.status(400).json({ error: 'Already purged this user' });
    }

    // Get current purge count of target user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('purge_count, is_ghost')
      .eq('id', targetUserId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newPurgeCount = (profile.purge_count || 0) + 1;
    const becomesGhost = newPurgeCount >= PURGE_THRESHOLD && !profile.is_ghost;

    // Update profile
    const updatePayload: any = { purge_count: newPurgeCount };
    if (becomesGhost) {
      updatePayload.is_ghost = true;
      updatePayload.ghosted_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', targetUserId);

    if (updateError) throw updateError;

    // Create a notification for the purge action (serves as ledger)
    await createNotification({
      type: 'purge',
      senderId: purgerId,
      receiverId: targetUserId
    });

    if (becomesGhost) {
      // Award 300 credits to purger for ghosting a user
      try {
        await CreditService.awardCredits(purgerId, 300, 'redeem_user', 'Ghosted a user');
      } catch (creditError) {
        console.error('Error awarding ghost credits:', creditError);
      }

      // Send WebSocket profile update and notify friends
      wsManager.sendToUser(targetUserId, {
        type: 'profile_update',
        payload: { userId: targetUserId, isGhost: true, purgeCount: newPurgeCount }
      });

      try {
        const { data: friendships } = await supabase
          .from('friends')
          .select('user_id_1, user_id_2')
          .or(`user_id_1.eq.${targetUserId},user_id_2.eq.${targetUserId}`);

        if (friendships && friendships.length > 0) {
          const friendIds = friendships.map(f =>
            f.user_id_1 === targetUserId ? f.user_id_2 : f.user_id_1
          );

          for (const friendId of friendIds) {
            await createNotification({
              type: 'friend_ghosted',
              senderId: targetUserId,
              receiverId: friendId
            });

            wsManager.sendToUser(friendId, {
              type: 'profile_update',
              payload: { userId: targetUserId, isGhost: true, purgeCount: newPurgeCount }
            });
          }
        }
      } catch (notifError) {
        console.error('Error sending friend ghosted notifications:', notifError);
      }
    }

    res.json({
      purged: true,
      purges: newPurgeCount,
      ghostModeTriggered: becomesGhost
    });

  } catch (error) {
    console.error('Error purging user:', error);
    res.status(500).json({ error: 'Failed to purge user' });
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

    // Check if profile is visible based on privacy settings
    const visibility = await isProfileVisible(profile.id, currentUserId);
    
    if (!visibility.visible && profile.id !== currentUserId) {
      // Return limited info for private profiles
      return res.json({
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        name: profile.full_name,
        avatar_url: normalizeImageUrl(profile.avatar_url),
        avatar: normalizeImageUrl(profile.avatar_url),
        is_private: true,
        isPrivate: true,
        is_friend: false,
        isFriend: false,
        has_pending_request: false,
        hasPendingRequest: false,
        message_requests: profile.message_requests,
        show_online_status: false,
      });
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

    // Notify profile owner of visit (fire-and-forget)
    if (currentUserId && currentUserId !== profile.id) {
      NotificationService.profileVisit(currentUserId, profile.id);
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
      is_private: profile.is_private,
      isPrivate: profile.is_private,
      certification_slug: profile.certification_slug || null,
      certificationSlug: profile.certification_slug || null,
      logo_certified: Boolean(profile.logo_certified),
      logoCertified: Boolean(profile.logo_certified),
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
        let purged = false;
        if (currentUserId) {
          const { data: userLike } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', currentUserId)
            .maybeSingle();
          liked = !!userLike;

          const { data: userPurge } = await supabase
            .from('post_purges')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', currentUserId)
            .maybeSingle();
          purged = !!userPurge;
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
          purges: post.purge_count || 0,
          purge_count: post.purge_count || 0,
          purged,
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
router.post('/groups/create', auth, validateNotGhosted, async (req: AuthRequest, res) => {
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
router.post('/groups/:id/join', auth, validateNotGhosted, async (req: AuthRequest, res) => {
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

    // Upload to Supabase Storage (avatars bucket)
    const ext = req.file.originalname.split('.').pop();
    const filename = `group-${id}-profile-${Date.now()}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '31536000',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload profile image to storage' });
    }

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

    // Upload to Supabase Storage (covers bucket)
    const ext = req.file.originalname.split('.').pop();
    const filename = `group-${id}-cover-${Date.now()}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('covers')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '31536000',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload cover image to storage' });
    }

    const { data: publicUrlData } = supabase.storage
      .from('covers')
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

    res.json({ coverImage: publicUrl, group });
  } catch (error) {
    console.error('Error uploading cover image:', error);
    res.status(500).json({ error: 'Failed to upload cover image' });
  }
});

export default router;