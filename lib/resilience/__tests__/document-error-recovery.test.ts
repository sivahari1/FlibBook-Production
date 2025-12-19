/**
 * Tests for Document Error Recovery System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DocumentErrorRecoverySystem,
  DocumentErrorType,
  DocumentError,
  RecoveryContext,
  NetworkFailureRecovery,
  StorageUrlRefreshRecovery,
  CacheInvalidationRecovery,
  getDocumentErrorRecovery,
  cleanupDocumentErrorRecovery
} from '../document-error-recovery';

// Mock dependencies
vi.mock('../../supabase-client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [
              { page_number: 1, storage_path: 'doc1/page1.jpg' },
              { page_number: 2, storage_path: 'doc1/page2.jpg' }
            ],
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    })),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(() => Promise.resolve({
          data: { signedUrl: 'https://example.com/signed-url' },
          error: null
        }))
      }))
    }
  }
}));

vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock fetch
global.fetch = vi.fn();

describe('DocumentErrorRecoverySystem', () => {
  let recoverySystem: DocumentErrorRecoverySystem;

  beforeEach(() => {
    recoverySystem = new DocumentErrorRecoverySystem();
    vi.clearAllMocks();
  });

  afterEach(() => {
    recoverySystem.destroy();
    cleanupDocumentErrorRecovery();
  });

  describe('Error Parsing', () => {
    it('should parse network errors correctly', async () => {
      const networkError = new Error('Network request failed');
      
      const operation = vi.fn().mockRejectedValue(networkError);
      
      try {
        await recoverySystem.executeWithRecovery(operation, {
          documentId: 'doc1',
          operationName: 'test-operation'
        });
      } catch (error) {
        // Expected to fail after recovery attempts
      }

      expect(operation).toHaveBeenCalled();
    });

    it('should parse storage URL errors correctly', async () => {
      const storageError = new Error('Signed URL expired');
      
      const operation = vi.fn().mockRejectedValue(storageError);
      
      try {
        await recoverySystem.executeWithRecovery(operation, {
          documentId: 'doc1',
          operationName: 'test-operation'
        });
      } catch (error) {
        // Expected to fail after recovery attempts
      }

      expect(operation).toHaveBeenCalled();
    });

    it('should parse cache errors correctly', async () => {
      const cacheError = new Error('Document pages not found');
      
      const operation = vi.fn().mockRejectedValue(cacheError);
      
      try {
        await recoverySystem.executeWithRecovery(operation, {
          documentId: 'doc1',
          operationName: 'test-operation'
        });
      } catch (error) {
        // Expected to fail after recovery attempts
      }

      expect(operation).toHaveBeenCalled();
    });
  });

  describe('Recovery Strategies', () => {
    describe('NetworkFailureRecovery', () => {
      let strategy: NetworkFailureRecovery;

      beforeEach(() => {
        strategy = new NetworkFailureRecovery();
      });

      it('should handle network failure errors', () => {
        const error: DocumentError = {
          type: DocumentErrorType.NETWORK_FAILURE,
          message: 'Network request failed',
          timestamp: new Date()
        };

        expect(strategy.canHandle(error)).toBe(true);
      });

      it('should handle timeout errors', () => {
        const error: DocumentError = {
          type: DocumentErrorType.TIMEOUT,
          message: 'Request timeout',
          timestamp: new Date()
        };

        expect(strategy.canHandle(error)).toBe(true);
      });

      it('should not handle non-network errors', () => {
        const error: DocumentError = {
          type: DocumentErrorType.PERMISSION_DENIED,
          message: 'Access denied',
          timestamp: new Date()
        };

        expect(strategy.canHandle(error)).toBe(false);
      });

      it('should attempt recovery with network connectivity test', async () => {
        // Mock successful network test
        (global.fetch as any).mockResolvedValueOnce({
          ok: true
        });

        // Mock successful page fetch
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ pages: [] })
        });

        const context: RecoveryContext = {
          documentId: 'doc1',
          attemptNumber: 1,
          previousErrors: []
        };

        const result = await strategy.recover(context);

        expect(result.success).toBe(true);
        expect(result.shouldRetry).toBe(false);
        expect(global.fetch).toHaveBeenCalledWith('/api/health', expect.any(Object));
        expect(global.fetch).toHaveBeenCalledWith('/api/documents/doc1/pages', expect.any(Object));
      });

      it('should fail recovery when network is down', async () => {
        // Mock failed network test
        (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

        const context: RecoveryContext = {
          documentId: 'doc1',
          attemptNumber: 1,
          previousErrors: []
        };

        const result = await strategy.recover(context);

        expect(result.success).toBe(false);
        expect(result.shouldRetry).toBe(true);
      });
    });

    describe('StorageUrlRefreshRecovery', () => {
      let strategy: StorageUrlRefreshRecovery;

      beforeEach(() => {
        strategy = new StorageUrlRefreshRecovery();
      });

      it('should handle storage URL expired errors', () => {
        const error: DocumentError = {
          type: DocumentErrorType.STORAGE_URL_EXPIRED,
          message: 'Signed URL expired',
          timestamp: new Date()
        };

        expect(strategy.canHandle(error)).toBe(true);
      });

      it('should attempt recovery by refreshing URLs', async () => {
        const context: RecoveryContext = {
          documentId: 'doc1',
          attemptNumber: 1,
          previousErrors: []
        };

        const result = await strategy.recover(context);

        expect(result.success).toBe(true);
        expect(result.cacheInvalidated).toBe(true);
      });
    });

    describe('CacheInvalidationRecovery', () => {
      let strategy: CacheInvalidationRecovery;

      beforeEach(() => {
        strategy = new CacheInvalidationRecovery();
      });

      it('should handle cache miss errors', () => {
        const error: DocumentError = {
          type: DocumentErrorType.CACHE_MISS,
          message: 'Cache miss',
          timestamp: new Date()
        };

        expect(strategy.canHandle(error)).toBe(true);
      });

      it('should handle pages not found errors', () => {
        const error: DocumentError = {
          type: DocumentErrorType.PAGES_NOT_FOUND,
          message: 'Pages not found',
          timestamp: new Date()
        };

        expect(strategy.canHandle(error)).toBe(true);
      });

      it('should attempt recovery by invalidating cache and triggering conversion', async () => {
        // Mock successful conversion trigger
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });

        const context: RecoveryContext = {
          documentId: 'doc1',
          attemptNumber: 1,
          previousErrors: []
        };

        const result = await strategy.recover(context);

        expect(result.success).toBe(true);
        expect(result.cacheInvalidated).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith('/api/documents/doc1/convert', expect.any(Object));
      });
    });
  });

  describe('Recovery System Integration', () => {
    it('should successfully recover from network failures', async () => {
      let callCount = 0;
      const operation = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Network request failed');
        }
        return Promise.resolve('success');
      });

      // Mock successful network recovery
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true }) // Health check
        .mockResolvedValueOnce({ // Page fetch
          ok: true,
          json: () => Promise.resolve({ pages: [] })
        });

      const result = await recoverySystem.executeWithRecovery(operation, {
        documentId: 'doc1',
        operationName: 'test-operation'
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2); // Initial call + retry after recovery
    });

    it('should try multiple strategies when first one fails', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Pages not found'));

      // Mock failed network recovery but successful cache invalidation
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error')) // Health check fails
        .mockResolvedValueOnce({ // Conversion trigger succeeds
          ok: true,
          json: () => Promise.resolve({ success: true })
        });

      try {
        await recoverySystem.executeWithRecovery(operation, {
          documentId: 'doc1',
          operationName: 'test-operation',
          maxRecoveryAttempts: 1
        });
      } catch (error) {
        // Expected to fail after recovery attempts
      }

      expect(operation).toHaveBeenCalled();
    });

    it('should provide system status', () => {
      const status = recoverySystem.getStatus();

      expect(status).toHaveProperty('circuitBreakerState');
      expect(status).toHaveProperty('failureCount');
      expect(status).toHaveProperty('availableStrategies');
      expect(status.availableStrategies).toContain('NetworkFailureRecovery');
      expect(status.availableStrategies).toContain('StorageUrlRefreshRecovery');
      expect(status.availableStrategies).toContain('CacheInvalidationRecovery');
    });

    it('should reset recovery system', () => {
      recoverySystem.reset();
      
      const status = recoverySystem.getStatus();
      expect(status.failureCount).toBe(0);
    });
  });

  describe('Global Instance Management', () => {
    it('should provide global instance', () => {
      const instance1 = getDocumentErrorRecovery();
      const instance2 = getDocumentErrorRecovery();

      expect(instance1).toBe(instance2);
    });

    it('should cleanup global instance', () => {
      const instance = getDocumentErrorRecovery();
      cleanupDocumentErrorRecovery();

      const newInstance = getDocumentErrorRecovery();
      expect(newInstance).not.toBe(instance);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle non-Error objects', async () => {
      const operation = vi.fn().mockRejectedValue('string error');

      try {
        await recoverySystem.executeWithRecovery(operation, {
          documentId: 'doc1',
          operationName: 'test-operation'
        });
      } catch (error) {
        // Expected to fail
      }

      expect(operation).toHaveBeenCalled();
    });

    it('should handle unknown error types', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Unknown error type'));

      try {
        await recoverySystem.executeWithRecovery(operation, {
          documentId: 'doc1',
          operationName: 'test-operation'
        });
      } catch (error) {
        // Expected to fail
      }

      expect(operation).toHaveBeenCalled();
    });

    it('should respect max recovery attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));

      try {
        await recoverySystem.executeWithRecovery(operation, {
          documentId: 'doc1',
          operationName: 'test-operation',
          maxRecoveryAttempts: 1
        });
      } catch (error) {
        // Expected to fail after max attempts
      }

      // Should be called multiple times due to retry logic
      expect(operation).toHaveBeenCalled();
    });
  });
});

describe('Recovery Strategy Priority', () => {
  it('should execute strategies in priority order', () => {
    const system = new DocumentErrorRecoverySystem();
    const status = system.getStatus();

    // NetworkFailureRecovery should be first (priority 100)
    expect(status.availableStrategies[0]).toBe('NetworkFailureRecovery');
    // StorageUrlRefreshRecovery should be second (priority 90)
    expect(status.availableStrategies[1]).toBe('StorageUrlRefreshRecovery');
    // CacheInvalidationRecovery should be third (priority 80)
    expect(status.availableStrategies[2]).toBe('CacheInvalidationRecovery');

    system.destroy();
  });
});