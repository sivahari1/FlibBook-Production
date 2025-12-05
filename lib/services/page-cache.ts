/**
 * Page Cache Management Service
 * 
 * Manages caching of converted PDF pages to avoid redundant processing.
 * Implements TTL-based caching and efficient cache invalidation.
 * 
 * Requirements: 2.4, 2.5, 17.4
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getDocumentPageUrl } from '@/lib/supabase-storage';

export interface PageCacheEntry {
  id: string;
  documentId: string;
  pageNumber: number;
  pageUrl: string;
  fileSize: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface CacheStats {
  totalPages: number;
  totalSize: number;
  oldestPage: Date | null;
  newestPage: Date | null;
}

const CACHE_TTL_DAYS = 7; // 7-day cache TTL as per requirements

/**
 * Check if cached pages exist for a document
 * 
 * @param documentId Document ID
 * @returns True if valid cached pages exist
 */
export async function hasCachedPages(documentId: string): Promise<boolean> {
  try {
    const count = await prisma.documentPage.count({
      where: {
        documentId,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return count > 0;
  } catch (error) {
    logger.error('Failed to check cached pages', { documentId, error });
    return false;
  }
}

/**
 * Get cached page URLs for a document
 * 
 * @param documentId Document ID
 * @returns Array of page URLs in order
 */
export async function getCachedPageUrls(documentId: string): Promise<string[]> {
  try {
    const pages = await prisma.documentPage.findMany({
      where: {
        documentId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        pageNumber: 'asc',
      },
      select: {
        pageUrl: true,
      },
    });

    return pages.map((p) => p.pageUrl);
  } catch (error) {
    logger.error('Failed to get cached page URLs', { documentId, error });
    return [];
  }
}

/**
 * Cache converted pages in database
 * 
 * @param documentId Document ID
 * @param pageUrls Array of page URLs
 * @param pageSizes Array of page file sizes (optional)
 */
export async function cachePages(
  documentId: string,
  pageUrls: string[],
  pageSizes?: number[]
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    // Delete existing cache entries
    await prisma.documentPage.deleteMany({
      where: { documentId },
    });

    // Create new cache entries
    const cacheEntries = pageUrls.map((url, index) => ({
      documentId,
      pageNumber: index + 1,
      pageUrl: url,
      fileSize: pageSizes?.[index] || 0,
      expiresAt,
    }));

    await prisma.documentPage.createMany({
      data: cacheEntries,
    });

    logger.info('Cached pages successfully', {
      documentId,
      pageCount: pageUrls.length,
      expiresAt,
    });
  } catch (error) {
    logger.error('Failed to cache pages', { documentId, error });
    throw error;
  }
}

/**
 * Invalidate cache for a document
 * 
 * @param documentId Document ID
 */
export async function invalidateCache(documentId: string): Promise<void> {
  try {
    await prisma.documentPage.deleteMany({
      where: { documentId },
    });

    logger.info('Cache invalidated', { documentId });
  } catch (error) {
    logger.error('Failed to invalidate cache', { documentId, error });
  }
}

/**
 * Clean up expired cache entries
 * 
 * @returns Number of entries deleted
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const result = await prisma.documentPage.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    logger.info('Cleaned up expired cache entries', { count: result.count });
    return result.count;
  } catch (error) {
    logger.error('Failed to cleanup expired cache', { error });
    return 0;
  }
}

/**
 * Get cache statistics for a document
 * 
 * @param documentId Document ID
 * @returns Cache statistics
 */
export async function getCacheStats(documentId: string): Promise<CacheStats> {
  try {
    const pages = await prisma.documentPage.findMany({
      where: { documentId },
      select: {
        fileSize: true,
        createdAt: true,
      },
    });

    if (pages.length === 0) {
      return {
        totalPages: 0,
        totalSize: 0,
        oldestPage: null,
        newestPage: null,
      };
    }

    const totalSize = pages.reduce((sum, p) => sum + p.fileSize, 0);
    const dates = pages.map((p) => p.createdAt);

    return {
      totalPages: pages.length,
      totalSize,
      oldestPage: new Date(Math.min(...dates.map((d) => d.getTime()))),
      newestPage: new Date(Math.max(...dates.map((d) => d.getTime()))),
    };
  } catch (error) {
    logger.error('Failed to get cache stats', { documentId, error });
    return {
      totalPages: 0,
      totalSize: 0,
      oldestPage: null,
      newestPage: null,
    };
  }
}

/**
 * Get total cache size across all documents
 * 
 * @returns Total size in bytes
 */
export async function getTotalCacheSize(): Promise<number> {
  try {
    const result = await prisma.documentPage.aggregate({
      _sum: {
        fileSize: true,
      },
    });

    return result._sum.fileSize || 0;
  } catch (error) {
    logger.error('Failed to get total cache size', { error });
    return 0;
  }
}

/**
 * Refresh cache TTL for a document
 * 
 * @param documentId Document ID
 */
export async function refreshCacheTTL(documentId: string): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    await prisma.documentPage.updateMany({
      where: { documentId },
      data: { expiresAt },
    });

    logger.info('Cache TTL refreshed', { documentId, expiresAt });
  } catch (error) {
    logger.error('Failed to refresh cache TTL', { documentId, error });
  }
}
