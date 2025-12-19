/**
 * Document Pages Optimizer Service
 * Handles cache metadata, versioning, and performance optimization for document pages
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PageCacheMetadata {
  cacheKey: string;
  cacheExpiresAt: Date;
  qualityLevel: 'low' | 'standard' | 'high';
  format: 'jpeg' | 'webp' | 'png';
  optimizationApplied: boolean;
}

export interface PagePerformanceMetrics {
  processingTimeMs: number;
  cacheHitCount: number;
  lastAccessedAt: Date;
}

export class DocumentPagesOptimizer {
  /**
   * Update cache metadata for a document page
   */
  async updateCacheMetadata(
    pageId: string, 
    metadata: Partial<PageCacheMetadata>
  ): Promise<void> {
    await prisma.documentPage.update({
      where: { id: pageId },
      data: {
        cacheKey: metadata.cacheKey,
        cacheExpiresAt: metadata.cacheExpiresAt,
        qualityLevel: metadata.qualityLevel,
        format: metadata.format,
        optimizationApplied: metadata.optimizationApplied
      }
    });
  }

  /**
   * Record page access and update performance metrics
   */
  async recordPageAccess(pageId: string, processingTime?: number): Promise<void> {
    await prisma.documentPage.update({
      where: { id: pageId },
      data: {
        lastAccessedAt: new Date(),
        cacheHitCount: {
          increment: 1
        },
        ...(processingTime && { processingTimeMs: processingTime })
      }
    });
  }

  /**
   * Get pages that need cache refresh
   */
  async getPagesNeedingCacheRefresh(): Promise<any[]> {
    return await prisma.documentPage.findMany({
      where: {
        OR: [
          {
            cacheExpiresAt: {
              lte: new Date()
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
  }

  /**
   * Create new version of document pages
   */
  async createNewPageVersion(
    documentId: string,
    generationMethod: string = 'standard',
    qualityLevel: string = 'standard'
  ): Promise<number> {
    // Get the current max version for this document
    const maxVersion = await prisma.documentPage.aggregate({
      where: { documentId },
      _max: { version: true }
    });

    const newVersion = (maxVersion._max.version || 0) + 1;

    // Mark old versions as expired
    await prisma.documentPage.updateMany({
      where: { 
        documentId,
        version: {
          lt: newVersion
        }
      },
      data: {
        cacheExpiresAt: new Date() // Expire immediately
      }
    });

    return newVersion;
  }

  /**
   * Get performance statistics for document pages
   */
  async getPerformanceStats(documentId?: string): Promise<any> {
    const whereClause = documentId ? { documentId } : {};

    const stats = await prisma.documentPage.aggregate({
      where: whereClause,
      _count: {
        id: true
      },
      _avg: {
        cacheHitCount: true,
        processingTimeMs: true
      },
      _max: {
        version: true,
        lastAccessedAt: true
      },
      _min: {
        createdAt: true
      }
    });

    // Get format distribution
    const formatStats = await prisma.documentPage.groupBy({
      by: ['format'],
      where: whereClause,
      _count: {
        format: true
      }
    });

    // Get quality level distribution
    const qualityStats = await prisma.documentPage.groupBy({
      by: ['qualityLevel'],
      where: whereClause,
      _count: {
        qualityLevel: true
      }
    });

    return {
      totalPages: stats._count.id,
      averageCacheHits: stats._avg.cacheHitCount,
      averageProcessingTime: stats._avg.processingTimeMs,
      maxVersion: stats._max.version,
      lastAccessed: stats._max.lastAccessedAt,
      oldestPage: stats._min.createdAt,
      formatDistribution: formatStats,
      qualityDistribution: qualityStats
    };
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<number> {
    const result = await prisma.documentPage.deleteMany({
      where: {
        cacheExpiresAt: {
          lte: new Date()
        },
        version: {
          not: 1 // Don't delete the original version
        }
      }
    });

    return result.count;
  }

  /**
   * Get most accessed pages for cache warming
   */
  async getMostAccessedPages(limit: number = 100): Promise<any[]> {
    return await prisma.documentPage.findMany({
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
      take: limit
    });
  }

  /**
   * Update page quality based on access patterns
   */
  async optimizePageQuality(pageId: string): Promise<void> {
    const page = await prisma.documentPage.findUnique({
      where: { id: pageId },
      select: {
        cacheHitCount: true,
        lastAccessedAt: true,
        qualityLevel: true
      }
    });

    if (!page) return;

    let newQualityLevel = page.qualityLevel;

    // Calculate days since last access
    const daysSinceAccess = page.lastAccessedAt 
      ? (Date.now() - page.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    // Upgrade quality for frequently accessed pages (recent activity takes precedence)
    if (daysSinceAccess <= 7) { // Recently accessed (within a week)
      if (page.cacheHitCount > 50 && page.qualityLevel === 'standard') {
        newQualityLevel = 'high';
      } else if (page.cacheHitCount > 10 && page.qualityLevel === 'low') {
        newQualityLevel = 'standard';
      }
    } else {
      // Downgrade quality for rarely accessed pages
      if (daysSinceAccess > 30 && page.qualityLevel === 'high') {
        newQualityLevel = 'standard';
      } else if (daysSinceAccess > 90 && page.qualityLevel === 'standard') {
        newQualityLevel = 'low';
      }
    }

    if (newQualityLevel !== page.qualityLevel) {
      await prisma.documentPage.update({
        where: { id: pageId },
        data: { 
          qualityLevel: newQualityLevel,
          optimizationApplied: true
        }
      });
    }
  }
}

export const documentPagesOptimizer = new DocumentPagesOptimizer();