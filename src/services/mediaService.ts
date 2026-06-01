import api from '../lib/axios';

export interface MediaUploadResult {
  mediaId: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface MediaUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload media files to the backend
 * @param files - Array of files to upload
 * @param onProgress - Optional callback for upload progress
 * @returns Promise with array of media results
 */
export const uploadMedia = async (
  files: File[],
  onProgress?: (progress: MediaUploadProgress) => void
): Promise<MediaUploadResult[]> => {
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append('media', file);
  });

  const response = await api.post('/media/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 180000, // 3 minutes for video uploads
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        onProgress({
          loaded: progressEvent.loaded,
          total: progressEvent.total,
          percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
        });
      }
    },
  });

  return response.data.media;
};

/**
 * Delete media by ID
 * @param mediaId - The media ID to delete
 */
export const deleteMedia = async (mediaId: string): Promise<void> => {
  await api.delete(`/media/${mediaId}`);
};

/**
 * Get supported file types for media upload
 */
export const getSupportedFileTypes = (): string[] => {
  return [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/mp3',
    'audio/aac',
    'audio/wav',
    'audio/ogg',
  ];
};

/**
 * Check if a file type is supported
 * @param mimeType - The MIME type to check
 */
export const isSupportedFileType = (mimeType: string): boolean => {
  return getSupportedFileTypes().includes(mimeType);
};

/**
 * Format file size for display
 * @param bytes - Size in bytes
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
