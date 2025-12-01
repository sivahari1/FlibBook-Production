/**
 * Error Messages Tests
 * 
 * Verify that all error messages are clear, specific, and actionable
 * Requirements: 18.1, 18.2, 18.3, 18.4
 */

import { describe, it, expect } from 'vitest';
import {
  PDFConversionError,
  MediaUploadError,
  NetworkError,
  PermissionError,
  AnnotationError,
  PageLoadError,
  SecurityError,
  ValidationError,
} from '../flipbook-errors';
import { getUserFriendlyMessage, isRetryableError } from '../error-handler';

describe('Error Messages - Clarity and Actionability', () => {
  describe('PDF Conversion Errors', () => {
    it('should provide clear message for invalid PDF', () => {
      const error = PDFConversionError.invalidPDF('document.pdf');
      const { title, message } = getUserFriendlyMessage(error);

      expect(title).toBe('PDF Conversion Failed');
      expect(message).toContain('not a valid PDF');
      expect(message).not.toContain('undefined');
      expect(message).not.toContain('[object Object]');
    });

    it('should provide clear message for corrupted PDF', () => {
      const error = PDFConversionError.corruptedPDF('document.pdf');
      const { title, message } = getUserFriendlyMessage(error);

      expect(message).toContain('corrupted');
      expect(message).toContain('cannot be processed');
    });

    it('should provide clear message with specific numbers for page limit', () => {
      const error = PDFConversionError.pageLimitExceeded('document.pdf', 600, 500);
      const { title, message } = getUserFriendlyMessage(error);

      expect(message).toContain('600');
      expect(message).toContain('500');
      expect(message).toContain('exceeds');
    });

    it('should provide actionable message for timeout', () => {
      const error = PDFConversionError.conversionTimeout('document.pdf', 30000);
      const { title, message, actionLabel } = getUserFriendlyMessage(error);

      expect(message).toContain('timed out');
      expect(actionLabel).toBe('Try Again');
      expect(isRetryableError(error)).toBe(true);
    });
  });

  describe('Media Upload Errors', () => {
    it('should provide clear message for invalid media type', () => {
      const error = MediaUploadError.invalidMediaType(
        'video.avi',
        'video/avi',
        ['audio/mp3', 'video/mp4']
      );
      const { message } = getUserFriendlyMessage(error);

      expect(message).toContain('video/avi');
      expect(message).toContain('not supported');
      expect(message).toContain('audio/mp3');
      expect(message).toContain('video/mp4');
    });

    it('should provide clear message with specific sizes for file too large', () => {
      const error = MediaUploadError.fileTooLarge(
        'video.mp4',
        150 * 1024 * 1024, // 150MB
        100 * 1024 * 1024  // 100MB
      );
      const { message } = getUserFriendlyMessage(error);

      expect(message).toContain('150');
      expect(message).toContain('100');
      expect(message).toContain('MB');
      expect(message).toContain('exceeds');
    });

    it('should provide actionable message for storage quota exceeded', () => {
      const error = MediaUploadError.storageQuotaExceeded(
        'user123',
        1000 * 1024 * 1024,
        1000 * 1024 * 1024
      );
      const { message } = getUserFriendlyMessage(error);

      expect(message).toContain('quota exceeded');
      expect(message.toLowerCase()).toMatch(/delete|upgrade/);
    });

    it('should be retryable for upload failures', () => {
      const error = MediaUploadError.uploadFailed('video.mp4', new Error('Network error'));
      
      expect(isRetryableError(error)).toBe(true);
    });
  });

  describe('Network Errors', () => {
    it('should provide clear message for connection lost', () => {
      const error = NetworkError.connectionLost();
      const { title, message } = getUserFriendlyMessage(error);

      expect(title).toBe('Connection Error');
      expect(message).toContain('connection');
      expect(message).toContain('internet');
    });

    it('should provide clear message for timeout', () => {
      const error = NetworkError.requestTimeout('/api/upload', 30000);
      const { message } = getUserFriendlyMessage(error);

      expect(message).toContain('timed out');
      expect(message).toContain('30000');
    });

    it('should provide actionable message for server unreachable', () => {
      const error = NetworkError.serverUnreachable('/api/documents');
      const { message, actionLabel } = getUserFriendlyMessage(error);

      expect(message).toContain('server');
      expect(message).toContain('try again');
      expect(actionLabel).toBe('Retry');
    });

    it('should be retryable for all network errors', () => {
      const errors = [
        NetworkError.connectionLost(),
        NetworkError.requestTimeout('/api/test', 5000),
        NetworkError.serverUnreachable('/api/test'),
        NetworkError.badGateway('/api/test'),
      ];

      errors.forEach(error => {
        expect(isRetryableError(error)).toBe(true);
      });
    });
  });

  describe('Permission Errors', () => {
    it('should provide clear message for access denied', () => {
      const error = PermissionError.accessDenied('document', 'edit');
      const { title, message } = getUserFriendlyMessage(error);

      expect(title).toBe('Access Denied');
      expect(message).toContain('permission');
      expect(message).toContain('edit');
      expect(message).toContain('document');
    });

    it('should provide clear message for annotation permission denied', () => {
      const error = PermissionError.annotationPermissionDenied('doc123', 'create');
      const { message } = getUserFriendlyMessage(error);

      expect(message).toContain('permission');
      expect(message).toContain('annotation');
    });

    it('should provide actionable message for session expired', () => {
      const error = PermissionError.sessionExpired();
      const { message } = getUserFriendlyMessage(error);

      expect(message).toContain('session');
      expect(message).toContain('expired');
      expect(message).toContain('log in');
    });

    it('should provide clear message for insufficient privileges', () => {
      const error = PermissionError.insufficientPrivileges('PLATFORM_USER', 'MEMBER');
      const { message } = getUserFriendlyMessage(error);

      expect(message).toContain('PLATFORM_USER');
      expect(message).toContain('privileges');
    });

    it('should not be retryable', () => {
      const error = PermissionError.accessDenied('document', 'view');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('Annotation Errors', () => {
    it('should provide clear message for invalid position', () => {
      const error = AnnotationError.invalidPosition(1500, 2000, 1000, 1500);
      const { message } = getUserFriendlyMessage(error);

      expect(message).toContain('position');
      expect(message).toContain('outside');
      expect(message).toContain('boundaries');
    });

    it('should provide clear message for too many annotations', () => {
      const error = AnnotationError.tooManyAnnotations('doc123', 5, 50);
      const { message } = getUserFriendlyMessage(error);

      expect(message).toContain('50');
      expect(message).toContain('Maximum');
      expect(message).toContain('reached');
    });
  });

  describe('Page Load Errors', () => {
    it('should provide clear message for page not found', () => {
      const error = PageLoadError.pageNotFound('doc123', 25);
      const { message } = getUserFriendlyMessage(error);

      expect(message).toContain('Page 25');
      expect(message).toContain('not found');
    });

    it('should provide clear message for invalid page number', () => {
      const error = PageLoadError.invalidPageNumber(150, 100);
      const { message } = getUserFriendlyMessage(error);

      expect(message).toContain('150');
      expect(message).toContain('100');
      expect(message).toContain('Invalid');
    });
  });

  describe('Security Errors', () => {
    it('should provide clear message for DRM violation', () => {
      const error = SecurityError.drmViolation('screenshot attempt');
      const { message } = getUserFriendlyMessage(error);

      expect(message).toContain('DRM');
      expect(message).toContain('violation');
      expect(message.toLowerCase()).toMatch(/protect|detect/);
    });

    it('should provide clear message for dev tools detected', () => {
      const error = SecurityError.devToolsDetected();
      const { message } = getUserFriendlyMessage(error);

      expect(message).toContain('Developer tools');
      expect(message).toContain('protected');
    });
  });

  describe('Validation Errors', () => {
    it('should provide clear message for missing field', () => {
      const error = ValidationError.missingField('selectedText');
      const { message } = getUserFriendlyMessage(error);

      expect(message).toContain('selectedText');
      expect(message).toContain('missing');
      expect(message).toContain('Required');
    });

    it('should provide clear message for invalid format', () => {
      const error = ValidationError.invalidFormat('pageNumber', 'integer');
      const { message } = getUserFriendlyMessage(error);

      expect(message).toContain('pageNumber');
      expect(message).toContain('invalid format');
      expect(message).toContain('integer');
    });

    it('should provide clear message for out of range', () => {
      const error = ValidationError.outOfRange('pageNumber', 150, 1, 100);
      const { message } = getUserFriendlyMessage(error);

      expect(message).toContain('150');
      expect(message).toContain('1');
      expect(message).toContain('100');
      expect(message).toContain('out of range');
    });
  });

  describe('Error Message Quality', () => {
    const allErrors = [
      PDFConversionError.invalidPDF('test.pdf'),
      MediaUploadError.fileTooLarge('test.mp4', 150000000, 100000000),
      NetworkError.connectionLost(),
      PermissionError.accessDenied('document', 'view'),
      AnnotationError.invalidPosition(100, 200, 50, 50),
      PageLoadError.pageNotFound('doc123', 5),
      SecurityError.drmViolation('test'),
      ValidationError.missingField('test'),
    ];

    it('should not contain technical jargon in user-facing messages', () => {
      allErrors.forEach(error => {
        const { message } = getUserFriendlyMessage(error);
        
        // Should not contain technical terms
        expect(message).not.toMatch(/stack trace/i);
        expect(message).not.toMatch(/null pointer/i);
        expect(message).not.toMatch(/undefined reference/i);
        expect(message).not.toMatch(/\[object Object\]/);
      });
    });

    it('should not contain undefined or null in messages', () => {
      allErrors.forEach(error => {
        const { title, message } = getUserFriendlyMessage(error);
        
        expect(title).not.toContain('undefined');
        expect(title).not.toContain('null');
        expect(message).not.toContain('undefined');
        expect(message).not.toContain('null');
      });
    });

    it('should provide action labels for retryable errors', () => {
      const retryableErrors = allErrors.filter(isRetryableError);
      
      retryableErrors.forEach(error => {
        const { actionLabel } = getUserFriendlyMessage(error);
        expect(actionLabel).toBeTruthy();
        expect(actionLabel).toMatch(/try|retry/i);
      });
    });

    it('should have reasonable message length', () => {
      allErrors.forEach(error => {
        const { message } = getUserFriendlyMessage(error);
        
        // Message should be between 10 and 200 characters
        expect(message.length).toBeGreaterThan(10);
        expect(message.length).toBeLessThan(200);
      });
    });

    it('should use proper capitalization', () => {
      allErrors.forEach(error => {
        const { title, message } = getUserFriendlyMessage(error);
        
        // Title should start with capital letter
        expect(title[0]).toMatch(/[A-Z]/);
        
        // Message should start with capital letter
        expect(message[0]).toMatch(/[A-Z]/);
      });
    });

    it('should end with proper punctuation', () => {
      allErrors.forEach(error => {
        const { message } = getUserFriendlyMessage(error);
        
        // Message should end with period or other punctuation
        if (!message[message.length - 1].match(/[.!?]/)) {
          console.log('Missing punctuation:', error.constructor.name, message);
        }
        expect(message[message.length - 1]).toMatch(/[.!?]/);
      });
    });
  });

  describe('Error Context', () => {
    it('should include relevant context in error objects', () => {
      const error = PDFConversionError.pageLimitExceeded('test.pdf', 600, 500);
      
      expect(error.context).toBeDefined();
      expect(error.context?.filename).toBe('test.pdf');
      expect(error.context?.pageCount).toBe(600);
      expect(error.context?.maxPages).toBe(500);
    });

    it('should include error reason in context', () => {
      const error = MediaUploadError.fileTooLarge('test.mp4', 150000000, 100000000);
      
      expect(error.context?.reason).toBe('file_too_large');
    });

    it('should include timestamp', () => {
      const error = NetworkError.connectionLost();
      
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});

describe('Error Message Localization Readiness', () => {
  it('should have error codes for localization', () => {
    const error = PDFConversionError.invalidPDF('test.pdf');
    
    expect(error.code).toBe('PDF_CONVERSION_ERROR');
    expect(error.context?.reason).toBe('invalid_format');
  });

  it('should separate message template from values', () => {
    const error = MediaUploadError.fileTooLarge('test.mp4', 150000000, 100000000);
    
    // Context should contain the values separately
    expect(error.context?.size).toBeDefined();
    expect(error.context?.maxSize).toBeDefined();
    expect(error.context?.filename).toBeDefined();
  });
});

describe('Error Accessibility', () => {
  it('should provide screen-reader friendly messages', () => {
    const error = PDFConversionError.pageLimitExceeded('test.pdf', 600, 500);
    const { message } = getUserFriendlyMessage(error);
    
    // Should not use symbols that screen readers can't interpret
    expect(message).not.toMatch(/[→←↑↓]/);
    expect(message).not.toMatch(/[✓✗]/);
  });

  it('should use clear, simple language', () => {
    const error = NetworkError.connectionLost();
    const { message } = getUserFriendlyMessage(error);
    
    // Should use common words
    expect(message).toMatch(/connection|internet|network/i);
    
    // Should not use complex technical terms
    expect(message).not.toMatch(/TCP|HTTP|socket/i);
  });
});
