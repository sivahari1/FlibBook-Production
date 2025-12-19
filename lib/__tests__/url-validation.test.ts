/**
 * Unit tests for URL validation and fallback mechanisms
 * 
 * Tests for task 8.2: Add URL validation and fallback mechanisms
 * Requirements: 3.1, 3.2, 3.3
 */

import {
  validateURL,
  validateURLWithFallbacks,
  validateFirstValidURL,
  getUserFriendlyURLError,
  DEFAULT_FALLBACK_STRATEGIES,
  URLValidationResult,
  URLValidationContext,
  FallbackStrategy
} from '../url-validation';
import { ContentType } from '../types/content';

// Mock fetch globally
global.fetch = jest.fn();

// Mock storage functions
jest.mock('../storage', () => ({
  getSignedUrl: jest.fn(),
  getBucketForContentType: jest.fn(() => 'documents')
}));

import { getSignedUrl } from '../storage';

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

describe('URL Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default environment
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  });

  describe('validateURL', () => {
    it('should validate a working URL successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://example.com/test.pdf'
      } as Response);

      const result = await validateURL('https://example.com/test.pdf');

      expect(result.isValid).toBe(true);
      expect(result.url).toBe('https://example.com/test.pdf');
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid URL format', async () => {
      const result = await validateURL('not-a-url');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid URL format');
    });

    it('should reject URLs with placeholder values', async () => {
      const result = await validateURL('https://example.com/undefined/test.pdf');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('placeholder or undefined values');
    });

    it('should handle 404 errors appropriately', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      const result = await validateURL('https://example.com/missing.pdf');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('URL not found (404)');
    });

    it('should handle 403 errors appropriately', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      } as Response);

      const result = await validateURL('https://example.com/forbidden.pdf');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Access denied (403)');
    });

    it('should retry on server errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          url: 'https://example.com/test.pdf'
        } as Response);

      const result = await validateURL('https://example.com/test.pdf', { maxRetries: 2 });

      expect(result.isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors with retries', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          url: 'https://example.com/test.pdf'
        } as Response);

      const result = await validateURL('https://example.com/test.pdf', { maxRetries: 2 });

      expect(result.isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AbortError')), 100)
        )
      );

      const result = await validateURL('https://example.com/slow.pdf', { 
        timeout: 50,
        maxRetries: 1 
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('Fallback Strategies', () => {
    describe('regenerate-signed-url strategy', () => {
      const strategy = DEFAULT_FALLBACK_STRATEGIES.find(s => s.name === 'regenerate-signed-url')!;

      it('should handle expired URL errors', () => {
        const error = new Error('Access denied (403): The URL may have expired');
        const context: URLValidationContext = {
          originalUrl: 'https://example.com/expired.pdf',
          documentId: 'doc-123',
          storagePath: 'user/doc.pdf',
          contentType: ContentType.PDF,
          retryCount: 0,
          maxRetries: 3
        };

        expect(strategy.canHandle(error, context)).toBe(true);
      });

      it('should not handle errors without storage path', () => {
        const error = new Error('Access denied (403)');
        const context: URLValidationContext = {
          originalUrl: 'https://example.com/expired.pdf',
          documentId: 'doc-123',
          retryCount: 0,
          maxRetries: 3
        };

        expect(strategy.canHandle(error, context)).toBe(false);
      });

      it('should regenerate signed URL successfully', async () => {
        mockGetSignedUrl.mockResolvedValueOnce({
          url: 'https://storage.supabase.co/new-signed-url'
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          url: 'https://storage.supabase.co/new-signed-url'
        } as Response);

        const context: URLValidationContext = {
          originalUrl: 'https://example.com/expired.pdf',
          documentId: 'doc-123',
          storagePath: 'user/doc.pdf',
          contentType: ContentType.PDF,
          retryCount: 0,
          maxRetries: 3
        };

        const result = await strategy.execute(context);

        expect(result.isValid).toBe(true);
        expect(result.url).toBe('https://storage.supabase.co/new-signed-url');
        expect(result.fallbackUsed).toBe(true);
        expect(result.fallbackStrategy).toBe('regenerate-signed-url');
      });

      it('should handle signed URL generation failure', async () => {
        mockGetSignedUrl.mockResolvedValueOnce({
          error: 'Storage service unavailable'
        });

        const context: URLValidationContext = {
          originalUrl: 'https://example.com/expired.pdf',
          documentId: 'doc-123',
          storagePath: 'user/doc.pdf',
          contentType: ContentType.PDF,
          retryCount: 0,
          maxRetries: 3
        };

        const result = await strategy.execute(context);

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Failed to regenerate signed URL');
      });
    });

    describe('alternative-bucket strategy', () => {
      const strategy = DEFAULT_FALLBACK_STRATEGIES.find(s => s.name === 'alternative-bucket')!;

      it('should handle 404 errors', () => {
        const error = new Error('URL not found (404)');
        const context: URLValidationContext = {
          originalUrl: 'https://example.com/missing.pdf',
          documentId: 'doc-123',
          storagePath: 'user/doc.pdf',
          retryCount: 0,
          maxRetries: 3
        };

        expect(strategy.canHandle(error, context)).toBe(true);
      });

      it('should try alternative buckets', async () => {
        mockGetSignedUrl
          .mockResolvedValueOnce({ error: 'Not found' }) // documents bucket
          .mockResolvedValueOnce({ url: 'https://storage.supabase.co/pdfs-bucket-url' }) // pdfs bucket
          .mockResolvedValueOnce({ error: 'Not found' }); // files bucket

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          url: 'https://storage.supabase.co/pdfs-bucket-url'
        } as Response);

        const context: URLValidationContext = {
          originalUrl: 'https://example.com/missing.pdf',
          documentId: 'doc-123',
          storagePath: 'user/doc.pdf',
          retryCount: 0,
          maxRetries: 3
        };

        const result = await strategy.execute(context);

        expect(result.isValid).toBe(true);
        expect(result.url).toBe('https://storage.supabase.co/pdfs-bucket-url');
        expect(result.fallbackStrategy).toBe('alternative-bucket-pdfs');
      });
    });

    describe('direct-storage-path strategy', () => {
      const strategy = DEFAULT_FALLBACK_STRATEGIES.find(s => s.name === 'direct-storage-path')!;

      it('should construct direct storage URL', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          url: 'https://test.supabase.co/storage/v1/object/public/documents/user/doc.pdf'
        } as Response);

        const context: URLValidationContext = {
          originalUrl: 'https://example.com/failed.pdf',
          documentId: 'doc-123',
          storagePath: 'user/doc.pdf',
          retryCount: 0,
          maxRetries: 3
        };

        const result = await strategy.execute(context);

        expect(result.isValid).toBe(true);
        expect(result.url).toBe('https://test.supabase.co/storage/v1/object/public/documents/user/doc.pdf');
        expect(result.fallbackStrategy).toBe('direct-storage-path');
      });

      it('should handle missing Supabase URL', async () => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;

        const context: URLValidationContext = {
          originalUrl: 'https://example.com/failed.pdf',
          documentId: 'doc-123',
          storagePath: 'user/doc.pdf',
          retryCount: 0,
          maxRetries: 3
        };

        const result = await strategy.execute(context);

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Supabase URL not configured');
      });
    });
  });

  describe('validateURLWithFallbacks', () => {
    it('should return original URL if valid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://example.com/test.pdf'
      } as Response);

      const result = await validateURLWithFallbacks(
        'https://example.com/test.pdf',
        { documentId: 'doc-123' }
      );

      expect(result.isValid).toBe(true);
      expect(result.url).toBe('https://example.com/test.pdf');
      expect(result.fallbackUsed).toBeUndefined();
    });

    it('should use fallback strategies when original URL fails', async () => {
      // Original URL fails with 403
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      } as Response);

      // Regenerate signed URL succeeds
      mockGetSignedUrl.mockResolvedValueOnce({
        url: 'https://storage.supabase.co/new-signed-url'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://storage.supabase.co/new-signed-url'
      } as Response);

      const result = await validateURLWithFallbacks(
        'https://example.com/expired.pdf',
        {
          documentId: 'doc-123',
          storagePath: 'user/doc.pdf',
          contentType: ContentType.PDF
        }
      );

      expect(result.isValid).toBe(true);
      expect(result.url).toBe('https://storage.supabase.co/new-signed-url');
      expect(result.fallbackUsed).toBe(true);
      expect(result.fallbackStrategy).toBe('regenerate-signed-url');
    });

    it('should try multiple fallback strategies', async () => {
      // Original URL fails with 404
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      // Alternative bucket strategy fails
      mockGetSignedUrl
        .mockResolvedValueOnce({ error: 'Not found' })
        .mockResolvedValueOnce({ error: 'Not found' })
        .mockResolvedValueOnce({ error: 'Not found' });

      // Direct storage path succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://test.supabase.co/storage/v1/object/public/documents/user/doc.pdf'
      } as Response);

      const result = await validateURLWithFallbacks(
        'https://example.com/missing.pdf',
        {
          documentId: 'doc-123',
          storagePath: 'user/doc.pdf'
        }
      );

      expect(result.isValid).toBe(true);
      expect(result.fallbackStrategy).toBe('direct-storage-path');
    });

    it('should fail when all strategies are exhausted', async () => {
      // Original URL fails
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      // All fallback strategies fail
      mockGetSignedUrl.mockResolvedValue({ error: 'Storage unavailable' });

      const result = await validateURLWithFallbacks(
        'https://example.com/broken.pdf',
        {
          documentId: 'doc-123',
          storagePath: 'user/doc.pdf'
        }
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('All fallback strategies exhausted');
    });
  });

  describe('validateFirstValidURL', () => {
    it('should return first valid URL', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          url: 'https://example.com/backup.pdf'
        } as Response);

      const result = await validateFirstValidURL(
        [
          'https://example.com/primary.pdf',
          'https://example.com/backup.pdf'
        ],
        { documentId: 'doc-123' }
      );

      expect(result.isValid).toBe(true);
      expect(result.url).toBe('https://example.com/backup.pdf');
      expect(result.fallbackUsed).toBe(true);
      expect(result.fallbackStrategy).toBe('alternative-url-1');
    });

    it('should fail when no URLs are provided', async () => {
      const result = await validateFirstValidURL([], { documentId: 'doc-123' });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('No URLs provided');
    });

    it('should fail when all URLs are invalid', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      const result = await validateFirstValidURL(
        [
          'https://example.com/missing1.pdf',
          'https://example.com/missing2.pdf'
        ],
        { documentId: 'doc-123' }
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('All URLs failed validation');
    });
  });

  describe('getUserFriendlyURLError', () => {
    it('should return empty string for valid URLs', () => {
      const result: URLValidationResult = { isValid: true, url: 'https://example.com/test.pdf' };
      expect(getUserFriendlyURLError(result)).toBe('');
    });

    it('should return user-friendly message for invalid URL format', () => {
      const result: URLValidationResult = { 
        isValid: false, 
        error: 'Invalid URL format: URL cannot be parsed' 
      };
      const message = getUserFriendlyURLError(result);
      expect(message).toContain('document link is corrupted');
    });

    it('should return user-friendly message for expired URLs', () => {
      const result: URLValidationResult = { 
        isValid: false, 
        error: 'Access denied (403): The URL may have expired' 
      };
      const message = getUserFriendlyURLError(result);
      expect(message).toContain('access link has expired');
    });

    it('should return user-friendly message for not found errors', () => {
      const result: URLValidationResult = { 
        isValid: false, 
        error: 'URL not found (404): The document may have been moved' 
      };
      const message = getUserFriendlyURLError(result);
      expect(message).toContain('could not be found');
    });

    it('should return user-friendly message for timeout errors', () => {
      const result: URLValidationResult = { 
        isValid: false, 
        error: 'URL validation timeout: The URL took too long to respond' 
      };
      const message = getUserFriendlyURLError(result);
      expect(message).toContain('taking too long to load');
    });

    it('should return user-friendly message for network errors', () => {
      const result: URLValidationResult = { 
        isValid: false, 
        error: 'Network error: Unable to reach the URL' 
      };
      const message = getUserFriendlyURLError(result);
      expect(message).toContain('check your internet connection');
    });

    it('should return generic message for unknown errors', () => {
      const result: URLValidationResult = { 
        isValid: false, 
        error: 'Some unknown error occurred' 
      };
      const message = getUserFriendlyURLError(result);
      expect(message).toContain('Unable to access the document');
    });
  });

  describe('Custom Fallback Strategies', () => {
    it('should use custom fallback strategies', async () => {
      const customStrategy: FallbackStrategy = {
        name: 'custom-test-strategy',
        priority: 0, // Highest priority
        canHandle: () => true,
        execute: async () => ({
          isValid: true,
          url: 'https://custom.example.com/test.pdf',
          fallbackUsed: true,
          fallbackStrategy: 'custom-test-strategy'
        })
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      const result = await validateURLWithFallbacks(
        'https://example.com/missing.pdf',
        { documentId: 'doc-123' },
        { fallbackStrategies: [customStrategy, ...DEFAULT_FALLBACK_STRATEGIES] }
      );

      expect(result.isValid).toBe(true);
      expect(result.url).toBe('https://custom.example.com/test.pdf');
      expect(result.fallbackStrategy).toBe('custom-test-strategy');
    });
  });
});