/**
 * Error Handling Tests
 * 
 * Tests for comprehensive error handling system
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  FlipbookError,
  PDFConversionError,
  MediaUploadError,
  NetworkError,
  PermissionError,
  AnnotationError,
  PageLoadError,
  SecurityError,
  ValidationError,
  ErrorSeverity,
  getErrorSeverity,
  isFlipbookError,
  isPDFConversionError,
  isNetworkError,
} from '../flipbook-errors';
import {
  ErrorHandler,
  getUserFriendlyMessage,
  isRetryableError,
  getRetryDelay,
  retryOperation,
} from '../error-handler';

describe('Flipbook Errors', () => {
  describe('PDFConversionError', () => {
    it('should create invalid PDF error', () => {
      const error = PDFConversionError.invalidPDF('test.pdf');
      
      expect(error).toBeInstanceOf(PDFConversionError);
      expect(error).toBeInstanceOf(FlipbookError);
      expect(error.message).toContain('not a valid PDF');
      expect(error.context?.filename).toBe('test.pdf');
      expect(error.context?.reason).toBe('invalid_format');
    });

    it('should create corrupted PDF error', () => {
      const error = PDFConversionError.corruptedPDF('test.pdf');
      
      expect(error.message).toContain('corrupted');
      expect(error.context?.reason).toBe('corrupted');
    });

    it('should create conversion timeout error', () => {
      const error = PDFConversionError.conversionTimeout('test.pdf', 30000);
      
      expect(error.message).toContain('timed out');
      expect(error.context?.timeout).toBe(30000);
    });

    it('should create page limit exceeded error', () => {
      const error = PDFConversionError.pageLimitExceeded('test.pdf', 150, 100);
      
      expect(error.message).toContain('150 pages');
      expect(error.message).toContain('maximum of 100');
      expect(error.context?.pageCount).toBe(150);
      expect(error.context?.maxPages).toBe(100);
    });
  });

  describe('MediaUploadError', () => {
    it('should create invalid media type error', () => {
      const error = MediaUploadError.invalidMediaType(
        'test.exe',
        'application/x-msdownload',
        ['audio/mp3', 'audio/wav']
      );
      
      expect(error.message).toContain('not supported');
      expect(error.context?.mimeType).toBe('application/x-msdownload');
      expect(error.context?.allowedTypes).toEqual(['audio/mp3', 'audio/wav']);
    });

    it('should create file too large error', () => {
      const size = 50 * 1024 * 1024; // 50MB
      const maxSize = 10 * 1024 * 1024; // 10MB
      const error = MediaUploadError.fileTooLarge('test.mp3', size, maxSize);
      
      expect(error.message).toContain('50.00MB');
      expect(error.message).toContain('10.00MB');
      expect(error.context?.size).toBe(size);
    });

    it('should create storage quota exceeded error', () => {
      const error = MediaUploadError.storageQuotaExceeded('user-1', 1000, 500);
      
      expect(error.message).toContain('quota exceeded');
      expect(error.context?.userId).toBe('user-1');
      expect(error.context?.currentUsage).toBe(1000);
    });
  });

  describe('NetworkError', () => {
    it('should create connection lost error', () => {
      const error = NetworkError.connectionLost();
      
      expect(error.message).toContain('connection lost');
      expect(error.statusCode).toBe(503);
    });

    it('should create request timeout error', () => {
      const error = NetworkError.requestTimeout('/api/test', 5000);
      
      expect(error.message).toContain('timed out');
      expect(error.context?.url).toBe('/api/test');
      expect(error.context?.timeout).toBe(5000);
    });

    it('should create rate limit exceeded error', () => {
      const error = NetworkError.rateLimitExceeded(60);
      
      expect(error.message).toContain('Too many requests');
      expect(error.context?.retryAfter).toBe(60);
    });
  });

  describe('PermissionError', () => {
    it('should create access denied error', () => {
      const error = PermissionError.accessDenied('document', 'edit');
      
      expect(error.message).toContain("don't have permission");
      expect(error.message).toContain('edit');
      expect(error.statusCode).toBe(403);
    });

    it('should create annotation permission denied error', () => {
      const error = PermissionError.annotationPermissionDenied('doc-1', 'create');
      
      expect(error.message).toContain('annotations');
      expect(error.context?.documentId).toBe('doc-1');
      expect(error.context?.action).toBe('create');
    });

    it('should create session expired error', () => {
      const error = PermissionError.sessionExpired();
      
      expect(error.message).toContain('session has expired');
    });
  });

  describe('Error Severity', () => {
    it('should return CRITICAL for SecurityError', () => {
      const error = SecurityError.drmViolation('screenshot');
      expect(getErrorSeverity(error)).toBe(ErrorSeverity.CRITICAL);
    });

    it('should return HIGH for PermissionError', () => {
      const error = PermissionError.accessDenied('document', 'view');
      expect(getErrorSeverity(error)).toBe(ErrorSeverity.HIGH);
    });

    it('should return MEDIUM for PDFConversionError', () => {
      const error = PDFConversionError.invalidPDF('test.pdf');
      expect(getErrorSeverity(error)).toBe(ErrorSeverity.MEDIUM);
    });

    it('should return LOW for ValidationError', () => {
      const error = ValidationError.missingField('title');
      expect(getErrorSeverity(error)).toBe(ErrorSeverity.LOW);
    });
  });

  describe('Error Type Guards', () => {
    it('should identify FlipbookError', () => {
      const error = new FlipbookError('test', 'TEST_ERROR');
      expect(isFlipbookError(error)).toBe(true);
      expect(isFlipbookError(new Error('test'))).toBe(false);
    });

    it('should identify PDFConversionError', () => {
      const error = PDFConversionError.invalidPDF('test.pdf');
      expect(isPDFConversionError(error)).toBe(true);
      expect(isPDFConversionError(new Error('test'))).toBe(false);
    });

    it('should identify NetworkError', () => {
      const error = NetworkError.connectionLost();
      expect(isNetworkError(error)).toBe(true);
      expect(isNetworkError(new Error('test'))).toBe(false);
    });
  });
});

describe('Error Handler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler({
      enableConsoleLogging: false,
      enableRemoteReporting: false,
    });
  });

  describe('Error Handling', () => {
    it('should handle errors and create log entries', async () => {
      const error = new Error('Test error');
      await errorHandler.handle(error);

      const log = errorHandler.getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].error).toBe(error);
    });

    it('should track error frequency', async () => {
      const error1 = new Error('Test error');
      const error2 = new Error('Test error');
      
      await errorHandler.handle(error1);
      await errorHandler.handle(error2);

      expect(errorHandler.getErrorFrequency('Error')).toBe(2);
    });

    it('should limit error log size', async () => {
      const handler = new ErrorHandler({ maxErrorsInMemory: 5 });
      
      for (let i = 0; i < 10; i++) {
        await handler.handle(new Error(`Error ${i}`));
      }

      const log = handler.getErrorLog();
      expect(log).toHaveLength(5);
      expect(log[0].error.message).toBe('Error 5');
    });

    it('should call onError callback', async () => {
      const onError = jest.fn();
      const handler = new ErrorHandler({ onError });
      
      const error = new Error('Test error');
      await handler.handle(error);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          error,
        })
      );
    });

    it('should call onCriticalError for critical errors', async () => {
      const onCriticalError = jest.fn();
      const handler = new ErrorHandler({ onCriticalError });
      
      const error = SecurityError.drmViolation('test');
      await handler.handle(error);

      expect(onCriticalError).toHaveBeenCalled();
    });
  });

  describe('Error Statistics', () => {
    it('should provide error statistics', async () => {
      await errorHandler.handle(new Error('Error 1'));
      await errorHandler.handle(PDFConversionError.invalidPDF('test.pdf'));
      await errorHandler.handle(NetworkError.connectionLost());

      const stats = errorHandler.getErrorStats();
      
      expect(stats.total).toBe(3);
      expect(stats.byType['Error']).toBe(1);
      expect(stats.byType['PDFConversionError']).toBe(1);
      expect(stats.byType['NetworkError']).toBe(1);
    });

    it('should detect high error rates', async () => {
      for (let i = 0; i < 15; i++) {
        await errorHandler.handle(new Error('Test error'));
      }

      expect(errorHandler.isErrorRateHigh('Error', 10)).toBe(true);
      expect(errorHandler.isErrorRateHigh('Error', 20)).toBe(false);
    });
  });
});

describe('User-Friendly Messages', () => {
  it('should provide friendly message for PDF conversion error', () => {
    const error = PDFConversionError.invalidPDF('test.pdf');
    const message = getUserFriendlyMessage(error);

    expect(message.title).toBe('PDF Conversion Failed');
    expect(message.action).toBe('retry');
    expect(message.actionLabel).toBe('Try Again');
  });

  it('should provide friendly message for network error', () => {
    const error = NetworkError.connectionLost();
    const message = getUserFriendlyMessage(error);

    expect(message.title).toBe('Connection Error');
    expect(message.action).toBe('retry');
  });

  it('should provide friendly message for permission error', () => {
    const error = PermissionError.accessDenied('document', 'view');
    const message = getUserFriendlyMessage(error);

    expect(message.title).toBe('Access Denied');
    expect(message.action).toBe('contact');
  });

  it('should provide generic message for unknown errors', () => {
    const error = new Error('Unknown error');
    const message = getUserFriendlyMessage(error);

    expect(message.title).toBe('Unexpected Error');
    expect(message.message).toContain('unexpected error');
  });
});

describe('Retry Logic', () => {
  describe('isRetryableError', () => {
    it('should identify retryable network errors', () => {
      const error = NetworkError.connectionLost();
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify retryable conversion errors', () => {
      const error = PDFConversionError.conversionTimeout('test.pdf', 30000);
      expect(isRetryableError(error)).toBe(true);
    });

    it('should not retry permission errors', () => {
      const error = PermissionError.accessDenied('document', 'view');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff', () => {
      const error = NetworkError.connectionLost();
      
      const delay1 = getRetryDelay(error, 1);
      const delay2 = getRetryDelay(error, 2);
      const delay3 = getRetryDelay(error, 3);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThan(3000);
      
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThan(5000);
      
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThan(9000);
    });

    it('should cap delay at maximum', () => {
      const error = NetworkError.connectionLost();
      const delay = getRetryDelay(error, 10);
      
      expect(delay).toBeLessThanOrEqual(31000); // 30s max + 1s jitter
    });
  });

  describe('retryOperation', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      const operation = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw NetworkError.connectionLost();
        }
        return 'success';
      });

      const result = await retryOperation(operation, 3);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should call onRetry callback', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 2) {
          throw NetworkError.connectionLost();
        }
        return 'success';
      };

      const onRetry = jest.fn();
      await retryOperation(operation, 3, onRetry);

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(NetworkError));
    });

    it('should throw after max attempts', async () => {
      const operation = async () => {
        throw NetworkError.connectionLost();
      };

      await expect(retryOperation(operation, 3)).rejects.toThrow(NetworkError);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn(async () => {
        throw PermissionError.accessDenied('document', 'view');
      });

      await expect(retryOperation(operation, 3)).rejects.toThrow(PermissionError);
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});
