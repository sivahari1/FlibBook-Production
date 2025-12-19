/**
 * File validation and sanitization utilities for multi-content type support
 * Handles validation for PDFs, images, videos, and links
 * Requirements: 3.1, 3.2, 4.1, 4.2
 */

import { ContentType } from './types/content';

// Image validation constants (Requirements: 3.1, 3.2)
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

export const ALLOWED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp'
];

// Video validation constants (Requirements: 4.1, 4.2)
export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime' // MOV files
];

export const ALLOWED_VIDEO_EXTENSIONS = [
  '.mp4',
  '.webm',
  '.mov'
];

// PDF validation constants
export const ALLOWED_PDF_TYPES = ['application/pdf'];
export const ALLOWED_PDF_EXTENSIONS = ['.pdf'];

// File size limits
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
export const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Validate image file type by MIME type
 * Requirements: 3.1
 */
export function isValidImageType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase());
}

/**
 * Validate image file extension
 * Requirements: 3.1
 */
export function isValidImageExtension(filename: string): boolean {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return ALLOWED_IMAGE_EXTENSIONS.includes(extension);
}

/**
 * Validate video file type by MIME type
 * Requirements: 4.1
 */
export function isValidVideoType(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType.toLowerCase());
}

/**
 * Validate video file extension
 * Requirements: 4.1
 */
export function isValidVideoExtension(filename: string): boolean {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return ALLOWED_VIDEO_EXTENSIONS.includes(extension);
}

/**
 * Validate PDF file type by MIME type
 */
export function isValidPDFType(mimeType: string): boolean {
  return ALLOWED_PDF_TYPES.includes(mimeType.toLowerCase());
}

/**
 * Validate PDF file extension
 */
export function isValidPDFExtension(filename: string): boolean {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return ALLOWED_PDF_EXTENSIONS.includes(extension);
}

/**
 * Validate file size based on content type
 * Requirements: 3.2, 4.2
 */
export function isValidFileSize(
  size: number,
  contentType: ContentType
): boolean {
  // Links don't have file size validation
  if (contentType === ContentType.LINK) {
    return true;
  }

  if (size <= 0) return false;

  switch (contentType) {
    case ContentType.IMAGE:
      return size <= MAX_IMAGE_SIZE;
    case ContentType.VIDEO:
      return size <= MAX_VIDEO_SIZE;
    case ContentType.PDF:
      return size <= MAX_PDF_SIZE;
    default:
      return false;
  }
}

/**
 * Get maximum file size for content type
 */
export function getMaxFileSize(contentType: ContentType): number {
  switch (contentType) {
    case ContentType.IMAGE:
      return MAX_IMAGE_SIZE;
    case ContentType.VIDEO:
      return MAX_VIDEO_SIZE;
    case ContentType.PDF:
      return MAX_PDF_SIZE;
    default:
      return 0;
  }
}

/**
 * Sanitize filename to prevent security issues
 * Removes path separators, special characters, and limits length
 * Requirements: 3.2, 4.2
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed';
  }

  // First, remove all path separators and dots to prevent path traversal
  const sanitized = filename
    .replace(/[\/\\]/g, '_')  // Replace path separators
    .replace(/\.\./g, '_')     // Replace .. sequences
    .replace(/\0/g, '')        // Remove null bytes
    .replace(/[\x00-\x1f\x80-\x9f]/g, ''); // Remove control characters

  // Now find the extension (after path traversal prevention)
  const lastDotIndex = sanitized.lastIndexOf('.');
  let name = sanitized;
  let extension = '';
  
  // Only treat as extension if dot is not at start and has valid extension chars after it
  if (lastDotIndex > 0 && lastDotIndex < sanitized.length - 1) {
    const potentialExt = sanitized.substring(lastDotIndex + 1);
    // Check if it looks like a valid extension (only alphanumeric)
    if (/^[a-zA-Z0-9]+$/.test(potentialExt) && potentialExt.length <= 10) {
      name = sanitized.substring(0, lastDotIndex);
      extension = '.' + potentialExt.toLowerCase();
    }
  }

  // Sanitize the name part
  const sanitizedName = name
    // Replace remaining special characters with underscores
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    // Remove leading/trailing underscores and dashes
    .replace(/^[_-]+|[_-]+$/g, '')
    // Collapse multiple underscores
    .replace(/_+/g, '_')
    // Limit length (leave room for extension)
    .substring(0, 200);

  // Combine and ensure we have a valid filename
  const result = sanitizedName + extension;
  return result || 'unnamed';
}

/**
 * Comprehensive file validation for images
 * Requirements: 3.1, 3.2
 */
export function validateImageFile(file: {
  name: string;
  type: string;
  size: number;
}): { valid: boolean; error?: string } {
  // Check file type
  if (!isValidImageType(file.type)) {
    return {
      valid: false,
      error: 'Invalid image type. Allowed formats: JPG, PNG, GIF, WebP.'
    };
  }

  // Check file extension
  if (!isValidImageExtension(file.name)) {
    return {
      valid: false,
      error: 'Invalid image extension. Allowed: .jpg, .jpeg, .png, .gif, .webp'
    };
  }

  // Check file size
  if (!isValidFileSize(file.size, ContentType.IMAGE)) {
    if (file.size === 0) {
      return {
        valid: false,
        error: 'Image file is empty.'
      };
    }
    return {
      valid: false,
      error: `Image size exceeds maximum limit of ${formatBytes(MAX_IMAGE_SIZE)}.`
    };
  }

  return { valid: true };
}

/**
 * Comprehensive file validation for videos
 * Requirements: 4.1, 4.2
 */
export function validateVideoFile(file: {
  name: string;
  type: string;
  size: number;
}): { valid: boolean; error?: string } {
  // Check file type
  if (!isValidVideoType(file.type)) {
    return {
      valid: false,
      error: 'Invalid video type. Allowed formats: MP4, WebM, MOV.'
    };
  }

  // Check file extension
  if (!isValidVideoExtension(file.name)) {
    return {
      valid: false,
      error: 'Invalid video extension. Allowed: .mp4, .webm, .mov'
    };
  }

  // Check file size
  if (!isValidFileSize(file.size, ContentType.VIDEO)) {
    if (file.size === 0) {
      return {
        valid: false,
        error: 'Video file is empty.'
      };
    }
    return {
      valid: false,
      error: `Video size exceeds maximum limit of ${formatBytes(MAX_VIDEO_SIZE)}.`
    };
  }

  return { valid: true };
}

/**
 * Comprehensive file validation for PDFs
 */
export function validatePDFFile(file: {
  name: string;
  type: string;
  size: number;
}): { valid: boolean; error?: string } {
  // Check file type
  if (!isValidPDFType(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only PDF files are allowed.'
    };
  }

  // Check file extension
  if (!isValidPDFExtension(file.name)) {
    return {
      valid: false,
      error: 'Invalid file extension. Only .pdf files are allowed.'
    };
  }

  // Check file size
  if (!isValidFileSize(file.size, ContentType.PDF)) {
    if (file.size === 0) {
      return {
        valid: false,
        error: 'PDF file is empty.'
      };
    }
    return {
      valid: false,
      error: `PDF size exceeds maximum limit of ${formatBytes(MAX_PDF_SIZE)}.`
    };
  }

  return { valid: true };
}

/**
 * Universal file validation based on content type
 * Requirements: 3.1, 3.2, 4.1, 4.2
 */
export function validateFile(
  file: {
    name: string;
    type: string;
    size: number;
  },
  contentType: ContentType
): { valid: boolean; error?: string } {
  switch (contentType) {
    case ContentType.IMAGE:
      return validateImageFile(file);
    case ContentType.VIDEO:
      return validateVideoFile(file);
    case ContentType.PDF:
      return validatePDFFile(file);
    case ContentType.LINK:
      // Links don't have files to validate
      return { valid: true };
    default:
      return {
        valid: false,
        error: `Unsupported content type: ${contentType}`
      };
  }
}

/**
 * Validate content type against file
 * Ensures the selected content type matches the file type
 */
export function validateContentTypeMatch(
  file: {
    name: string;
    type: string;
  },
  contentType: ContentType
): { valid: boolean; error?: string } {
  switch (contentType) {
    case ContentType.IMAGE:
      if (!isValidImageType(file.type) || !isValidImageExtension(file.name)) {
        return {
          valid: false,
          error: 'File does not match selected content type (Image).'
        };
      }
      break;
    case ContentType.VIDEO:
      if (!isValidVideoType(file.type) || !isValidVideoExtension(file.name)) {
        return {
          valid: false,
          error: 'File does not match selected content type (Video).'
        };
      }
      break;
    case ContentType.PDF:
      if (!isValidPDFType(file.type) || !isValidPDFExtension(file.name)) {
        return {
          valid: false,
          error: 'File does not match selected content type (PDF).'
        };
      }
      break;
  }

  return { valid: true };
}

/**
 * Format bytes to human-readable string
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get allowed file types for content type (for file input accept attribute)
 */
export function getAllowedFileTypes(contentType: ContentType): string {
  switch (contentType) {
    case ContentType.IMAGE:
      return ALLOWED_IMAGE_TYPES.join(',');
    case ContentType.VIDEO:
      return ALLOWED_VIDEO_TYPES.join(',');
    case ContentType.PDF:
      return ALLOWED_PDF_TYPES.join(',');
    default:
      return '';
  }
}

/**
 * Get allowed file extensions for content type
 */
export function getAllowedExtensions(contentType: ContentType): string[] {
  switch (contentType) {
    case ContentType.IMAGE:
      return ALLOWED_IMAGE_EXTENSIONS;
    case ContentType.VIDEO:
      return ALLOWED_VIDEO_EXTENSIONS;
    case ContentType.PDF:
      return ALLOWED_PDF_EXTENSIONS;
    default:
      return [];
  }
}
