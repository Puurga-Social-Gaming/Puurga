import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Media Service - Handles file uploads to Supabase Storage
 * Single bucket: 'media' with path structure: {userId}/{mediaId}/{filename}
 */

export interface MediaUploadResult {
  mediaId: string;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

/**
 * Upload a file to Supabase Storage under the 'media' bucket
 * @param file - The file buffer
 * @param userId - The user's ID
 * @param originalName - Original file name
 * @param mimeType - File MIME type
 * @returns Upload result with mediaId and URL
 */
export const uploadMedia = async (
  file: Buffer,
  userId: string,
  originalName: string,
  mimeType: string
): Promise<MediaUploadResult> => {
  const mediaId = uuidv4();
  const fileExtension = originalName.split('.').pop() || '';
  const fileName = `${mediaId}/original.${fileExtension}`;
  const filePath = `${userId}/${fileName}`;

  try {
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    return {
      mediaId,
      url: urlData.publicUrl,
      fileName: filePath,
      mimeType,
      size: file.length,
    };
  } catch (error) {
    console.error('Media upload error:', error);
    throw new Error(`Failed to upload media: ${error}`);
  }
};

/**
 * Delete media from Supabase Storage
 * @param userId - The user's ID
 * @param mediaId - The media ID
 */
export const deleteMedia = async (userId: string, mediaId: string): Promise<void> => {
  try {
    const { data, error } = await supabase.storage
      .from('media')
      .list(`${userId}/${mediaId}`);

    if (error) throw error;

    const filesToDelete = data.map((file) => `${userId}/${mediaId}/${file.name}`);

    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from('media')
        .remove(filesToDelete);

      if (deleteError) throw deleteError;
    }
  } catch (error) {
    console.error('Media delete error:', error);
    throw new Error(`Failed to delete media: ${error}`);
  }
};

/**
 * Get a signed URL for private media access
 * @param filePath - The file path in storage
 * @param expiresIn - Expiry time in seconds (default 3600)
 */
export const getSignedUrl = async (
  filePath: string,
  expiresIn: number = 3600
): Promise<string> => {
  try {
    const { data, error } = await supabase.storage
      .from('media')
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Get signed URL error:', error);
    throw new Error(`Failed to get signed URL: ${error}`);
  }
};
