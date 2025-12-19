/**
 * Unit tests for DocumentCacheManager
 * 
 * Tests comprehensive caching functionality including:
 * - Multi-layer cache operations
 * - Cache optimization strategies
 * - Memory management
 * - Performance monitoring
 */

import { DocumentCacheManager, CacheConfig } from '../document-cache-manager';

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true,
});

// Mock console methods to avoid noise in tests
const mockConsoleLog = jest.fn();
const mockConsoleWarn = jest.fn();
global.console = {
  ...console,
  log: mockConsoleLog,
  warn: mockConsoleWarn,
};

describe('DocumentCacheManager', () => {
  let cacheManager: DocumentCacheManager;
  let mockConfig: Partial<CacheConfig>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
    
    mockConfig = {
      browserCacheTTL: 7 * 24 * 60 * 60, // 7 days
      browserCacheStrategy: 'conservative',
      memoryCacheSize: 10,
      memoryCacheTTL: 30 * 60 * 1000, // 30 minutes
      enableCacheInvalidation: true,
    };
    
    cacheManager = new DocumentCacheManager(mockConfig);
  });

  afterEach(() => {
    cacheManager.destroy();
  });

  describe('Cache Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultManager = new DocumentCacheManager();
      const stats = defaultManager.getCacheStats();
      
      expect(stats.browserCache.strategy).toBe('conservative');
      expect(stats.browserCache.ttl).toBe(7 * 24 * 60 * 60);
      
      defaultManager.destroy();
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig = {
        browserCacheStrategy: 'aggressive' as const,
        memoryCacheSize: 20,
      };
      
      const customManager = new DocumentCacheManager(customConfig);
      const stats = customManager.getCacheStats();
      
      expect(stats.browserCache.strategy).toBe('aggressive');
      
      customManager.destroy();
    });
  });

  describe('Browser Cache Headers', () => {
    it('should generate conservative cache headers', () => {
      const headers = cacheManager.getBrowserCacheHeaders('image/jpeg');
      
      expect(headers['Content-Type']).toBe('image/jpeg');
      expect(headers['Cache-Control']).toContain('public');
      expect(headers['Cache-Control']).toContain('max-age=604800'); // 7 days
      expect(headers['ETag']).toBeDefined();
    });

    it('should generate aggressive cache headers', () => {
      const aggressiveManager = new DocumentCacheManager({
        browserCacheStrategy: 'aggressive',
      });
      
      const headers = aggressiveManager.getBrowserCacheHeaders();
      
      expect(headers['Cache-Control']).toContain('immutable');
      expect(headers['Expires']).toBeDefined();
      
      aggressiveManager.destroy();
    });

    it('should generate minimal cache headers', () => {
      const minimalManager = new DocumentCacheManager({
        browserCacheStrategy: 'minimal',
      });
      
      const headers = minimalManager.getBrowserCacheHeaders();
      
      expect(headers['Cache-Control']).toBe('public, max-age=3600'); // 1 hour
      
      minimalManager.destroy();
    });
  });

  describe('CDN Cache Headers', () => {
    it('should generate CDN cache headers', () => {
      const headers = cacheManager.getCDNCacheHeaders();
      
      expect(headers['Cache-Control']).toContain('public');
      expect(headers['Cache-Control']).toContain('max-age=2592000'); // 30 days
      expect(headers['Expires']).toBeDefined();
      expect(headers['Vary']).toBe('Accept-Encoding');
      expect(headers['X-Cache-Strategy']).toBe('cdn-optimized');
    });
  });

  describe('Memory Cache Operations', () => {
    it('should store and retrieve page cache', async () => {
      const documentId = 'test-doc-1';
      const pageNumber = 1;
      const testData = 'test-image-data';
      
      // Store page in cache
      await cacheManager.setPageCache(documentId, pageNumber, testData);
      
      // Retrieve page from cache
      const cachedData = await cacheManager.getPageCache(documentId, pageNumber);
      
      expect(cachedData).toBe(testData);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(`Stored page ${pageNumber} for document ${documentId}`)
      );
    });

    it('should return null for non-existent cache entries', async () => {
      const cachedData = await cacheManager.getPageCache('non-existent', 1);
      expect(cachedData).toBeNull();
    });

    it('should handle cache expiration', async () => {
      const documentId = 'test-doc-2';
      const pageNumber = 1;
      const testData = 'test-data';
      
      // Store with short TTL
      const shortTTLManager = new DocumentCacheManager({
        memoryCacheTTL: 100, // 100ms
      });
      
      await shortTTLManager.setPageCache(documentId, pageNumber, testData);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const cachedData = await shortTTLManager.getPageCache(documentId, pageNumber);
      expect(cachedData).toBeNull();
      
      shortTTLManager.destroy();
    });

    it('should update access count and timestamp on cache hit', async () => {
      const documentId = 'test-doc-3';
      const pageNumber = 1;
      const testData = 'test-data';
      
      await cacheManager.setPageCache(documentId, pageNumber, testData);
      
      // Access multiple times
      await cacheManager.getPageCache(documentId, pageNumber);
      await cacheManager.getPageCache(documentId, pageNumber);
      
      // Verify access tracking (internal state would be updated)
      const cachedData = await cacheManager.getPageCache(documentId, pageNumber);
      expect(cachedData).toBe(testData);
    });
  });

  describe('Document Metadata Cache', () => {
    it('should store and retrieve document metadata', async () => {
      const documentId = 'test-doc-4';
      const metadata = {
        title: 'Test Document',
        totalPages: 10,
        fileSize: 1024000,
      };
      
      await cacheManager.setDocumentCache(documentId, metadata);
      const cachedMetadata = await cacheManager.getDocumentCache(documentId);
      
      expect(cachedMetadata).toEqual(metadata);
    });

    it('should handle metadata cache expiration', async () => {
      const documentId = 'test-doc-5';
      const metadata = { title: 'Test' };
      
      const shortTTLManager = new DocumentCacheManager({
        memoryCacheTTL: 50, // 50ms (metadata gets 2x TTL)
      });
      
      await shortTTLManager.setDocumentCache(documentId, metadata);
      
      // Wait for expiration (metadata TTL is 2x regular TTL)
      await new Promise(resolve => setTimeout(resolve, 120));
      
      const cachedMetadata = await shortTTLManager.getDocumentCache(documentId);
      expect(cachedMetadata).toBeNull();
      
      shortTTLManager.destroy();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate all pages for a document', async () => {
      const documentId = 'test-doc-6';
      
      // Store multiple pages
      await cacheManager.setPageCache(documentId, 1, 'page-1-data');
      await cacheManager.setPageCache(documentId, 2, 'page-2-data');
      await cacheManager.setPageCache(documentId, 3, 'page-3-data');
      
      // Invalidate document
      await cacheManager.invalidateDocument(documentId);
      
      // Verify all pages are invalidated
      expect(await cacheManager.getPageCache(documentId, 1)).toBeNull();
      expect(await cacheManager.getPageCache(documentId, 2)).toBeNull();
      expect(await cacheManager.getPageCache(documentId, 3)).toBeNull();
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Invalidated 3 entries for document')
      );
    });

    it('should invalidate specific page', async () => {
      const documentId = 'test-doc-7';
      
      await cacheManager.setPageCache(documentId, 1, 'page-1-data');
      await cacheManager.setPageCache(documentId, 2, 'page-2-data');
      
      // Invalidate only page 1
      await cacheManager.invalidatePage(documentId, 1);
      
      expect(await cacheManager.getPageCache(documentId, 1)).toBeNull();
      expect(await cacheManager.getPageCache(documentId, 2)).toBe('page-2-data');
    });

    it('should clear all cache entries', async () => {
      await cacheManager.setPageCache('doc-1', 1, 'data-1');
      await cacheManager.setPageCache('doc-2', 1, 'data-2');
      
      await cacheManager.clearCache();
      
      expect(await cacheManager.getPageCache('doc-1', 1)).toBeNull();
      expect(await cacheManager.getPageCache('doc-2', 1)).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache statistics', () => {
      const stats = cacheManager.getCacheStats();
      
      expect(stats).toHaveProperty('memoryCache');
      expect(stats).toHaveProperty('browserCache');
      expect(stats).toHaveProperty('cdnCache');
      expect(stats).toHaveProperty('performance');
      
      expect(stats.memoryCache.size).toBe(0);
      expect(stats.memoryCache.entries).toBe(0);
      expect(stats.browserCache.strategy).toBe('conservative');
    });

    it('should update statistics after cache operations', async () => {
      await cacheManager.setPageCache('test-doc', 1, 'test-data');
      
      const stats = cacheManager.getCacheStats();
      expect(stats.memoryCache.entries).toBe(1);
      expect(stats.memoryCache.size).toBeGreaterThan(0);
    });
  });

  describe('Cache Optimization', () => {
    it('should optimize cache by removing LRU entries', async () => {
      const smallCacheManager = new DocumentCacheManager({
        memoryCacheSize: 3,
      });
      
      // Fill cache beyond capacity
      await smallCacheManager.setPageCache('doc-1', 1, 'data-1');
      await smallCacheManager.setPageCache('doc-1', 2, 'data-2');
      await smallCacheManager.setPageCache('doc-1', 3, 'data-3');
      await smallCacheManager.setPageCache('doc-1', 4, 'data-4'); // Should trigger eviction
      
      await smallCacheManager.optimizeCache();
      
      // Verify optimization occurred
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Cache optimization completed')
      );
      
      smallCacheManager.destroy();
    });

    it('should calculate cache efficiency', async () => {
      // Simulate cache hits and misses
      await cacheManager.setPageCache('doc-1', 1, 'data-1');
      
      // Cache hit
      await cacheManager.getPageCache('doc-1', 1);
      
      // Cache miss
      await cacheManager.getPageCache('doc-1', 2);
      
      const efficiency = cacheManager.getCacheEfficiency();
      expect(efficiency).toBeGreaterThan(0);
      expect(efficiency).toBeLessThanOrEqual(100);
    });
  });

  describe('Preloading', () => {
    it('should preload frequent pages', async () => {
      const documentId = 'test-doc-8';
      const pageNumbers = [1, 2, 3];
      
      await cacheManager.preloadFrequentPages(documentId, pageNumbers);
      
      // Verify preloading was initiated (would mark pages as high priority)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(`Preloading ${pageNumbers.length} pages`)
      );
    });
  });

  describe('Memory Management', () => {
    it('should handle memory pressure', async () => {
      const memoryManager = new DocumentCacheManager({
        memoryCacheSize: 2,
        persistentCacheSize: 1, // 1MB limit
      });
      
      // Add entries that would exceed memory limit
      const largeData = 'x'.repeat(500000); // ~500KB
      
      await memoryManager.setPageCache('doc-1', 1, largeData);
      await memoryManager.setPageCache('doc-1', 2, largeData);
      await memoryManager.setPageCache('doc-1', 3, largeData); // Should trigger eviction
      
      memoryManager.destroy();
    });

    it('should cleanup expired entries', async () => {
      const shortTTLManager = new DocumentCacheManager({
        memoryCacheTTL: 50, // 50ms
      });
      
      await shortTTLManager.setPageCache('doc-1', 1, 'data-1');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Trigger cleanup (would normally happen automatically)
      await shortTTLManager.optimizeCache();
      
      shortTTLManager.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid cache operations gracefully', async () => {
      // Test with invalid data
      await expect(cacheManager.setPageCache('', 0, null)).resolves.not.toThrow();
      
      // Test with invalid retrieval
      await expect(cacheManager.getPageCache('', 0)).resolves.toBeNull();
    });

    it('should handle cleanup failures gracefully', () => {
      // Test destruction with no active intervals
      expect(() => cacheManager.destroy()).not.toThrow();
      
      // Test multiple destructions
      expect(() => cacheManager.destroy()).not.toThrow();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', async () => {
      await cacheManager.setPageCache('doc-1', 1, 'data-1');
      await cacheManager.getPageCache('doc-1', 1); // Hit
      await cacheManager.getPageCache('doc-1', 2); // Miss
      
      const stats = cacheManager.getCacheStats();
      
      expect(stats.memoryCache.hitRate).toBeGreaterThan(0);
      expect(stats.memoryCache.missRate).toBeGreaterThan(0);
    });

    it('should format cache sizes correctly', async () => {
      const testData = 'x'.repeat(1024); // 1KB
      await cacheManager.setPageCache('doc-1', 1, testData);
      
      const stats = cacheManager.getCacheStats();
      expect(stats.memoryCache.size).toBeGreaterThan(1000); // Should be around 2KB (UTF-16)
    });
  });
});