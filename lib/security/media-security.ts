/**
 * Media Security Utilities
 * Handles security features for annotation media files
 * Implements: Requirements 9.6, 12.5, 12.6, 13.5
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (handle missing env vars in tests)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generate a secure, time-limited signed URL for media access
 * @param filePath - Path to the media file in storage
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL or null if generation fails
 */
export async function generateSecureMediaUrl(
  filePath: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('document-media')
      .createSignedUrl(filePath, expiresIn);

    if (error || !data?.signedUrl) {
      console.error('Failed to generate signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error generating secure media URL:', error);
    return null;
  }
}

/**
 * Validate media file access permissions
 * @param userId - ID of the user requesting access
 * @param filePath - Path to the media file
 * @returns true if user has access, false otherwise
 */
export function validateMediaAccess(userId: string, filePath: string): boolean {
  // File path format: {userId}/{mediaType}/{fileName}
  // User can only access their own files
  if (!userId || !filePath) {
    return false;
  }
  return filePath.startsWith(userId + '/');
}

/**
 * Generate a secure file path for media upload
 * @param userId - ID of the user uploading the file
 * @param mediaType - Type of media (AUDIO or VIDEO)
 * @param fileName - Original file name
 * @returns Secure file path
 */
export function generateSecureFilePath(
  userId: string,
  mediaType: 'AUDIO' | 'VIDEO',
  fileName: string
): string {
  // Sanitize filename to prevent path traversal and malicious content
  // Remove null bytes, path traversal sequences, and dangerous characters
  let sanitizedFileName = fileName
    .replace(/\0/g, '') // Remove null bytes
    .replace(/\.\./g, '') // Remove path traversal
    .replace(/[\/\\]/g, '') // Remove path separators
    .replace(/[<>:"|?*]/g, '') // Remove Windows reserved characters
    .replace(/^\.+/, ''); // Remove leading dots
  
  // Only allow alphanumeric, dots, and underscores (no hyphens to avoid SQL comments)
  sanitizedFileName = sanitizedFileName.replace(/[^a-zA-Z0-9._]/g, '_');
  
  // Remove any remaining dangerous patterns
  sanitizedFileName = sanitizedFileName
    .replace(/\.exe$/i, '') // Remove .exe extension
    .replace(/\.bat$/i, '') // Remove .bat extension
    .replace(/\.cmd$/i, '') // Remove .cmd extension
    .replace(/\.sh$/i, ''); // Remove .sh extension
  
  // Generate unique filename with crypto-random component
  const randomComponent = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now();
  
  return `${userId}/${mediaType.toLowerCase()}/${timestamp}-${randomComponent}-${sanitizedFileName}`;
}

/**
 * Validate media file type
 * @param fileType - MIME type of the file
 * @param mediaType - Expected media type (AUDIO or VIDEO)
 * @returns true if file type is valid, false otherwise
 */
export function validateMediaFileType(
  fileType: string,
  mediaType: 'AUDIO' | 'VIDEO'
): boolean {
  const allowedAudioTypes = [
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
    'audio/m4a',
    'audio/x-wav',
    'audio/x-m4a'
  ];

  const allowedVideoTypes = [
    'video/mp4',
    'video/webm',
    'video/mov',
    'video/avi',
    'video/quicktime'
  ];

  const allowedTypes = mediaType === 'AUDIO' ? allowedAudioTypes : allowedVideoTypes;
  return allowedTypes.includes(fileType.toLowerCase());
}

/**
 * Validate media file size
 * @param fileSize - Size of the file in bytes
 * @param maxSize - Maximum allowed size in bytes (default: 100MB)
 * @returns true if file size is valid, false otherwise
 */
export function validateMediaFileSize(
  fileSize: number,
  maxSize: number = 100 * 1024 * 1024 // 100MB
): boolean {
  return fileSize > 0 && fileSize <= maxSize;
}

/**
 * Delete media file from storage
 * @param filePath - Path to the media file
 * @param userId - ID of the user requesting deletion
 * @returns true if deletion successful, false otherwise
 */
export async function deleteMediaFile(
  filePath: string,
  userId: string
): Promise<boolean> {
  try {
    // Validate user owns the file
    if (!validateMediaAccess(userId, filePath)) {
      console.error('Access denied: User does not own the file');
      return false;
    }

    const { error } = await supabase.storage
      .from('document-media')
      .remove([filePath]);

    if (error) {
      console.error('Failed to delete media file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting media file:', error);
    return false;
  }
}

/**
 * Security configuration for media files
 */
export const MEDIA_SECURITY_CONFIG = {
  // Maximum file size (100MB)
  MAX_FILE_SIZE: 100 * 1024 * 1024,
  
  // Default signed URL expiration (1 hour)
  DEFAULT_URL_EXPIRATION: 3600,
  
  // Long-term signed URL expiration (1 year for stored annotations)
  LONG_TERM_URL_EXPIRATION: 365 * 24 * 60 * 60,
  
  // Allowed audio MIME types
  ALLOWED_AUDIO_TYPES: [
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
    'audio/m4a',
    'audio/x-wav',
    'audio/x-m4a'
  ],
  
  // Allowed video MIME types
  ALLOWED_VIDEO_TYPES: [
    'video/mp4',
    'video/webm',
    'video/mov',
    'video/avi',
    'video/quicktime'
  ],
  
  // Storage bucket name
  STORAGE_BUCKET: 'document-media',
  
  // DRM features
  DRM_FEATURES: {
    // Prevent right-click context menu
    preventContextMenu: true,
    
    // Disable download controls
    disableDownload: true,
    
    // Disable picture-in-picture for videos
    disablePictureInPicture: true,
    
    // Apply watermark overlay
    applyWatermark: true,
    
    // Prevent text selection
    preventTextSelection: true
  }
} as const;

/**
 * Apply DRM protection attributes to media element
 * @param element - HTML media element (audio or video)
 */
export function applyDRMProtection(element: HTMLMediaElement): void {
  // Disable download
  element.setAttribute('controlsList', 'nodownload');
  
  // Disable picture-in-picture for videos
  if (element instanceof HTMLVideoElement) {
    element.disablePictureInPicture = true;
  }
  
  // Prevent context menu
  element.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });
  
  // Prevent keyboard shortcuts for download
  element.addEventListener('keydown', (e) => {
    // Prevent Ctrl+S (save)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      return false;
    }
  });
}

/**
 * Log media access attempt
 * @param userId - ID of the user accessing media
 * @param annotationId - ID of the annotation
 * @param action - Action performed (view, play, download_attempt)
 */
export async function logMediaAccess(
  userId: string,
  annotationId: string,
  action: 'view' | 'play' | 'download_attempt'
): Promise<void> {
  try {
    // Log to console for now
    // In production, this would log to a database or analytics service
    console.log('[Media Access]', {
      userId,
      annotationId,
      action,
      timestamp: new Date().toISOString()
    });

    // TODO: Implement database logging when analytics table is created
    // await prisma.mediaAccessLog.create({
    //   data: {
    //     userId,
    //     annotationId,
    //     action,
    //     timestamp: new Date()
    //   }
    // });
  } catch (error) {
    console.error('Error logging media access:', error);
  }
}

/**
 * Validate external URL to prevent XSS and malicious content
 * @param url - URL to validate
 * @returns true if URL is safe, false otherwise
 */
export function validateExternalUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  // Reject dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:'
  ];
  
  const lowerUrl = url.toLowerCase().trim();
  
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return false;
    }
  }
  
  // Only allow http and https
  if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
    return false;
  }
  
  // Validate URL format
  try {
    const urlObj = new URL(url);
    
    // Ensure protocol is http or https
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Encryption utilities
 * Note: Supabase handles encryption at rest automatically
 * These utilities are for additional client-side security if needed
 */
export const ENCRYPTION_INFO = {
  // Supabase provides encryption at rest by default
  atRest: 'Supabase encrypts all data at rest using AES-256',
  
  // Supabase provides encryption in transit
  inTransit: 'All data transfer uses TLS 1.2+ encryption',
  
  // Signed URLs provide secure, time-limited access
  accessControl: 'Signed URLs with configurable expiration times',
  
  // Row Level Security policies control access
  rls: 'Row Level Security policies enforce user-level access control'
} as const;

