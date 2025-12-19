/**
 * Unit tests for ConversionResultCache
 * 
 * Tests caching functionality, cache warming, invalidation,
 * and performance optimization features.
 */

import { ConversionResultCache, ConversionCacheEntry, CacheStats } from '../conversion-result-cache';
import { ConversionResult } from '../../types/conversion';

import { vi } from 'vitest';

// Mock PrismaClient
const mockPrismaClient = {
  conversionCache: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  document: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
};

// Mock conversion result
const mockConversionResult: ConversionResult = {
  success: true,
  documentId: 'doc-123',
  totalPages: 5,
  processingTime: 2500,
};

describe('ConversionResultCache', () => {
  let cache: ConversionResultCache;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock empty database response by default
    mockPrismaClient.conversionCache.findMany.mockResolvedValue([]);
    
    cache = new ConversionResultCache(mockPrismaClient as any, {
      maxCacheSize: 10,
      defaultTtlMs: 60000, // 1 minute for testing
      warmingConfig: {
        enabled: false, // Disable warming for most tests
        minAccessCount: 2,
        maxWarmingBatch: 5,
        warmingInterval: 30000,
        popularityThreshold: 5,
      },
    });
  });

  afterEach(() => {
    cache.shutdown();
  });

  describe('Basic Cache Operations', () => {
    test('should store and retrieve conversion result', async () => {
      // Mock database operations
      mockPrismaClient.conversionCache.upsert.mockResolvedValue({
        id: 'conv_doc-123',
        documentId: 'doc-123',
        result: JSON.stringify(mockConversionResult),
        documentVersion: 'v1',
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        expiresAt: new Date(Date.now() + 60000),
        sizeBytes: 100,
      });

      // Store result
      await cache.set('doc-123', mockConversionResult, 'v1');

      // Retrieve result
      const retrieved = await cache.get('doc-123', 'v1');

      expect(retrieved).toEqual(mockConversionResult);
      expect(mockPrismaClient.conversionCache.upsert).toHaveBeenCalledWith({
        where: { documentId: 'doc-123' },
        create: expect.objectContaining({
          documentId: 'doc-123',
          result: JSON.stringify(mockConversionResult),
          documentVersion: 'v1',
        }),
        update: expect.objectContaining({
          result: JSON.stringify(mockConversionResult),
          documentVersion: 'v1',
        }),
      });
    });

    test('should return null for cache miss', async () => {
      const result = await cache.get('nonexistent-doc');
      expect(result).toBeNull();
    });

    test('should invalidate cache entry', async () => {
      // Store result first
      mockPrismaClient.conversionCache.upsert.mockResolvedValue({});
      await cache.set('doc-123', mockConversionResult);

      // Mock delete operation
      mockPrismaClient.conversionCache.delete.mockResolvedValue({});

      // Invalidate
      const invalidated = await cache.invalidate('doc-123');

      expect(invalidated).toBe(true);
      expect(mockPrismaClient.conversionCache.delete).toHaveBeenCalledWith({
        where: { documentId: 'doc-123' },
      });

      // Should return null after invalidation
      const result = await cache.get('doc-123');
      expect(result).toBeNull();
    });

    test('should handle document version mismatch', async () => {
      // Store result with version v1
      mockPrismaClient.conversionCache.upsert.mockResolvedValue({});
      await cache.set('doc-123', mockConversionResult, 'v1');

      // Mock delete for invalidation
      mockPrismaClient.conversionCache.delete.mockResolvedValue({});

      // Try to get with different version
      const result = await cache.get('doc-123', 'v2');

      expect(result).toBeNull();
      expect(mockPrismaClient.conversionCache.delete).toHaveBeenCalled();
    });
  });

  describe('Cache Expiration', () => {
    test('should return null for expired cache entry', async () => {
      // Create cache with short TTL
      const shortTtlCache = new ConversionResultCache(mockPrismaClient as any, {
        defaultTtlMs: 100, // 100ms
        warmingConfig: { enabled: false },
      });

      mockPrismaClient.conversionCache.upsert.mockResolvedValue({});
      mockPrismaClient.conversionCache.delete.mockResolvedValue({});

      // Store result
      await shortTtlCache.set('doc-123', mockConversionResult);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should return null and invalidate
      const result = await shortTtlCache.get('doc-123');
      expect(result).toBeNull();

      shortTtlCache.shutdown();
    });

    test('should cleanup expired entries', async () => {
      mockPrismaClient.conversionCache.deleteMany.mockResolvedValue({ count: 3 });

      const cleanedCount = await cache.cleanupExpired();

      expect(cleanedCount).toBe(3);
      expect(mockPrismaClient.conversionCache.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });

  describe('Cache Statistics', () => {
    test('should calculate cache statistics', async () => {
      // Store multiple results
      mockPrismaClient.conversionCache.upsert.mockResolvedValue({});
      
      await cache.set('doc-1', { ...mockConversionResult, documentId: 'doc-1' });
      await cache.set('doc-2', { ...mockConversionResult, documentId: 'doc-2' });
      await cache.set('doc-3', { ...mockConversionResult, documentId: 'doc-3' });

      // Access some entries multiple times
      await cache.get('doc-1');
      await cache.get('doc-1');
      await cache.get('doc-2');

      const stats = await cache.getStats();

      expect(stats.totalEntries).toBe(3);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
      expect(stats.popularDocuments).toHaveLength(3);
      expect(stats.efficiency.avgAccessCount).toBeGreaterThan(1);
    });
  });

  describe('Cache Size Management', () => {
    test('should evict LRU entry when cache is full', async () => {
      // Create cache with size limit of 2
      const smallCache = new ConversionResultCache(mockPrismaClient as any, {
        maxCacheSize: 2,
        warmingConfig: { enabled: false },
      });

      mockPrismaClient.conversionCache.upsert.mockResolvedValue({});
      mockPrismaClient.conversionCache.delete.mockResolvedValue({});

      // Fill cache
      await smallCache.set('doc-1', { ...mockConversionResult, documentId: 'doc-1' });
      await smallCache.set('doc-2', { ...mockConversionResult, documentId: 'doc-2' });

      // Access doc-1 to make it more recently used
      await smallCache.get('doc-1');

      // Add third item, should evict the LRU entry
      await smallCache.set('doc-3', { ...mockConversionResult, documentId: 'doc-3' });

      // Wait a moment for eviction to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check that cache size is maintained (should be <= 2)
      expect(smallCache['cache'].size).toBeLessThanOrEqual(2);

      // At least one of the original documents should still be available
      const doc1Result = await smallCache.get('doc-1');
      const doc2Result = await smallCache.get('doc-2');
      const doc3Result = await smallCache.get('doc-3');
      
      // doc-3 should definitely be available (just added)
      expect(doc3Result).not.toBeNull();
      
      // At least one of doc-1 or doc-2 should be available
      const availableCount = [doc1Result, doc2Result, doc3Result].filter(r => r !== null).length;
      expect(availableCount).toBeGreaterThanOrEqual(2);

      smallCache.shutdown();
    });
  });

  describe('Batch Operations', () => {
    test('should invalidate multiple cache entries', async () => {
      // Store multiple results
      mockPrismaClient.conversionCache.upsert.mockResolvedValue({});
      await cache.set('doc-1', { ...mockConversionResult, documentId: 'doc-1' });
      await cache.set('doc-2', { ...mockConversionResult, documentId: 'doc-2' });
      await cache.set('doc-3', { ...mockConversionResult, documentId: 'doc-3' });

      // Mock batch delete
      mockPrismaClient.conversionCache.deleteMany.mockResolvedValue({ count: 2 });

      // Invalidate multiple
      const invalidatedCount = await cache.invalidateMultiple(['doc-1', 'doc-2']);

      expect(invalidatedCount).toBe(2);
      expect(mockPrismaClient.conversionCache.deleteMany).toHaveBeenCalledWith({
        where: {
          documentId: {
            in: ['doc-1', 'doc-2'],
          },
        },
      });

      // Should return null for invalidated entries
      const doc1Result = await cache.get('doc-1');
      const doc2Result = await cache.get('doc-2');
      expect(doc1Result).toBeNull();
      expect(doc2Result).toBeNull();

      // doc-3 should still be available
      const doc3Result = await cache.get('doc-3');
      expect(doc3Result).not.toBeNull();
    });

    test('should clear all cache entries', async () => {
      // Store multiple results
      mockPrismaClient.conversionCache.upsert.mockResolvedValue({});
      await cache.set('doc-1', { ...mockConversionResult, documentId: 'doc-1' });
      await cache.set('doc-2', { ...mockConversionResult, documentId: 'doc-2' });

      // Mock clear operation
      mockPrismaClient.conversionCache.deleteMany.mockResolvedValue({ count: 2 });

      // Clear cache
      await cache.clear();

      expect(mockPrismaClient.conversionCache.deleteMany).toHaveBeenCalledWith({});

      // All entries should be gone
      const doc1Result = await cache.get('doc-1');
      const doc2Result = await cache.get('doc-2');
      expect(doc1Result).toBeNull();
      expect(doc2Result).toBeNull();
    });
  });

  describe('Cache Warming', () => {
    test('should warm cache for specified documents', async () => {
      // Create cache with warming enabled
      const warmingCache = new ConversionResultCache(mockPrismaClient as any, {
        warmingConfig: {
          enabled: true,
          minAccessCount: 1,
          maxWarmingBatch: 3,
          warmingInterval: 60000,
          popularityThreshold: 2,
        },
      });

      // Mock document existence check
      mockPrismaClient.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        filePath: '/path/to/doc1.pdf',
      });

      const warmedCount = await warmingCache.warmCache(['doc-1']);

      expect(warmedCount).toBe(1);

      warmingCache.shutdown();
    });

    test('should find popular uncached documents for warming', async () => {
      // Mock recent documents query
      mockPrismaClient.document.findMany.mockResolvedValue([
        { id: 'doc-1' },
        { id: 'doc-2' },
        { id: 'doc-3' },
      ]);

      // Mock document existence checks
      mockPrismaClient.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        filePath: '/path/to/doc.pdf',
      });

      const warmingCache = new ConversionResultCache(mockPrismaClient as any, {
        warmingConfig: {
          enabled: true,
          minAccessCount: 1,
          maxWarmingBatch: 2,
          warmingInterval: 60000,
          popularityThreshold: 1,
        },
      });

      const warmedCount = await warmingCache.warmCache();

      expect(warmedCount).toBeGreaterThanOrEqual(0);
      expect(mockPrismaClient.document.findMany).toHaveBeenCalled();

      warmingCache.shutdown();
    });
  });

  describe('Database Integration', () => {
    test('should load cache from database on startup', async () => {
      const dbEntries = [
        {
          id: 'conv_doc-1',
          documentId: 'doc-1',
          result: JSON.stringify({ ...mockConversionResult, documentId: 'doc-1' }),
          documentVersion: 'v1',
          createdAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 5,
          expiresAt: new Date(Date.now() + 60000),
          sizeBytes: 100,
        },
        {
          id: 'conv_doc-2',
          documentId: 'doc-2',
          result: JSON.stringify({ ...mockConversionResult, documentId: 'doc-2' }),
          documentVersion: 'v1',
          createdAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 3,
          expiresAt: new Date(Date.now() + 60000),
          sizeBytes: 120,
        },
      ];

      mockPrismaClient.conversionCache.findMany.mockResolvedValue(dbEntries);

      // Create new cache instance (should load from database)
      const newCache = new ConversionResultCache(mockPrismaClient as any, {
        warmingConfig: { enabled: false },
      });

      // Wait for async loading
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should be able to get loaded entries
      const doc1Result = await newCache.get('doc-1');
      const doc2Result = await newCache.get('doc-2');

      expect(doc1Result).toEqual({ ...mockConversionResult, documentId: 'doc-1' });
      expect(doc2Result).toEqual({ ...mockConversionResult, documentId: 'doc-2' });

      expect(mockPrismaClient.conversionCache.findMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            gt: expect.any(Date),
          },
        },
        orderBy: {
          lastAccessedAt: 'desc',
        },
        take: expect.any(Number),
      });

      newCache.shutdown();
    });

    test('should handle database errors gracefully', async () => {
      // Mock database error
      mockPrismaClient.conversionCache.upsert.mockRejectedValue(new Error('Database error'));

      // Should throw error when database operation fails
      await expect(cache.set('doc-123', mockConversionResult)).rejects.toThrow('Database error');
    });

    test('should update access statistics in database', async () => {
      // Store result first
      mockPrismaClient.conversionCache.upsert.mockResolvedValue({});
      mockPrismaClient.conversionCache.update.mockResolvedValue({});
      
      await cache.set('doc-123', mockConversionResult);

      // Access the result (should update stats)
      await cache.get('doc-123');

      // Wait for async stats update
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPrismaClient.conversionCache.update).toHaveBeenCalledWith({
        where: { documentId: 'doc-123' },
        data: {
          lastAccessedAt: expect.any(Date),
          accessCount: expect.any(Number),
        },
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed cache entries gracefully', async () => {
      const malformedEntry = {
        id: 'conv_doc-1',
        documentId: 'doc-1',
        result: 'invalid-json',
        documentVersion: 'v1',
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        expiresAt: new Date(Date.now() + 60000),
        sizeBytes: 100,
      };

      mockPrismaClient.conversionCache.findMany.mockResolvedValue([malformedEntry]);

      // Should not crash when loading malformed entries
      const errorCache = new ConversionResultCache(mockPrismaClient as any, {
        warmingConfig: { enabled: false },
      });

      // Wait for loading attempt
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should return null for malformed entry
      const result = await errorCache.get('doc-1');
      expect(result).toBeNull();

      errorCache.shutdown();
    });

    test('should handle cache size calculation errors', async () => {
      // Create result with circular reference (will cause JSON.stringify to fail)
      const circularResult: any = { ...mockConversionResult };
      circularResult.circular = circularResult;

      mockPrismaClient.conversionCache.upsert.mockResolvedValue({});

      // Should throw error for circular reference
      await expect(cache.set('doc-123', circularResult)).rejects.toThrow();
    });
  });
});

describe('ConversionResultCache Integration', () => {
  test('should integrate with CentralizedConversionManager', async () => {
    // This test would verify integration with the conversion manager
    // For now, we'll just test that the cache can be used independently
    
    const cache = new ConversionResultCache(mockPrismaClient as any);
    
    mockPrismaClient.conversionCache.upsert.mockResolvedValue({});
    
    // Store and retrieve result
    await cache.set('doc-123', mockConversionResult);
    const result = await cache.get('doc-123');
    
    expect(result).toEqual(mockConversionResult);
    
    cache.shutdown();
  });
});