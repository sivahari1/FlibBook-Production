import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma Client
const mockPrisma = {
  documentPage: {
    update: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
    deleteMany: vi.fn(),
  },
  $disconnect: vi.fn(),
};

vi.mock('@prisma/client', () => ({
  PrismaClient: function() {
    return mockPrisma;
  },
}));

// Import after mocking
const { DocumentPagesOptimizer } = await import('../document-pages-optimizer');

describe('DocumentPagesOptimizer', () => {
  let optimizer: DocumentPagesOptimizer;

  beforeEach(() => {
    optimizer = new DocumentPagesOptimizer();
    vi.clearAllMocks();
  });

  describe('updateCacheMetadata', () => {
    it('should update cache metadata for a page', async () => {
      const pageId = 'page-123';
      const metadata = {
        cacheKey: 'cache-key-123',
        cacheExpiresAt: new Date('2024-12-18T00:00:00Z'),
        qualityLevel: 'high' as const,
        format: 'webp' as const,
        optimizationApplied: true
      };

      await optimizer.updateCacheMetadata(pageId, metadata);

      expect(mockPrisma.documentPage.update).toHaveBeenCalledWith({
        where: { id: pageId },
        data: {
          cacheKey: metadata.cacheKey,
          cacheExpiresAt: metadata.cacheExpiresAt,
          qualityLevel: metadata.qualityLevel,
          format: metadata.format,
          optimizationApplied: metadata.optimizationApplied
        }
      });
    });

    it('should handle partial metadata updates', async () => {
      const pageId = 'page-123';
      const metadata = {
        cacheKey: 'cache-key-123'
      };

      await optimizer.updateCacheMetadata(pageId, metadata);

      expect(mockPrisma.documentPage.update).toHaveBeenCalledWith({
        where: { id: pageId },
        data: {
          cacheKey: metadata.cacheKey,
          cacheExpiresAt: undefined,
          qualityLevel: undefined,
          format: undefined,
          optimizationApplied: undefined
        }
      });
    });
  });

  describe('recordPageAccess', () => {
    it('should record page access without processing time', async () => {
      const pageId = 'page-123';

      await optimizer.recordPageAccess(pageId);

      expect(mockPrisma.documentPage.update).toHaveBeenCalledWith({
        where: { id: pageId },
        data: {
          lastAccessedAt: expect.any(Date),
          cacheHitCount: {
            increment: 1
          }
        }
      });
    });

    it('should record page access with processing time', async () => {
      const pageId = 'page-123';
      const processingTime = 150;

      await optimizer.recordPageAccess(pageId, processingTime);

      expect(mockPrisma.documentPage.update).toHaveBeenCalledWith({
        where: { id: pageId },
        data: {
          lastAccessedAt: expect.any(Date),
          cacheHitCount: {
            increment: 1
          },
          processingTimeMs: processingTime
        }
      });
    });
  });

  describe('getPagesNeedingCacheRefresh', () => {
    it('should return pages with expired or null cache', async () => {
      const mockPages = [
        { id: 'page-1', cacheExpiresAt: '2024-12-16T00:00:00Z' },
        { id: 'page-2', cacheExpiresAt: null }
      ];

      mockPrisma.documentPage.findMany.mockResolvedValue(mockPages);

      const result = await optimizer.getPagesNeedingCacheRefresh();

      expect(mockPrisma.documentPage.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              cacheExpiresAt: {
                lte: expect.any(Date)
              }
            },
            {
              cacheExpiresAt: null
            }
          ]
        },
        include: {
          document: {
            select: {
              id: true,
              title: true,
              updatedAt: true
            }
          }
        },
        orderBy: {
          lastAccessedAt: 'desc'
        }
      });

      expect(result).toEqual(mockPages);
    });
  });

  describe('createNewPageVersion', () => {
    it('should create new version and expire old ones', async () => {
      const documentId = 'doc-123';
      const generationMethod = 'optimized';
      const qualityLevel = 'high';

      mockPrisma.documentPage.aggregate.mockResolvedValue({
        _max: { version: 2 }
      });

      const result = await optimizer.createNewPageVersion(documentId, generationMethod, qualityLevel);

      expect(mockPrisma.documentPage.aggregate).toHaveBeenCalledWith({
        where: { documentId },
        _max: { version: true }
      });

      expect(mockPrisma.documentPage.updateMany).toHaveBeenCalledWith({
        where: { 
          documentId,
          version: {
            lt: 3
          }
        },
        data: {
          cacheExpiresAt: expect.any(Date)
        }
      });

      expect(result).toBe(3);
    });

    it('should handle documents with no existing versions', async () => {
      const documentId = 'doc-123';

      mockPrisma.documentPage.aggregate.mockResolvedValue({
        _max: { version: null }
      });

      const result = await optimizer.createNewPageVersion(documentId);

      expect(result).toBe(1);
    });
  });

  describe('getPerformanceStats', () => {
    it('should return performance statistics for all documents', async () => {
      const mockAggregateResult = {
        _count: { id: 100 },
        _avg: { cacheHitCount: 5.5, processingTimeMs: 250.0 },
        _max: { version: 3, lastAccessedAt: '2024-12-17T12:00:00Z' },
        _min: { createdAt: '2024-12-01T00:00:00Z' }
      };

      const mockFormatStats = [
        { format: 'jpeg', _count: { format: 60 } },
        { format: 'webp', _count: { format: 40 } }
      ];

      const mockQualityStats = [
        { qualityLevel: 'standard', _count: { qualityLevel: 70 } },
        { qualityLevel: 'high', _count: { qualityLevel: 30 } }
      ];

      mockPrisma.documentPage.aggregate.mockResolvedValue(mockAggregateResult);
      mockPrisma.documentPage.groupBy
        .mockResolvedValueOnce(mockFormatStats)
        .mockResolvedValueOnce(mockQualityStats);

      const result = await optimizer.getPerformanceStats();

      expect(result).toEqual({
        totalPages: 100,
        averageCacheHits: 5.5,
        averageProcessingTime: 250.0,
        maxVersion: 3,
        lastAccessed: mockAggregateResult._max.lastAccessedAt,
        oldestPage: mockAggregateResult._min.createdAt,
        formatDistribution: mockFormatStats,
        qualityDistribution: mockQualityStats
      });
    });

    it('should return performance statistics for specific document', async () => {
      const documentId = 'doc-123';
      
      // Mock the aggregate result for this test
      mockPrisma.documentPage.aggregate.mockResolvedValue({
        _count: { id: 50 },
        _avg: { cacheHitCount: 3.0, processingTimeMs: 200.0 },
        _max: { version: 2, lastAccessedAt: new Date('2024-12-17T10:00:00Z') },
        _min: { createdAt: new Date('2024-12-01T00:00:00Z') }
      });
      
      mockPrisma.documentPage.groupBy
        .mockResolvedValueOnce([{ format: 'jpeg', _count: { format: 50 } }])
        .mockResolvedValueOnce([{ qualityLevel: 'standard', _count: { qualityLevel: 50 } }]);

      await optimizer.getPerformanceStats(documentId);

      expect(mockPrisma.documentPage.aggregate).toHaveBeenCalledWith({
        where: { documentId },
        _count: { id: true },
        _avg: { cacheHitCount: true, processingTimeMs: true },
        _max: { version: true, lastAccessedAt: true },
        _min: { createdAt: true }
      });
    });
  });

  describe('cleanupExpiredCache', () => {
    it('should delete expired cache entries except version 1', async () => {
      mockPrisma.documentPage.deleteMany.mockResolvedValue({ count: 15 });

      const result = await optimizer.cleanupExpiredCache();

      expect(mockPrisma.documentPage.deleteMany).toHaveBeenCalledWith({
        where: {
          cacheExpiresAt: {
            lte: expect.any(Date)
          },
          version: {
            not: 1
          }
        }
      });

      expect(result).toBe(15);
    });
  });

  describe('getMostAccessedPages', () => {
    it('should return most accessed pages with default limit', async () => {
      const mockPages = [
        { id: 'page-1', cacheHitCount: 100 },
        { id: 'page-2', cacheHitCount: 50 }
      ];

      mockPrisma.documentPage.findMany.mockResolvedValue(mockPages);

      const result = await optimizer.getMostAccessedPages();

      expect(mockPrisma.documentPage.findMany).toHaveBeenCalledWith({
        where: {
          cacheHitCount: {
            gt: 0
          }
        },
        include: {
          document: {
            select: {
              id: true,
              title: true,
              contentType: true
            }
          }
        },
        orderBy: [
          { cacheHitCount: 'desc' },
          { lastAccessedAt: 'desc' }
        ],
        take: 100
      });

      expect(result).toEqual(mockPages);
    });

    it('should respect custom limit', async () => {
      await optimizer.getMostAccessedPages(50);

      expect(mockPrisma.documentPage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50
        })
      );
    });
  });

  describe('optimizePageQuality', () => {
    it('should upgrade quality for frequently accessed pages', async () => {
      const pageId = 'page-123';
      const mockPage = {
        cacheHitCount: 60,
        lastAccessedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        qualityLevel: 'standard'
      };

      mockPrisma.documentPage.findUnique.mockResolvedValue(mockPage);

      await optimizer.optimizePageQuality(pageId);

      expect(mockPrisma.documentPage.update).toHaveBeenCalledWith({
        where: { id: pageId },
        data: { 
          qualityLevel: 'high',
          optimizationApplied: true
        }
      });
    });

    it('should downgrade quality for rarely accessed pages', async () => {
      const pageId = 'page-123';
      const oldDate = new Date('2024-11-12T12:00:00Z'); // 35 days ago

      const mockPage = {
        cacheHitCount: 5,
        lastAccessedAt: oldDate,
        qualityLevel: 'high'
      };

      mockPrisma.documentPage.findUnique.mockResolvedValue(mockPage);

      await optimizer.optimizePageQuality(pageId);

      expect(mockPrisma.documentPage.update).toHaveBeenCalledWith({
        where: { id: pageId },
        data: { 
          qualityLevel: 'standard',
          optimizationApplied: true
        }
      });
    });

    it('should not update quality if no change needed', async () => {
      const pageId = 'page-123';
      const mockPage = {
        cacheHitCount: 25,
        lastAccessedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        qualityLevel: 'standard'
      };

      mockPrisma.documentPage.findUnique.mockResolvedValue(mockPage);

      await optimizer.optimizePageQuality(pageId);

      expect(mockPrisma.documentPage.update).not.toHaveBeenCalled();
    });

    it('should handle non-existent pages gracefully', async () => {
      const pageId = 'non-existent';

      mockPrisma.documentPage.findUnique.mockResolvedValue(null);

      await optimizer.optimizePageQuality(pageId);

      expect(mockPrisma.documentPage.update).not.toHaveBeenCalled();
    });
  });
});