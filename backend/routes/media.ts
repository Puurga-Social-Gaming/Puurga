import express from 'express';
import multer from 'multer';
import { supabaseAuth as auth, AuthRequest } from '../middleware/supabaseAuth';
import { requireSupabase, requireSupabaseAdmin } from '../config/supabase';
import { uploadMedia, deleteMedia } from '../services/mediaService';

const router = express.Router();

// Use memory storage for direct upload to supabaseClient
const uploadStorage = multer.memoryStorage();

// File filter for allowed media types
const fileFilter = (
  req: express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Videos
    'video/mp4',
    'video/webm',
    'video/ogg',
    // Audio
    'audio/mpeg',
    'audio/mp3',
    'audio/aac',
    'audio/wav',
    'audio/ogg',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Only images, videos, and audio files are supported.`));
  }
};

const upload = multer({
  storage: uploadStorage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
    files: 10, // Max 10 files at once
  },
});

/**
 * POST /api/media/upload
 * Upload media files to supabaseClient Storage
 * Returns array of media objects with URLs
 */
router.post('/upload', auth, upload.array('media', 10), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadResults: any[] = [];

    for (const file of req.files as Express.Multer.File[]) {
      try {
        const result = await uploadMedia(
          file.buffer,
          userId,
          file.originalname,
          file.mimetype
        );
        uploadResults.push(result);
      } catch (fileError: any) {
        console.error(`Error uploading file ${file.originalname}:`, fileError);
        // Continue with other files, but log the error
      }
    }

    if (uploadResults.length === 0) {
      return res.status(500).json({ error: 'Failed to upload any files' });
    }

    return res.json({
      success: true,
      media: uploadResults.map((result) => ({
        mediaId: result.mediaId,
        url: result.url,
        mimeType: result.mimeType,
        size: result.size,
      })),
    });
  } catch (error: any) {
    console.error('Media upload error:', error);
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 100MB.' });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files. Maximum is 10 files.' });
      }
    }
    
    return res.status(500).json({ error: error.message || 'Failed to upload media' });
  }
});

/**
 * DELETE /api/media/:mediaId
 * Delete media from supabaseClient Storage
 */
router.delete('/:mediaId', auth, async (req: AuthRequest, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const userId = req.user?.id;
    const { mediaId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await deleteMedia(userId, mediaId);

    return res.json({ success: true, message: 'Media deleted successfully' });
  } catch (error: any) {
    console.error('Media delete error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete media' });
  }
});

/**
 * GET /api/media/bucket-exists
 * Check if 'media' bucket exists
 */
router.get('/bucket-exists', auth, async (req: AuthRequest, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const { data: buckets, error } = await supabaseClient.storage.listBuckets();

    if (error) throw error;

    const mediaBucket = buckets?.find((b) => b.name === 'media');

    if (!mediaBucket) {
      return res.json({ exists: false, message: 'Media bucket does not exist' });
    }

    return res.json({ exists: true, bucket: mediaBucket });
  } catch (error: any) {
    console.error('Bucket check error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/media/create-bucket
 * Create the 'media' bucket (superadmin only)
 */
router.post('/create-bucket', auth, async (req: AuthRequest, res) => {
    const supabaseClient = requireSupabase();
    const supabaseAdminClient = requireSupabaseAdmin();
  try {
    const userRole = req.user?.role;

    if (userRole !== 'super_admin' && userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Only super admins can create buckets' });
    }

    const { error } = await supabaseClient.storage.createBucket('media', {
      public: true,
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'audio/mpeg',
        'audio/mp3',
        'audio/aac',
      ],
      fileSizeLimit: 100 * 1024 * 1024, // 100MB
    });

    if (error) throw error;

    return res.json({ success: true, message: 'Media bucket created successfully' });
  } catch (error: any) {
    console.error('Create bucket error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
