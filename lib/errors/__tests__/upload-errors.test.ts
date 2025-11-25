/**
 * Tests for Upload Error Handling Utilities
 * Requirements: 9.4
 */

import { describe, it, expect } from 'vitest';
import {
  UploadError,
  UploadErrorCodes,
  createUploadError,
  handleUploadError,
  getErrorMessage,
  validateUrlOrThrow,
  isUploadErrorCode,
  isRecoverableError,
  formatErrorResponse,
  formatErrorForClient
} from '../upload-errors';
import { ContentType } from '../../types/content';

describe('UploadError', () => {
  it('should create an UploadError with message, code, and details', () => {
    const error = new UploadError('Test error', UploadErrorCodes.INVALID_FILE_TYPE, { test: true });
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(UploadError);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(UploadErrorCodes.INVALID_FILE_TYPE);
    expect(error.details).toEqual({ test: true });
    expect(error.name).toBe('UploadError');
  });
});

describe('createUploadError', () => {
  it('should create an UploadError with appropriate message for error code', () => {
    const error = createUploadError(UploadErrorCodes.FILE_TOO_LARGE);
    
    expect(error).toBeInstanceOf(UploadError);
    expect(error.code).toBe(UploadErrorCodes.FILE_TOO_LARGE);
    expect(error.message).toContain('too large');
  });

  it('should include file size details in message for FILE_TOO_LARGE', () => {
    const error = createUploadError(UploadErrorCodes.FILE_TOO_LARGE, {
      contentType: ContentType.IMAGE,
      fileSize: 15 * 1024 * 1024 // 15MB
    });
    
    expect(error.message).toContain('15 MB');
    expect(error.message).toContain('10 MB'); // Max image size
  });

  it('should include allowed formats for INVALID_FILE_TYPE', () => {
    const error = createUploadError(UploadErrorCodes.INVALID_FILE_TYPE, {
      contentType: ContentType.IMAGE
    });
    
    expect(error.message).toContain('JPG');
    expect(error.message).toContain('PNG');
  });
});

describe('getErrorMessage', () => {
  it('should return user-friendly message for each error code', () => {
    const message = getErrorMessage(UploadErrorCodes.INVALID_URL);
    
    expect(message).toBeTruthy();
    expect(message.length).toBeGreaterThan(0);
    expect(message).toContain('URL');
  });

  it('should return default message for unknown error code', () => {
    const message = getErrorMessage('UNKNOWN_CODE' as any);
    
    expect(message).toContain('unexpected error');
  });
});

describe('handleUploadError', () => {
  it('should return UploadError as-is', () => {
    const originalError = createUploadError(UploadErrorCodes.FILE_EMPTY);
    const handled = handleUploadError(originalError);
    
    expect(handled).toBe(originalError);
  });

  it('should convert Error with "file type" message to INVALID_FILE_TYPE', () => {
    const error = new Error('Invalid file type detected');
    const handled = handleUploadError(error);
    
    expect(handled.code).toBe(UploadErrorCodes.INVALID_FILE_TYPE);
  });

  it('should convert Error with "size" message to FILE_TOO_LARGE', () => {
    const error = new Error('File size exceeds limit');
    const handled = handleUploadError(error);
    
    expect(handled.code).toBe(UploadErrorCodes.FILE_TOO_LARGE);
  });

  it('should convert Error with "quota" message to QUOTA_EXCEEDED', () => {
    const error = new Error('Upload quota exceeded');
    const handled = handleUploadError(error);
    
    expect(handled.code).toBe(UploadErrorCodes.QUOTA_EXCEEDED);
  });

  it('should convert Error with "storage" message to STORAGE_ERROR', () => {
    const error = new Error('Storage upload failed');
    const handled = handleUploadError(error);
    
    expect(handled.code).toBe(UploadErrorCodes.STORAGE_ERROR);
  });

  it('should convert Error with "url" message to INVALID_URL', () => {
    const error = new Error('Invalid URL provided');
    const handled = handleUploadError(error);
    
    expect(handled.code).toBe(UploadErrorCodes.INVALID_URL);
  });

  it('should convert unknown Error to UNKNOWN_ERROR', () => {
    const error = new Error('Something went wrong');
    const handled = handleUploadError(error);
    
    expect(handled.code).toBe(UploadErrorCodes.UNKNOWN_ERROR);
    expect(handled.message).toBe('Something went wrong');
  });

  it('should handle non-Error objects', () => {
    const handled = handleUploadError('string error');
    
    expect(handled).toBeInstanceOf(UploadError);
    expect(handled.code).toBe(UploadErrorCodes.UNKNOWN_ERROR);
  });
});

describe('validateUrlOrThrow', () => {
  it('should not throw for valid HTTP URL', () => {
    expect(() => validateUrlOrThrow('http://example.com')).not.toThrow();
  });

  it('should not throw for valid HTTPS URL', () => {
    expect(() => validateUrlOrThrow('https://example.com')).not.toThrow();
  });

  it('should throw INVALID_URL for empty string', () => {
    expect(() => validateUrlOrThrow('')).toThrow(UploadError);
    
    try {
      validateUrlOrThrow('');
    } catch (error) {
      expect(error).toBeInstanceOf(UploadError);
      expect((error as UploadError).code).toBe(UploadErrorCodes.INVALID_URL);
    }
  });

  it('should throw INVALID_URL for invalid URL format', () => {
    expect(() => validateUrlOrThrow('not a url')).toThrow(UploadError);
    
    try {
      validateUrlOrThrow('not a url');
    } catch (error) {
      expect((error as UploadError).code).toBe(UploadErrorCodes.INVALID_URL);
    }
  });

  it('should throw INVALID_URL_PROTOCOL for FTP URL', () => {
    expect(() => validateUrlOrThrow('ftp://example.com')).toThrow(UploadError);
    
    try {
      validateUrlOrThrow('ftp://example.com');
    } catch (error) {
      expect((error as UploadError).code).toBe(UploadErrorCodes.INVALID_URL_PROTOCOL);
    }
  });

  it('should throw INVALID_URL_PROTOCOL for file:// URL', () => {
    expect(() => validateUrlOrThrow('file:///path/to/file')).toThrow(UploadError);
    
    try {
      validateUrlOrThrow('file:///path/to/file');
    } catch (error) {
      expect((error as UploadError).code).toBe(UploadErrorCodes.INVALID_URL_PROTOCOL);
    }
  });
});

describe('isUploadErrorCode', () => {
  it('should return true for matching error code', () => {
    const error = createUploadError(UploadErrorCodes.FILE_EMPTY);
    
    expect(isUploadErrorCode(error, UploadErrorCodes.FILE_EMPTY)).toBe(true);
  });

  it('should return false for non-matching error code', () => {
    const error = createUploadError(UploadErrorCodes.FILE_EMPTY);
    
    expect(isUploadErrorCode(error, UploadErrorCodes.INVALID_URL)).toBe(false);
  });

  it('should return false for non-UploadError', () => {
    const error = new Error('Regular error');
    
    expect(isUploadErrorCode(error, UploadErrorCodes.FILE_EMPTY)).toBe(false);
  });
});

describe('isRecoverableError', () => {
  it('should return true for file validation errors', () => {
    const error = createUploadError(UploadErrorCodes.INVALID_FILE_TYPE);
    expect(isRecoverableError(error)).toBe(true);
  });

  it('should return true for URL validation errors', () => {
    const error = createUploadError(UploadErrorCodes.INVALID_URL);
    expect(isRecoverableError(error)).toBe(true);
  });

  it('should return false for storage errors', () => {
    const error = createUploadError(UploadErrorCodes.STORAGE_ERROR);
    expect(isRecoverableError(error)).toBe(false);
  });

  it('should return false for processing errors', () => {
    const error = createUploadError(UploadErrorCodes.PROCESSING_ERROR);
    expect(isRecoverableError(error)).toBe(false);
  });

  it('should return false for permission errors', () => {
    const error = createUploadError(UploadErrorCodes.PERMISSION_DENIED);
    expect(isRecoverableError(error)).toBe(false);
  });
});

describe('formatErrorResponse', () => {
  it('should format error for API response', () => {
    const error = createUploadError(UploadErrorCodes.FILE_TOO_LARGE);
    const response = formatErrorResponse(error);
    
    expect(response).toHaveProperty('error');
    expect(response).toHaveProperty('code');
    expect(response).toHaveProperty('message');
    expect(response).toHaveProperty('recoverable');
    expect(response.code).toBe(UploadErrorCodes.FILE_TOO_LARGE);
    expect(response.recoverable).toBe(true);
  });
});

describe('formatErrorForClient', () => {
  it('should format UploadError for client display', () => {
    const error = createUploadError(UploadErrorCodes.INVALID_URL);
    const formatted = formatErrorForClient(error);
    
    expect(formatted).toHaveProperty('message');
    expect(formatted).toHaveProperty('code');
    expect(formatted).toHaveProperty('canRetry');
    expect(formatted.code).toBe(UploadErrorCodes.INVALID_URL);
    expect(formatted.canRetry).toBe(true);
  });

  it('should format regular Error for client display', () => {
    const error = new Error('Storage failed');
    const formatted = formatErrorForClient(error);
    
    expect(formatted).toHaveProperty('message');
    expect(formatted).toHaveProperty('code');
    expect(formatted).toHaveProperty('canRetry');
    expect(formatted.code).toBe(UploadErrorCodes.STORAGE_ERROR);
  });

  it('should format unknown error for client display', () => {
    const formatted = formatErrorForClient('unknown error');
    
    expect(formatted).toHaveProperty('message');
    expect(formatted).toHaveProperty('code');
    expect(formatted.code).toBe(UploadErrorCodes.UNKNOWN_ERROR);
  });
});

describe('Error Messages', () => {
  it('should have clear, user-friendly messages for all error codes', () => {
    const errorCodes = Object.values(UploadErrorCodes);
    
    errorCodes.forEach(code => {
      const message = getErrorMessage(code);
      
      // Message should exist
      expect(message).toBeTruthy();
      
      // Message should be reasonably long (not just a code)
      expect(message.length).toBeGreaterThan(10);
      
      // Message should not contain technical jargon like "null" or "undefined"
      expect(message.toLowerCase()).not.toContain('null');
      expect(message.toLowerCase()).not.toContain('undefined');
    });
  });
});
