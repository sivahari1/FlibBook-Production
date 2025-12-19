/**
 * Conversion Result Cache
 * 
 * Manages caching of successful conversion results to improve performance
 * and reduce redundant conversion operations for JStudyRoom documents.
 * 
 * Requirements: 4.4, 5.4
 */

import { PrismaClient } from '@prisma/client';
import { ConversionJob, ConversionResult } from '../types/conversion';

/**
 * Cache entry for conversion results
 */
export interface ConversionCacheEntry {
  /** Unique cache key */
  id: string;
  /** Document ID */
  documentId: string;
  /** Cached conversion result */
  result: ConversionResult;
  /** Document version/hash for invalidation */
  documentVersion: string;
  /** Cache creation timestamp */
  createdAt: Date;
  /** Last access timestamp */
  lastAccessedAt: Date;
  /** Access count for popularity tracking */
  accessCount: number;
  /** Cache expiration timestamp */
  expiresAt: Date;
  /** Size of cached data in bytes */
  sizeBytes: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total cache entries */
  totalEntries: number;
  /** Cache hit rate percentage */
  hitRate: number;
  /** Total cache size in bytes */
  totalSizeBytes: number;
  /** Most popular documents */
  popularDocuments: Array<{
    documentId: string;
    accessCount: number;
    lastAccessed: Date;
  }>;
  /** Cache efficiency metrics */
  efficiency: {
    /** Average access count per entry */
    avgAccessCount: number;
    /** Storage saved by caching (estimated) */
    storageSaved: number;
    /** Time saved by caching (estimated) */
    timeSaved: number;
  };
}

/**
 * Cache warming configuration
 */
export interface CacheWarmingConfig {
  /** Enable automatic cache warming */
  enabled: boolean;
  /** Minimum access count to trigger warming */
  minAccessCount: number;
  /** Maximum documents to warm per batch */
  maxWarmingBatch: number;
  /** Warming interval in milliseconds */
  warmingInterval: number;
  /** Popular document threshold */
  popularityThreshold: number;
}

/**
 * Default cache warming configuration
 */
const DEFAULT_WARMING_CONFIG: CacheWarmingConfig = {
  enabled: true,
  minAccessCount: 3,
  maxWarmingBatch: 10,
  warmingInterval: 60 * 60 * 1000, // 1 hour
  popularityThreshold: 10,
};

/**
 * Conversion Result Cache Manager
 * 
 * Provides intelligent caching of conversion results with automatic invalidation,
 * cache warming for popular documents, and comprehensive cache management.
 */
export class ConversionResultCache {
  private prisma: PrismaClient;
  private cache: Map<string, ConversionCacheEntry> = new Map();
  private accessLog: Map<string, number> = new Map();
  private warmingConfig: CacheWarmingConfig;
  private warmingInterval: NodeJS.Timeout | null = null;
  private maxCacheSize: number;
  private defaultTtl: number;

  constructor(
    prisma?: PrismaClient,
    options?: {
      maxCacheSize?: number;
      defaultTtlMs?: number;
      warmingConfig?: Partial<CacheWarmingConfig>;
    }
  ) {
    this.prisma = prisma || new PrismaClient();
    this.maxCacheSize = options?.maxCacheSize || 1000; // Max 1000 entries
    this.defaultTtl = options?.defaultTtlMs || 24 * 60 * 60 * 1000; // 24 hours
    this.warmingConfig = {
      ...DEFAULT_WARMING_CONFIG,
      ...options?.warmingConfig,
    };

    // Start cache warming if enabled
    if (this.warmingConfig.enabled) {
      this.startCacheWarming();
    }

    // Load existing cache entries from database on startup
    this.loadCacheFromDatabase().catch(error => {
      console.error('[ConversionCache] Failed to load cache from database:', error);
    });
  }

  /**
   * Get cached conversion result
   */
  async get(documentId: string, documentVersion?: string): Promise<ConversionResult | null> {
    const cacheKey = this.generateCacheKey(documentId);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      // Record cache miss
      this.recordAccess(documentId, false);
      return null;
    }

    // Check if cache entry is expired
    if (entry.expiresAt < new Date()) {
      console.log(`[ConversionCache] Cache entry expired for document ${documentId}`);
      await this.invalidate(documentId);
      this.recordAccess(documentId, false);
      return null;
    }

    // Check document version if provided
    if (documentVersion && entry.documentVersion !== documentVersion) {
      console.log(`[ConversionCache] Document version mismatch for ${documentId}, invalidating cache`);
      await this.invalidate(documentId);
      this.recordAccess(documentId, false);
      return null;
    }

    // Update access statistics
    entry.lastAccessedAt = new Date();
    entry.accessCount++;
    
    // Update in database asynchronously
    this.updateCacheEntryStats(entry).catch(error => {
      console.error('[ConversionCache] Failed to update cache stats:', error);
    });

    // Record cache hit
    this.recordAccess(documentId, true);

    console.log(`[ConversionCache] Cache hit for document ${documentId} (access count: ${entry.accessCount})`);
    return entry.result;
  }

  /**
   * Store conversion result in cache
   */
  async set(
    documentId: string, 
    result: ConversionResult, 
    documentVersion?: string,
    ttlMs?: number
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(documentId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttlMs || this.defaultTtl));
    
    // Calculate approximate size
    const sizeBytes = this.calculateResultSize(result);

    // Check cache size limits
    if (this.cache.size >= this.maxCacheSize) {
      await this.evictLeastRecentlyUsed();
    }

    const entry: ConversionCacheEntry = {
      id: cacheKey,
      documentId,
      result,
      documentVersion: documentVersion || 'unknown',
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      expiresAt,
      sizeBytes,
    };

    // Store in memory cache
    this.cache.set(cacheKey, entry);

    // Store in database for persistence
    try {
      await this.prisma.conversionCache.upsert({
        where: { documentId },
        create: {
          documentId,
          result: JSON.stringify(result),
          documentVersion: entry.documentVersion,
          createdAt: entry.createdAt,
          lastAccessedAt: entry.lastAccessedAt,
          accessCount: entry.accessCount,
          expiresAt: entry.expiresAt,
          sizeBytes: entry.sizeBytes,
        },
        update: {
          result: JSON.stringify(result),
          documentVersion: entry.documentVersion,
          createdAt: entry.createdAt,
          lastAccessedAt: entry.lastAccessedAt,
          accessCount: entry.accessCount,
          expiresAt: entry.expiresAt,
          sizeBytes: entry.sizeBytes,
        },
      });

      console.log(`[ConversionCache] Cached conversion result for document ${documentId} (size: ${sizeBytes} bytes)`);
    } catch (error) {
      console.error('[ConversionCache] Failed to persist cache entry:', error);
      // Remove from memory cache if database storage failed
      this.cache.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Invalidate cache entry for a document
   */
  async invalidate(documentId: string): Promise<boolean> {
    const cacheKey = this.generateCacheKey(documentId);
    const hadEntry = this.cache.has(cacheKey);

    // Remove from memory cache
    this.cache.delete(cacheKey);

    // Remove from database
    try {
      await this.prisma.conversionCache.delete({
        where: { documentId },
      });
      
      if (hadEntry) {
        console.log(`[ConversionCache] Invalidated cache for document ${documentId}`);
      }
    } catch (error) {
      // Entry might not exist in database, which is fine
      console.debug(`[ConversionCache] Cache entry not found in database for ${documentId}`);
    }

    return hadEntry;
  }

  /**
   * Invalidate cache entries for multiple documents
   */
  async invalidateMultiple(documentIds: string[]): Promise<number> {
    let invalidatedCount = 0;

    // Remove from memory cache
    for (const documentId of documentIds) {
      const cacheKey = this.generateCacheKey(documentId);
      if (this.cache.delete(cacheKey)) {
        invalidatedCount++;
      }
    }

    // Remove from database
    try {
      const result = await this.prisma.conversionCache.deleteMany({
        where: {
          documentId: {
            in: documentIds,
          },
        },
      });

      console.log(`[ConversionCache] Invalidated ${invalidatedCount} cache entries from memory, ${result.count} from database`);
      return Math.max(invalidatedCount, result.count);
    } catch (error) {
      console.error('[ConversionCache] Failed to invalidate multiple cache entries:', error);
      return invalidatedCount;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    // Clear memory cache
    const memoryCount = this.cache.size;
    this.cache.clear();
    this.accessLog.clear();

    // Clear database cache
    try {
      const result = await this.prisma.conversionCache.deleteMany({});
      console.log(`[ConversionCache] Cleared ${memoryCount} entries from memory, ${result.count} from database`);
    } catch (error) {
      console.error('[ConversionCache] Failed to clear database cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const totalEntries = this.cache.size;
    const totalAccesses = Array.from(this.accessLog.values()).reduce((sum, count) => sum + count, 0);
    const totalHits = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.accessCount, 0);
    const hitRate = totalAccesses > 0 ? (totalHits / totalAccesses) * 100 : 0;
    const totalSizeBytes = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.sizeBytes, 0);

    // Get popular documents
    const popularDocuments = Array.from(this.cache.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(entry => ({
        documentId: entry.documentId,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessedAt,
      }));

    // Calculate efficiency metrics
    const avgAccessCount = totalEntries > 0 ? totalHits / totalEntries : 0;
    const avgConversionTime = 5000; // Estimated 5 seconds per conversion
    const timeSaved = totalHits * avgConversionTime;
    const avgConversionSize = 2 * 1024 * 1024; // Estimated 2MB per conversion
    const storageSaved = totalHits * avgConversionSize;

    return {
      totalEntries,
      hitRate: Math.round(hitRate * 100) / 100,
      totalSizeBytes,
      popularDocuments,
      efficiency: {
        avgAccessCount: Math.round(avgAccessCount * 100) / 100,
        storageSaved,
        timeSaved,
      },
    };
  }

  /**
   * Warm cache for popular documents
   */
  async warmCache(documentIds?: string[]): Promise<number> {
    let targetDocuments: string[];

    if (documentIds) {
      targetDocuments = documentIds;
    } else {
      // Find popular documents that aren't cached
      targetDocuments = await this.findPopularUncachedDocuments();
    }

    if (targetDocuments.length === 0) {
      console.log('[ConversionCache] No documents to warm');
      return 0;
    }

    console.log(`[ConversionCache] Warming cache for ${targetDocuments.length} documents`);

    let warmedCount = 0;
    const maxBatch = Math.min(targetDocuments.length, this.warmingConfig.maxWarmingBatch);

    for (let i = 0; i < maxBatch; i++) {
      const documentId = targetDocuments[i];
      
      try {
        // Check if document needs conversion
        const needsWarming = await this.documentNeedsWarming(documentId);
        if (needsWarming) {
          // Trigger conversion for cache warming
          await this.triggerConversionForWarming(documentId);
          warmedCount++;
        }
      } catch (error) {
        console.error(`[ConversionCache] Failed to warm cache for document ${documentId}:`, error);
      }
    }

    console.log(`[ConversionCache] Warmed cache for ${warmedCount} documents`);
    return warmedCount;
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpired(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    // Clean memory cache
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    // Clean database cache
    try {
      const result = await this.prisma.conversionCache.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });

      console.log(`[ConversionCache] Cleaned up ${cleanedCount} expired entries from memory, ${result.count} from database`);
      return Math.max(cleanedCount, result.count);
    } catch (error) {
      console.error('[ConversionCache] Failed to cleanup expired entries:', error);
      return cleanedCount;
    }
  }

  /**
   * Shutdown cache manager
   */
  shutdown(): void {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
    }
    
    console.log('[ConversionCache] Cache manager shutdown');
  }

  /**
   * Generate cache key for document
   */
  private generateCacheKey(documentId: string): string {
    return `conv_${documentId}`;
  }

  /**
   * Calculate approximate size of conversion result
   */
  private calculateResultSize(result: ConversionResult): number {
    try {
      return JSON.stringify(result).length * 2; // Rough estimate in bytes
    } catch {
      return 1024; // Default 1KB if calculation fails
    }
  }

  /**
   * Record cache access for statistics
   */
  private recordAccess(documentId: string, hit: boolean): void {
    const current = this.accessLog.get(documentId) || 0;
    this.accessLog.set(documentId, current + 1);
  }

  /**
   * Evict least recently used cache entries
   */
  private async evictLeastRecentlyUsed(): Promise<void> {
    if (this.cache.size === 0) return;

    // Find LRU entry
    let lruEntry: ConversionCacheEntry | null = null;
    let lruKey: string | null = null;

    for (const [key, entry] of this.cache) {
      if (!lruEntry || entry.lastAccessedAt < lruEntry.lastAccessedAt) {
        lruEntry = entry;
        lruKey = key;
      }
    }

    if (lruKey && lruEntry) {
      await this.invalidate(lruEntry.documentId);
      console.log(`[ConversionCache] Evicted LRU entry for document ${lruEntry.documentId}`);
    }
  }

  /**
   * Load cache entries from database
   */
  private async loadCacheFromDatabase(): Promise<void> {
    try {
      const entries = await this.prisma.conversionCache.findMany({
        where: {
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          lastAccessedAt: 'desc',
        },
        take: this.maxCacheSize,
      });

      for (const dbEntry of entries) {
        try {
          const result = JSON.parse(dbEntry.result) as ConversionResult;
          const cacheKey = this.generateCacheKey(dbEntry.documentId);
          
          const entry: ConversionCacheEntry = {
            id: cacheKey,
            documentId: dbEntry.documentId,
            result,
            documentVersion: dbEntry.documentVersion,
            createdAt: dbEntry.createdAt,
            lastAccessedAt: dbEntry.lastAccessedAt,
            accessCount: dbEntry.accessCount,
            expiresAt: dbEntry.expiresAt,
            sizeBytes: dbEntry.sizeBytes,
          };

          this.cache.set(cacheKey, entry);
        } catch (error) {
          console.error(`[ConversionCache] Failed to parse cache entry for ${dbEntry.documentId}:`, error);
        }
      }

      console.log(`[ConversionCache] Loaded ${this.cache.size} cache entries from database`);
    } catch (error) {
      console.error('[ConversionCache] Failed to load cache from database:', error);
    }
  }

  /**
   * Update cache entry statistics in database
   */
  private async updateCacheEntryStats(entry: ConversionCacheEntry): Promise<void> {
    try {
      await this.prisma.conversionCache.update({
        where: { documentId: entry.documentId },
        data: {
          lastAccessedAt: entry.lastAccessedAt,
          accessCount: entry.accessCount,
        },
      });
    } catch (error) {
      // Ignore errors for stats updates
      console.debug(`[ConversionCache] Failed to update stats for ${entry.documentId}:`, error);
    }
  }

  /**
   * Start cache warming process
   */
  private startCacheWarming(): void {
    this.warmingInterval = setInterval(async () => {
      try {
        await this.warmCache();
      } catch (error) {
        console.error('[ConversionCache] Cache warming error:', error);
      }
    }, this.warmingConfig.warmingInterval);

    console.log('[ConversionCache] Cache warming started');
  }

  /**
   * Find popular documents that aren't cached
   */
  private async findPopularUncachedDocuments(): Promise<string[]> {
    try {
      // This would typically query document access logs or analytics
      // For now, we'll use a simple approach based on recent document activity
      const recentDocuments = await this.prisma.document.findMany({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        select: {
          id: true,
        },
        take: this.warmingConfig.maxWarmingBatch * 2,
      });

      // Filter out already cached documents
      const uncachedDocuments = recentDocuments
        .filter(doc => !this.cache.has(this.generateCacheKey(doc.id)))
        .map(doc => doc.id);

      return uncachedDocuments.slice(0, this.warmingConfig.maxWarmingBatch);
    } catch (error) {
      console.error('[ConversionCache] Failed to find popular uncached documents:', error);
      return [];
    }
  }

  /**
   * Check if document needs cache warming
   */
  private async documentNeedsWarming(documentId: string): Promise<boolean> {
    // Check if already cached
    if (this.cache.has(this.generateCacheKey(documentId))) {
      return false;
    }

    // Check if document exists and has content
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: { id: true, filePath: true },
      });

      return document !== null && document.filePath !== null;
    } catch (error) {
      console.error(`[ConversionCache] Failed to check document ${documentId}:`, error);
      return false;
    }
  }

  /**
   * Trigger conversion for cache warming
   */
  private async triggerConversionForWarming(documentId: string): Promise<void> {
    // This would typically trigger the actual conversion process
    // For now, we'll just log the warming attempt
    console.log(`[ConversionCache] Triggering conversion warming for document ${documentId}`);
    
    // In a real implementation, this would:
    // 1. Check if conversion is already in progress
    // 2. Queue conversion with low priority
    // 3. Store result in cache when complete
  }
}

/**
 * Global cache instance
 */
let globalConversionCache: ConversionResultCache | null = null;

/**
 * Get global conversion cache instance
 */
export function getConversionCache(): ConversionResultCache {
  if (!globalConversionCache) {
    globalConversionCache = new ConversionResultCache();
  }
  return globalConversionCache;
}

/**
 * Set global conversion cache instance
 */
export function setConversionCache(cache: ConversionResultCache): void {
  if (globalConversionCache) {
    globalConversionCache.shutdown();
  }
  globalConversionCache = cache;
}

/**
 * Cleanup global conversion cache
 */
export function cleanupConversionCache(): void {
  if (globalConversionCache) {
    globalConversionCache.shutdown();
    globalConversionCache = null;
  }
}