import express from 'express';
import { requireSupabase } from '../config/supabase';
import { wsManager } from '../websocketManager';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
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
import { User, Profile, Post, Like, Friendship, FriendRequest, Comment, sequelize, Op } from '../models';
import { QueryTypes } from 'sequelize';
import { getUploadPath } from '../config/storage';

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
  const supabase = requireSupabase();
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

    // Fetch profile from local database
    const profile = await Profile.findByPk(user.id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Calculate stats using local database
    const [followersCount, followingCount, posts] = await Promise.all([
      Friendship.count({ where: { friend_id: user.id, status: 'accepted' } }),
      Friendship.count({ where: { user_id: user.id, status: 'accepted' } }),
      Post.findAll({ 
        where: { user_id: user.id },
        attributes: ['id']
      })
    ]);

    let puurgas = 0;
    if (posts && posts.length > 0) {
      const postIds = posts.map((p: any) => p.id);
      try {
        puurgas = await Like.count({ 
          where: { post_id: postIds as any[] }
        });
      } catch {
        // likes table may not exist - fall back to reactions
        puurgas = await sequelize.query(
          `SELECT COUNT(*) as count FROM reactions WHERE post_id = ANY($1) AND type = 'like'`,
          {
            replacements: [postIds],
            type: QueryTypes.SELECT
          }
        ).then((result: any) => result[0]?.count || 0);
      }
    }

    // Get credits from profile (prefer purga_points, fallback to credits)
    const credits = Number(profile.purga_points ?? 0);

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
      account_status: 'active',
      inactivity_level: 0,
      last_active_at: profile.updated_at,
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

    // 1. Get profile picture from local database
    const profile = await Profile.findByPk(userId);

    if (profile) {
      if ((profile as any).avatar_url) {
        galleryImages.push({
          id: `profile-${userId}`,
          imageUrl: normalizeImageUrl((profile as any).avatar_url),
          category: 'profile',
          alt: 'Profile picture',
          createdAt: (profile as any).created_at
        });
      }

      if ((profile as any).cover_photo) {
        galleryImages.push({
          id: `cover-${userId}`,
          imageUrl: normalizeImageUrl((profile as any).cover_photo),
          category: 'cover',
          alt: 'Cover photo',
          createdAt: (profile as any).created_at
        });
      }
    }

    // 2. Get all post images from local database
    const posts = await Post.findAll({
      where: { 
        user_id: userId,
        media_url: { [Op.ne]: null as any }
      },
      attributes: ['id', 'media_url', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    if (posts) {
      posts.forEach((post: any) => {
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
  const supabase = requireSupabase();
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
  const supabase = requireSupabase();
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
    if (username && username.trim().toLowerCase() !== req.user.username?.trim().toLowerCase()) {
      const existingUsername = await Profile.findOne({
        where: {
          username: username.trim().toLowerCase(),
          id: { [require('sequelize').Op.ne]: id }
        }
      });

      if (existingUsername) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Update profile using Sequelize
    const profile = await Profile.findByPk(id);

    if (!profile) {
      // Create profile if it doesn't exist
      const newProfile = await Profile.create({
        id,
        full_name: name,
        username: username?.trim().toLowerCase(),
        email: email || req.user.email,
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
        created_at: new Date(),
        updated_at: new Date()
      } as any);

      const data = (newProfile as any).toJSON();
      return res.json({
        ...data,
        name: data.full_name,
        avatar: normalizeImageUrl(data.avatar_url),
        avatar_url: normalizeImageUrl(data.avatar_url),
        coverPhoto: normalizeImageUrl(data.cover_photo),
        cover_photo: normalizeImageUrl(data.cover_photo),
        email: email || req.user.email
      });
    }

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
      updated_at: new Date(),
    };

    if (username) {
      updateData.username = username.trim().toLowerCase();
    }

    await profile.update(updateData);

    // Also update users table
    try {
      const { User } = require('../models');
      const userUpdate: any = {};
      if (name) userUpdate.name = name;
      if (username) userUpdate.username = username.trim().toLowerCase();
      if (email) userUpdate.email = email;
      await User.update(userUpdate, { where: { id } });
    } catch {
      // non-fatal
    }

    const data = (profile as any).toJSON();
    const responseData = {
      ...data,
      name: data.full_name,
      avatar: normalizeImageUrl(data.avatar_url),
      avatar_url: normalizeImageUrl(data.avatar_url),
      coverPhoto: normalizeImageUrl(data.cover_photo),
      cover_photo: normalizeImageUrl(data.cover_photo),
      email: email || req.user.email
    };

    res.json(responseData);
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

    const fileExt = path.extname(req.file.originalname) || '.jpg';
    const filename = `avatar-${id}-${Date.now()}${fileExt}`;
    const uploadDir = getUploadPath();
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
    const publicUrl = `/uploads/${filename}`;
    console.log('Avatar uploaded locally:', publicUrl);

    // Update or create profile in local database
    const existingProfile = await Profile.findByPk(id);

    if (!existingProfile) {
      const newProfile = await Profile.create({
        id,
        avatar_url: publicUrl,
        created_at: new Date(),
        updated_at: new Date()
      } as any);
      return res.json({ avatar: (newProfile as any).avatar_url });
    }

    await existingProfile.update({ avatar_url: publicUrl, updated_at: new Date() });

    // Also try to update users table
    try {
      const { User } = require('../models');
      await User.update({ avatar_url: publicUrl }, { where: { id } });
    } catch {
      // non-fatal
    }

    res.json({ avatar: publicUrl });
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

    const fileExt = path.extname(req.file.originalname) || '.jpg';
    const filename = `cover-${id}-${Date.now()}${fileExt}`;
    const uploadDir = getUploadPath();
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
    const publicUrl = `/uploads/${filename}`;
    console.log('Cover photo uploaded locally:', publicUrl);

    const existingProfile = await Profile.findByPk(id);

    if (!existingProfile) {
      const newProfile = await Profile.create({
        id,
        cover_photo: publicUrl,
        created_at: new Date(),
        updated_at: new Date()
      } as any);
      return res.json({ coverPhoto: (newProfile as any).cover_photo });
    }

    await existingProfile.update({ cover_photo: publicUrl, updated_at: new Date() });
    res.json({ coverPhoto: publicUrl });
  } catch (error) {
    console.error('Error uploading cover photo:', error);
    res.status(500).json({ error: 'Failed to upload cover photo' });
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
    const { getUploadPath, getPublicUrl } = require('../config/storage');
    const fs = require('fs');
    const path = require('path');
    const uploadDir = getUploadPath();
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const urls = [];
    for (const file of req.files) {
      const ext = file.originalname.split('.').pop() || 'bin';
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, file.buffer);
      urls.push(getPublicUrl(filename));
    }
    res.json({ urls });
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ error: 'Failed to upload media' });
  }
});

// --- GET /api/proxy/image ---
router.get('/proxy/image', auth, async (req: AuthRequest, res) => {
  const supabase = requireSupabase();
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
  const supabase = requireSupabase();
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

    // Insert post into local database
    const createdPost = await Post.create({
      user_id,
      content: content || '',
      media_url: media_url || undefined,
    });

    if (!createdPost) {
      console.error('❌ Local database insert error');
      return res.status(500).json({ error: 'Failed to create post' });
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
      try {
        await Post.update(extraFields, { where: { id: createdPost.id } });
        // Merge extra fields into the response
        Object.assign(createdPost, extraFields);
      } catch (updateError: any) {
        // Non-fatal: columns may not exist yet, just log and continue
        console.warn('⚠️  Could not set extra post fields (columns may not exist):', updateError.message);
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
      ...createdPost.toJSON(),
      createdAt: createdPost.created_at,
      updatedAt: createdPost.updated_at,
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
  const supabase = requireSupabase();
  try {
    const currentUserId = req.user.id;

    // 1) Fetch posts from local database
    const posts = await Post.findAll({
      order: [['created_at', 'DESC']]
    });

    let safePosts = posts || [];
    if (safePosts.length === 0) {
      return res.json([]);
    }

    // 2) Get current user's friends for visibility filtering from local database
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [
          { user_id: currentUserId },
          { friend_id: currentUserId }
        ]
      }
    });

    const friendIds = new Set(
      (friendships || []).map((f: any) =>
        f.user_id === currentUserId ? f.friend_id : f.user_id
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

    // 5) Fetch profile data from local database
    const profiles = await Profile.findAll({
      where: { id: userIds as any[] },
      attributes: ['id', 'full_name', 'username', 'avatar_url']
    });

    const users = await User.findAll({
      where: { id: userIds as any[] },
      attributes: ['id', 'avatar']
    });

    const profileMap = new Map<string, { id: string; full_name?: string | null; username?: string | null; avatar_url?: string | null }>();
    for (const p of profiles) profileMap.set(p.id, p);
    const usersMap = new Map<string, { id: string; avatar_url?: string | null }>();
    for (const u of users) usersMap.set(u.id, { id: u.id, avatar_url: u.avatar });

    // Use the shared normalizeImageUrl function
    // Note: This function returns relative paths for local files and keeps Supabase URLs as absolute

    // 6) Map posts with images and merged user object
    const mapped = safePosts.map(post => {
      const prof = profileMap.get(post.user_id as string);
      const urow = usersMap.get(post.user_id as string);
      // Check profiles first since that's where new avatars are saved
      // Fallback to users table for backwards compatibility
      const rawAvatar = (prof?.avatar_url) ?? (urow as any)?.avatar ?? '';
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

      const postData = post.toJSON() as any;
      return {
        ...postData,
        createdAt: postData.created_at,
        updatedAt: postData.updated_at,
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
  const supabase = requireSupabase();
  try {
    const { id: userId } = req.params as { id: string };

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    // Posts by the user from local database
    const posts = await Post.findAll({
      where: { user_id: userId },
      attributes: ['id']
    });

    const postIds: string[] = (posts || []).map((p: any) => p.id);

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

    // Check if user already purged this person by checking notifications using Sequelize
    const Notification = (await import('../models')).Notification;
    const existingPurge = await Notification.findOne({
      where: {
        type: 'purge',
        sender_id: purgerId,
        receiver_id: targetUserId
      }
    });

    if (existingPurge) {
      return res.status(400).json({ error: 'Already purged this user' });
    }

    // Get current purge count of target user using Sequelize
    const profile = await Profile.findOne({
      where: { id: targetUserId },
      attributes: ['purge_count', 'is_ghost']
    });

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newPurgeCount = (profile.purge_count || 0) + 1;
    const becomesGhost = newPurgeCount >= PURGE_THRESHOLD && !profile.is_ghost;

    // Update profile
    const updatePayload: any = { purge_count: newPurgeCount };
    if (becomesGhost) {
      updatePayload.is_ghost = true;
      updatePayload.ghosted_at = new Date();
    }

    await profile.update(updatePayload);

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
        const friendships = await Friendship.findAll({
          where: {
            [Op.or]: [
              { user_id: targetUserId },
              { friend_id: targetUserId }
            ]
          },
          attributes: ['user_id', 'friend_id']
        });

        if (friendships && friendships.length > 0) {
          const friendIds = friendships.map(f =>
            f.user_id === targetUserId ? f.friend_id : f.user_id
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
  const supabase = requireSupabase();
  try {
    const { username_or_id } = req.params;
    const currentUserId = req.user?.id;

    if (!username_or_id) {
      return res.status(400).json({ error: 'Username or ID is required' });
    }

    // Find user from local database
    let profile;
    if (uuidValidate(username_or_id)) {
      profile = await Profile.findByPk(username_or_id);
    } else {
      profile = await Profile.findOne({
        where: { username: username_or_id.toLowerCase() }
      });
    }

    if (!profile) {
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

    // Get friends count from local database
    const friendsCount = await Friendship.count({
      where: {
        [Op.or]: [
          { user_id: profile.id },
          { friend_id: profile.id }
        ]
      }
    });

    // Get posts count from local database
    const postsCount = await Post.count({
      where: { user_id: profile.id }
    });

    // Check if current user is friends with this user
    let isFriend = false;
    let hasPendingRequest = false;

    if (currentUserId && currentUserId !== profile.id) {
      // Check friendship from local database
      const friendship = await Friendship.findOne({
        where: {
          [Op.or]: [
            { user_id: currentUserId, friend_id: profile.id },
            { user_id: profile.id, friend_id: currentUserId }
          ]
        }
      });

      isFriend = !!friendship;

      // Check pending friend request from local database
      if (!isFriend) {
        const pendingRequest = await FriendRequest.findOne({
          where: {
            sender_id: currentUserId,
            receiver_id: profile.id,
            status: 'pending'
          }
        });

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

    const profile = await Profile.findOne({
      where: { username: username.toLowerCase() },
      attributes: ['id', 'username', 'full_name', 'avatar_url']
    });

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's posts from local database
    const posts = await Post.findAll({
      where: { user_id: profile.id },
      order: [['created_at', 'DESC']]
    });

    // Get like counts and check if current user liked each post
    const currentUserId = req.user?.id;
    const postsWithData = await Promise.all(
      (posts || []).map(async (post: any) => {
        // Get like count from local database
        const likeCount = await Like.count({ where: { post_id: post.id } });

        // Get comment count from local database
        const commentCount = await Comment.count({ where: { post_id: post.id } });

        // Check if current user liked the post
        let liked = false;
        let purged = false;
        if (currentUserId) {
          const userLike = await Like.findOne({
            where: {
              post_id: post.id,
              user_id: currentUserId
            }
          });
          liked = !!userLike;

          const userPurge = await sequelize.query(
            `SELECT id FROM post_purges WHERE post_id = ? AND user_id = ? LIMIT 1`,
            {
              replacements: [post.id, currentUserId],
              type: QueryTypes.SELECT
            }
          );
          purged = !!userPurge[0];
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
  const supabase = requireSupabase();
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
  const supabase = requireSupabase();
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
  const supabase = requireSupabase();
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
  const supabase = requireSupabase();
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
  const supabase = requireSupabase();
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