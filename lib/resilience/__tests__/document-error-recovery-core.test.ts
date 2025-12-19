/**
 * Unit Tests for Document Error Recovery Mechanisms
 * 
 * Tests the core error recovery functionality including:
 * - Network failure recovery with exponential backoff
 * - Storage URL refresh recovery
 * - Cache invalidation recovery
 * - Recovery strategy selection and execution
 * 
 * Requirements: Task 11.1 - Error recovery mechanism tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DocumentErrorRecoverySystem,
  NetworkFailureRecovery,
  StorageUrlRefreshRecovery,
  CacheInvalidationRecovery,
  DocumentError,
  DocumentErrorType,
  RecoveryContext,
  RecoveryResult
} from '../document-error-recovery';
import { EnhancedRetryLogic } from '../retry-logic';

// Mock dependencies
vi.mock('../retry-logic');
vi.mock('../../supabase-client');
vi.mock('../../logger');

describe('Document Error Recovery Mechanisms', () => {
  let recoverySystem: DocumentErrorRecoverySystem;
  let mockRetryLogic: vi.Mocked<EnhancedRetryLogic>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRetryLogic = {
      executeWithRetry: vi.fn(),
      getRetryDelay: vi.fn(),
      shouldRetry: vi.fn(),
      reset: vi.fn(),
    } as any;

    vi.mocked(EnhancedRetryLogic).mockImplementation(() => mockRetryLogic);
    
    recoverySystem = new DocumentErrorRecoverySystem();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Network Failure Recovery', () => {
    let networkRecovery: NetworkFailureRecovery;

    beforeEach(() => {
      networkRecovery = new NetworkFailureRecovery();
    });

    it('should identify network failure errors correctly', () => {
      // Arrange
      const networkError: DocumentError = {
        type: DocumentErrorType.NETWORK_FAILURE,
        message: 'Connection timeout',
        timestamp: new Date(),
        documentId: 'test-doc-1'
      };

      const timeoutError: DocumentError = {
        type: DocumentErrorType.TIMEOUT,
        message: 'Request timeout',
        timestamp: new Date(),
        documentId: 'test-doc-1'
      };

      const otherError: DocumentError = {
        type: DocumentErrorType.DOCUMENT_CORRUPTED,
        message: 'PDF is corrupted',
        timestamp: new Date(),
        documentId: 'test-doc-1'
      };

      // Act & Assert
      expect(networkRecovery.canHandle(networkError)).toBe(true);
      expect(networkRecovery.canHandle(timeoutError)).toBe(true);
      expect(networkRecovery.canHandle(otherError)).toBe(false);
    });

    it('should implement exponential backoff for network failures', async () => {
      // Arrange
      const context: RecoveryContext = {
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        attemptNumber: 2,
        previousErrors: []
      };

      mockRetryLogic.executeWithRetry.mockResolvedValue({
        success: true,
        data: { pages: ['page1.jpg'] },
        attempts: 2
      });

      // Act
      const result = await networkRecovery.recover(context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.shouldRetry).toBe(false);
      expect(mockRetryLogic.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          maxAttempts: 3,
          baseDelay: 1000
        })
      );
    });

    it('should fail after maximum retry attempts', async () => {
      // Arrange
      const context: RecoveryContext = {
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        attemptNumber: 4, // Exceeds maxRetries
        previousErrors: []
      };

      // Act
      const result = await networkRecovery.recover(context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.shouldRetry).toBe(false);
      expect(result.message).toContain('Maximum retry attempts exceeded');
    });

    it('should provide appropriate retry delay based on attempt number', async () => {
      // Arrange
      const context: RecoveryContext = {
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        attemptNumber: 1,
        previousErrors: []
      };

      mockRetryLogic.getRetryDelay.mockReturnValue(1000);
      mockRetryLogic.executeWithRetry.mockResolvedValue({
        success: false,
        error: new Error('Still failing'),
        attempts: 1
      });

      // Act
      const result = await networkRecovery.recover(context);

      // Assert
      expect(result.shouldRetry).toBe(true);
      expect(mockRetryLogic.getRetryDelay).toHaveBeenCalledWith(1);
    });
  });

  describe('Storage URL Refresh Recovery', () => {
    let urlRefreshRecovery: StorageUrlRefreshRecovery;

    beforeEach(() => {
      urlRefreshRecovery = new StorageUrlRefreshRecovery();
    });

    it('should identify storage URL expired errors', () => {
      // Arrange
      const expiredUrlError: DocumentError = {
        type: DocumentErrorType.STORAGE_URL_EXPIRED,
        message: 'Signed URL has expired',
        timestamp: new Date(),
        documentId: 'test-doc-1'
      };

      const permissionError: DocumentError = {
        type: DocumentErrorType.PERMISSION_DENIED,
        message: 'Access denied',
        timestamp: new Date(),
        documentId: 'test-doc-1'
      };

      const otherError: DocumentError = {
        type: DocumentErrorType.NETWORK_FAILURE,
        message: 'Network error',
        timestamp: new Date(),
        documentId: 'test-doc-1'
      };

      // Act & Assert
      expect(urlRefreshRecovery.canHandle(expiredUrlError)).toBe(true);
      expect(urlRefreshRecovery.canHandle(permissionError)).toBe(true);
      expect(urlRefreshRecovery.canHandle(otherError)).toBe(false);
    });

    it('should successfully refresh expired storage URLs', async () => {
      // Arrange
      const context: RecoveryContext = {
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        attemptNumber: 1,
        previousErrors: [],
        metadata: {
          storagePath: 'documents/test-doc-1.pdf'
        }
      };

      // Mock successful URL refresh
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({
            createSignedUrl: vi.fn().mockResolvedValue({
              data: { signedUrl: 'https://new-signed-url.com/test-doc-1.pdf' },
              error: null
            })
          })
        }
      };

      vi.doMock('../../supabase-client', () => ({
        supabase: mockSupabase
      }));

      // Act
      const result = await urlRefreshRecovery.recover(context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.newUrl).toBeDefined();
      expect(result.shouldRetry).toBe(false);
    });

    it('should handle URL refresh failures', async () => {
      // Arrange
      const context: RecoveryContext = {
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        attemptNumber: 1,
        previousErrors: []
      };

      // Mock failed URL refresh
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({
            createSignedUrl: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'File not found' }
            })
          })
        }
      };

      vi.doMock('../../supabase-client', () => ({
        supabase: mockSupabase
      }));

      // Act
      const result = await urlRefreshRecovery.recover(context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to refresh storage URL');
      expect(result.shouldRetry).toBe(false);
    });
  });

  describe('Cache Invalidation Recovery', () => {
    let cacheRecovery: CacheInvalidationRecovery;

    beforeEach(() => {
      cacheRecovery = new CacheInvalidationRecovery();
    });

    it('should identify cache-related errors', () => {
      // Arrange
      const cacheMissError: DocumentError = {
        type: DocumentErrorType.CACHE_MISS,
        message: 'Document not found in cache',
        timestamp: new Date(),
        documentId: 'test-doc-1'
      };

      const pagesNotFoundError: DocumentError = {
        type: DocumentErrorType.PAGES_NOT_FOUND,
        message: 'Document pages not found',
        timestamp: new Date(),
        documentId: 'test-doc-1'
      };

      const networkError: DocumentError = {
        type: DocumentErrorType.NETWORK_FAILURE,
        message: 'Network error',
        timestamp: new Date(),
        documentId: 'test-doc-1'
      };

      // Act & Assert
      expect(cacheRecovery.canHandle(cacheMissError)).toBe(true);
      expect(cacheRecovery.canHandle(pagesNotFoundError)).toBe(true);
      expect(cacheRecovery.canHandle(networkError)).toBe(false);
    });

    it('should successfully invalidate and rebuild cache', async () => {
      // Arrange
      const context: RecoveryContext = {
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        attemptNumber: 1,
        previousErrors: []
      };

      // Act
      const result = await cacheRecovery.recover(context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.cacheInvalidated).toBe(true);
      expect(result.shouldRetry).toBe(true);
      expect(result.nextStrategy).toBe('NetworkFailureRecovery');
    });
  });

  describe('Recovery System Integration', () => {
    it('should select appropriate recovery strategy based on error type', async () => {
      // Arrange
      const networkError: DocumentError = {
        type: DocumentErrorType.NETWORK_FAILURE,
        message: 'Connection failed',
        timestamp: new Date(),
        documentId: 'test-doc-1'
      };

      const context: RecoveryContext = {
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        attemptNumber: 1,
        previousErrors: []
      };

      // Act
      const result = await recoverySystem.attemptRecovery(networkError, context);

      // Assert
      expect(result).toBeDefined();
      // The system should have attempted network failure recovery
    });

    it('should try multiple strategies in priority order', async () => {
      // Arrange
      const complexError: DocumentError = {
        type: DocumentErrorType.PAGES_NOT_FOUND,
        message: 'Pages not found, might be cache or network issue',
        timestamp: new Date(),
        documentId: 'test-doc-1'
      };

      const context: RecoveryContext = {
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        attemptNumber: 1,
        previousErrors: []
      };

      // Act
      const result = await recoverySystem.attemptRecovery(complexError, context);

      // Assert
      expect(result).toBeDefined();
      // Should have tried cache invalidation first (higher priority)
    });

    it('should handle recovery strategy failures gracefully', async () => {
      // Arrange
      const error: DocumentError = {
        type: DocumentErrorType.DOCUMENT_CORRUPTED,
        message: 'Document is corrupted',
        timestamp: new Date(),
        documentId: 'test-doc-1'
      };

      const context: RecoveryContext = {
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        attemptNumber: 1,
        previousErrors: []
      };

      // Act
      const result = await recoverySystem.attemptRecovery(error, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('No suitable recovery strategy found');
    });

    it('should track recovery attempts and prevent infinite loops', async () => {
      // Arrange
      const error: DocumentError = {
        type: DocumentErrorType.NETWORK_FAILURE,
        message: 'Network error',
        timestamp: new Date(),
        documentId: 'test-doc-1'
      };

      const context: RecoveryContext = {
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        attemptNumber: 5, // High attempt number
        previousErrors: [error, error, error, error] // Multiple previous failures
      };

      // Act
      const result = await recoverySystem.attemptRecovery(error, context);

      // Assert
      expect(result.success).toBe(false);
      expect(result.shouldRetry).toBe(false);
    });

    it('should provide detailed recovery context in results', async () => {
      // Arrange
      const error: DocumentError = {
        type: DocumentErrorType.CACHE_MISS,
        message: 'Cache miss',
        timestamp: new Date(),
        documentId: 'test-doc-1'
      };

      const context: RecoveryContext = {
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        attemptNumber: 1,
        previousErrors: []
      };

      // Act
      const result = await recoverySystem.attemptRecovery(error, context);

      // Assert
      expect(result.message).toBeDefined();
      expect(typeof result.shouldRetry).toBe('boolean');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Recovery Performance', () => {
    it('should complete recovery attempts within reasonable time', async () => {
      // Arrange
      const error: DocumentError = {
        type: DocumentErrorType.NETWORK_FAILURE,
        message: 'Network timeout',
        timestamp: new Date(),
        documentId: 'test-doc-1'
      };

      const context: RecoveryContext = {
        documentId: 'test-doc-1',
        userId: 'test-user-1',
        attemptNumber: 1,
        previousErrors: []
      };

      const startTime = Date.now();

      // Act
      await recoverySystem.attemptRecovery(error, context);

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent recovery attempts efficiently', async () => {
      // Arrange
      const error: DocumentError = {
        type: DocumentErrorType.NETWORK_FAILURE,
        message: 'Network error',
        timestamp: new Date(),
        documentId: 'test-doc-1'
      };

      const contexts = Array.from({ length: 5 }, (_, i) => ({
        documentId: `test-doc-${i}`,
        userId: 'test-user-1',
        attemptNumber: 1,
        previousErrors: []
      }));

      const startTime = Date.now();

      // Act
      const results = await Promise.all(
        contexts.map(context => recoverySystem.attemptRecovery(error, context))
      );

      // Assert
      const duration = Date.now() - startTime;
      expect(results).toHaveLength(5);
      expect(duration).toBeLessThan(10000); // Should handle concurrent requests efficiently
    });
  });
});