/**
 * Upload Error Handling Utilities
 * Provides structured error handling for multi-content type uploads
 * Requirements: 9.4
 */

import { ContentType } from '../types/content';
import { formatBytes, getMaxFileSize } from '../file-validation';

/**
 * Custom error class for upload-related errors
 * Provides structured error information with error codes
 */
export class UploadError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'UploadError';
    
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UploadError);
    }
  }
}

/**
 * Standardized error codes for all upload scenarios
 * Requirements: 9.4
 */
export const UploadErrorCodes = {
  // File validation errors
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  INVALID_FILE_EXTENSION: 'INVALID_FILE_EXTENSION',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_EMPTY: 'FILE_EMPTY',
  CONTENT_TYPE_MISMATCH: 'CONTENT_TYPE_MISMATCH',
  
  // Quota errors
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  SHARE_QUOTA_EXCEEDED: 'SHARE_QUOTA_EXCEEDED',
  
  // Storage errors
  STORAGE_ERROR: 'STORAGE_ERROR',
  STORAGE_UPLOAD_FAILED: 'STORAGE_UPLOAD_FAILED',
  STORAGE_CONNECTION_FAILED: 'STORAGE_CONNECTION_FAILED',
  
  // Processing errors
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  THUMBNAIL_GENERATION_FAILED: 'THUMBNAIL_GENERATION_FAILED',
  METADATA_EXTRACTION_FAILED: 'METADATA_EXTRACTION_FAILED',
  
  // Link-specific errors
  INVALID_URL: 'INVALID_URL',
  INVALID_URL_PROTOCOL: 'INVALID_URL_PROTOCOL',
  METADATA_FETCH_FAILED: 'METADATA_FETCH_FAILED',
  LINK_UNREACHABLE: 'LINK_UNREACHABLE',
  
  // Permission errors
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD'
} as const;

export type UploadErrorCode = typeof UploadErrorCodes[keyof typeof UploadErrorCodes];

/**
 * User-friendly error messages for each error code
 * Requirements: 9.4 - Clear error messages
 */
const ERROR_MESSAGES: Record<UploadErrorCode, string> = {
  // File validation errors
  [UploadErrorCodes.INVALID_FILE_TYPE]: 
    'The file type is not supported. Please upload a valid file.',
  [UploadErrorCodes.INVALID_FILE_EXTENSION]: 
    'The file extension is not allowed. Please check the file format.',
  [UploadErrorCodes.FILE_TOO_LARGE]: 
    'The file is too large. Please upload a smaller file.',
  [UploadErrorCodes.FILE_EMPTY]: 
    'The file is empty. Please select a valid file.',
  [UploadErrorCodes.CONTENT_TYPE_MISMATCH]: 
    'The file does not match the selected content type.',
  
  // Quota errors
  [UploadErrorCodes.QUOTA_EXCEEDED]: 
    'You have reached your upload limit. Please delete some files or upgrade your plan.',
  [UploadErrorCodes.SHARE_QUOTA_EXCEEDED]: 
    'You have reached your sharing limit. Please revoke some shares or upgrade your plan.',
  
  // Storage errors
  [UploadErrorCodes.STORAGE_ERROR]: 
    'An error occurred while storing your file. Please try again.',
  [UploadErrorCodes.STORAGE_UPLOAD_FAILED]: 
    'Failed to upload file to storage. Please check your connection and try again.',
  [UploadErrorCodes.STORAGE_CONNECTION_FAILED]: 
    'Unable to connect to storage service. Please try again later.',
  
  // Processing errors
  [UploadErrorCodes.PROCESSING_ERROR]: 
    'An error occurred while processing your file. Please try again.',
  [UploadErrorCodes.THUMBNAIL_GENERATION_FAILED]: 
    'Failed to generate thumbnail. The file was uploaded but preview may not be available.',
  [UploadErrorCodes.METADATA_EXTRACTION_FAILED]: 
    'Failed to extract file metadata. The file was uploaded but some information may be missing.',
  
  // Link-specific errors
  [UploadErrorCodes.INVALID_URL]: 
    'The URL is not valid. Please enter a valid web address.',
  [UploadErrorCodes.INVALID_URL_PROTOCOL]: 
    'Only HTTP and HTTPS URLs are supported.',
  [UploadErrorCodes.METADATA_FETCH_FAILED]: 
    'Failed to fetch link information. The link was saved but preview may not be available.',
  [UploadErrorCodes.LINK_UNREACHABLE]: 
    'The URL could not be reached. Please check the address and try again.',
  
  // Permission errors
  [UploadErrorCodes.PERMISSION_DENIED]: 
    'You do not have permission to perform this action.',
  [UploadErrorCodes.UNAUTHORIZED]: 
    'You must be logged in to upload files.',
  
  // General errors
  [UploadErrorCodes.UNKNOWN_ERROR]: 
    'An unexpected error occurred. Please try again.',
  [UploadErrorCodes.INVALID_INPUT]: 
    'Invalid input provided. Please check your data and try again.',
  [UploadErrorCodes.MISSING_REQUIRED_FIELD]: 
    'Required information is missing. Please fill in all required fields.'
};

/**
 * Get user-friendly error message for an error code
 * Requirements: 9.4
 */
export function getErrorMessage(code: UploadErrorCode, details?: any): string {
  let message = ERROR_MESSAGES[code] || ERROR_MESSAGES[UploadErrorCodes.UNKNOWN_ERROR];
  
  // Add specific details for certain error types
  if (code === UploadErrorCodes.FILE_TOO_LARGE && details?.contentType && details?.fileSize) {
    const maxSize = getMaxFileSize(details.contentType);
    message = `The file is too large (${formatBytes(details.fileSize)}). Maximum size for ${details.contentType} files is ${formatBytes(maxSize)}.`;
  }
  
  if (code === UploadErrorCodes.INVALID_FILE_TYPE && details?.contentType) {
    const allowedFormats = getAllowedFormatsForContentType(details.contentType);
    message = `Invalid file type. Allowed formats for ${details.contentType}: ${allowedFormats}.`;
  }
  
  return message;
}

/**
 * Create an UploadError with appropriate message and code
 * Requirements: 9.4
 */
export function createUploadError(
  code: UploadErrorCode,
  details?: any
): UploadError {
  const message = getErrorMessage(code, details);
  return new UploadError(message, code, details);
}

/**
 * Handle and normalize errors from various sources
 * Converts unknown errors into structured UploadError instances
 * Requirements: 9.4
 */
export function handleUploadError(error: unknown): UploadError {
  // Already an UploadError
  if (error instanceof UploadError) {
    return error;
  }
  
  // Standard Error
  if (error instanceof Error) {
    // Map known error patterns to specific error codes
    const message = error.message.toLowerCase();
    
    // File type errors
    if (message.includes('file type') || message.includes('invalid type')) {
      return createUploadError(UploadErrorCodes.INVALID_FILE_TYPE);
    }
    
    if (message.includes('extension')) {
      return createUploadError(UploadErrorCodes.INVALID_FILE_EXTENSION);
    }
    
    // Size errors
    if (message.includes('size') || message.includes('too large') || message.includes('exceeds')) {
      return createUploadError(UploadErrorCodes.FILE_TOO_LARGE);
    }
    
    if (message.includes('empty')) {
      return createUploadError(UploadErrorCodes.FILE_EMPTY);
    }
    
    // Quota errors
    if (message.includes('quota') || message.includes('limit')) {
      return createUploadError(UploadErrorCodes.QUOTA_EXCEEDED);
    }
    
    // Storage errors
    if (message.includes('storage') || message.includes('upload failed')) {
      return createUploadError(UploadErrorCodes.STORAGE_ERROR);
    }
    
    // Processing errors
    if (message.includes('processing') || message.includes('thumbnail') || message.includes('metadata')) {
      return createUploadError(UploadErrorCodes.PROCESSING_ERROR);
    }
    
    // URL errors
    if (message.includes('url') || message.includes('invalid link')) {
      return createUploadError(UploadErrorCodes.INVALID_URL);
    }
    
    if (message.includes('protocol')) {
      return createUploadError(UploadErrorCodes.INVALID_URL_PROTOCOL);
    }
    
    // Permission errors
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return createUploadError(UploadErrorCodes.PERMISSION_DENIED);
    }
    
    // Generic error with original message
    return new UploadError(
      error.message,
      UploadErrorCodes.UNKNOWN_ERROR,
      { originalError: error }
    );
  }
  
  // Unknown error type
  return createUploadError(UploadErrorCodes.UNKNOWN_ERROR, { originalError: error });
}

/**
 * Validate file and throw appropriate UploadError if invalid
 * Requirements: 9.4
 */
export function validateFileOrThrow(
  file: { name: string; type: string; size: number },
  contentType: ContentType
): void {
  // Check if file is empty
  if (file.size === 0) {
    throw createUploadError(UploadErrorCodes.FILE_EMPTY);
  }
  
  // Check file size
  const maxSize = getMaxFileSize(contentType);
  if (file.size > maxSize) {
    throw createUploadError(UploadErrorCodes.FILE_TOO_LARGE, {
      contentType,
      fileSize: file.size,
      maxSize
    });
  }
  
  // Content type specific validation is handled by file-validation module
  // This is a wrapper that throws UploadError instead of returning validation result
}

/**
 * Validate URL and throw appropriate UploadError if invalid
 * Requirements: 5.4, 9.4
 */
export function validateUrlOrThrow(url: string): void {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    throw createUploadError(UploadErrorCodes.INVALID_URL);
  }
  
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTP and HTTPS protocols
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw createUploadError(UploadErrorCodes.INVALID_URL_PROTOCOL);
    }
  } catch (error) {
    // If it's already an UploadError (from protocol check), re-throw it
    if (error instanceof UploadError) {
      throw error;
    }
    // Otherwise, it's an invalid URL format
    throw createUploadError(UploadErrorCodes.INVALID_URL);
  }
}

/**
 * Check if error is a specific type of UploadError
 */
export function isUploadErrorCode(error: unknown, code: UploadErrorCode): boolean {
  return error instanceof UploadError && error.code === code;
}

/**
 * Check if error is recoverable (user can fix and retry)
 */
export function isRecoverableError(error: UploadError): boolean {
  const recoverableCodes: string[] = [
    UploadErrorCodes.INVALID_FILE_TYPE,
    UploadErrorCodes.INVALID_FILE_EXTENSION,
    UploadErrorCodes.FILE_TOO_LARGE,
    UploadErrorCodes.FILE_EMPTY,
    UploadErrorCodes.CONTENT_TYPE_MISMATCH,
    UploadErrorCodes.INVALID_URL,
    UploadErrorCodes.INVALID_URL_PROTOCOL,
    UploadErrorCodes.INVALID_INPUT,
    UploadErrorCodes.MISSING_REQUIRED_FIELD
  ];
  
  return recoverableCodes.includes(error.code);
}

/**
 * Get allowed formats string for content type
 */
function getAllowedFormatsForContentType(contentType: ContentType): string {
  switch (contentType) {
    case ContentType.PDF:
      return 'PDF';
    case ContentType.IMAGE:
      return 'JPG, JPEG, PNG, GIF, WebP';
    case ContentType.VIDEO:
      return 'MP4, WebM, MOV';
    case ContentType.LINK:
      return 'HTTP/HTTPS URLs';
    default:
      return 'Unknown';
  }
}

/**
 * Format error for API response
 * Requirements: 9.4
 */
export function formatErrorResponse(error: UploadError): {
  error: string;
  code: string;
  message: string;
  recoverable: boolean;
} {
  return {
    error: error.name,
    code: error.code,
    message: error.message,
    recoverable: isRecoverableError(error)
  };
}

/**
 * Format error for client display
 * Requirements: 9.4
 */
export function formatErrorForClient(error: unknown): {
  message: string;
  code: string;
  canRetry: boolean;
} {
  const uploadError = handleUploadError(error);
  
  return {
    message: uploadError.message,
    code: uploadError.code,
    canRetry: isRecoverableError(uploadError)
  };
}
