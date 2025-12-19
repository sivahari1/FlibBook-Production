/**
 * Document Cache Manager - Comprehensive caching strategy for JStudyRoom documents
 * 
 * Implements multi-layer caching:
 * - Browser cache: 7 days for page images
 * - CDN cache: 30 days for processed pages
 * - Memory cache: Recently viewed pages
 * - Persistent cache: Frequently accessed documents
 * 
 * Requirements: 4.4, 5.4
 */

export interface CacheConfig {
  // Browser cache settings
  browserCacheTTL: number; // Time to live in seconds (default: 7 days)
  browserCacheStrategy: 'aggressive' | 'conservative' | 'minimal';
  
  // CDN cache settings
  cdnCacheTTL: number; // Time to live in seconds (default: 30 days)
  cdnCacheControl: string;
  
  // Memory cache settings
  memoryCacheSize: number; // Maximum number of pages in memory
  memoryCacheTTL: number; // Memory cache TTL in milliseconds
  
  // Persistent cache settings
  persistentCacheEnabled: boolean;
  persistentCacheSize: number; // Maximum size in MB
  
  // Cache invalidation settings
  enableCacheInvalidation: boolean;
  invalidationStrategy: 'immediate' | 'lazy' | 'scheduled';
}

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Size in bytes
  ttl: number; // Time to live in milliseconds
  metadata: {
    documentId: string;
    pageNumber?: number;
    contentType: string;
    version: string;
  };
}

export interface CacheStats {
  memoryCache: {
    size: number;
    entries: number;
    hitRate: number;
    missRate: number;
  };
  browserCache: {
    strategy: string;
    ttl: number;
    estimatedSize: number;
  };
  cdnCache: {
    ttl: number;
    hitRate: number;
    bandwidth: number;
  };
  performance: {
    averageLoadTime: number;
    cacheEfficiency: number;
    memoryUsage: number;
  };
}

export class DocumentCacheManager {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private accessLog: Map<string, number[]> = new Map();
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      // Browser cache: 7 days
      browserCacheTTL: 7 * 24 * 60 * 60, // 7 days in seconds
      browserCacheStrategy: 'conservative',
      
      // CDN cache: 30 days
      cdnCacheTTL: 30 * 24 * 60 * 60, // 30 days in seconds
      cdnCacheControl: 'public, max-age=2592000, immutable', // 30 days
      
      // Memory cache: Recently viewed pages
      memoryCacheSize: 50, // 50 pages
      memoryCacheTTL: 30 * 60 * 1000, // 30 minutes
      
      // Persistent cache
      persistentCacheEnabled: true,
      persistentCacheSize: 100, // 100 MB
      
      // Cache invalidation
      enableCacheInvalidation: true,
      invalidationStrategy: 'lazy',
      
      ...config,
    };

    this.stats = this.initializeStats();
    this.startCleanupScheduler();
  }

  /**
   * Get cache headers for browser caching
   */
  getBrowserCacheHeaders(contentType: string = 'image/jpeg'): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': contentType,
    };

    switch (this.config.browserCacheStrategy) {
      case 'aggressive':
        headers['Cache-Control'] = `public, max-age=${this.config.browserCacheTTL}, immutable`;
        headers['Expires'] = new Date(Date.now() + this.config.browserCacheTTL * 1000).toUTCString();
        break;
        
      case 'conservative':
        headers['Cache-Control'] = `public, max-age=${this.config.browserCacheTTL}`;
        headers['ETag'] = this.generateETag();
        break;
        
      case 'minimal':
        headers['Cache-Control'] = 'public, max-age=3600'; // 1 hour only
        headers['ETag'] = this.generateETag();
        break;
    }

    return headers;
  }

  /**
   * Get CDN cache headers for processed pages
   */
  getCDNCacheHeaders(): Record<string, string> {
    return {
      'Cache-Control': this.config.cdnCacheControl,
      'Expires': new Date(Date.now() + this.config.cdnCacheTTL * 1000).toUTCString(),
      'Vary': 'Accept-Encoding',
      'X-Cache-Strategy': 'cdn-optimized',
    };
  }

  /**
   * Store page in memory cache
   */
  async setPageCache(
    documentId: string,
    pageNumber: number,
    data: any,
    contentType: string = 'image/jpeg'
  ): Promise<void> {
    const key = this.generateCacheKey(documentId, pageNumber);
    const size = this.estimateDataSize(data);
    
    // Check if we need to evict entries
    await this.ensureCacheSpace(size);
    
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
      ttl: this.config.memoryCacheTTL,
      metadata: {
        documentId,
        pageNumber,
        contentType,
        version: this.generateVersion(),
      },
    };

    this.memoryCache.set(key, entry);
    this.updateAccessLog(key);
    this.updateStats('set', key, true);
    
    console.log(`[Cache] Stored page ${pageNumber} for document ${documentId} (${this.formatSize(size)})`);
  }

  /**
   * Get page from memory cache
   */
  async getPageCache(documentId: string, pageNumber: number): Promise<any | null> {
    const key = this.generateCacheKey(documentId, pageNumber);
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      this.updateStats('get', key, false);
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      this.updateStats('get', key, false);
      console.log(`[Cache] Expired entry removed: ${key}`);
      return null;
    }

    // Update access information
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateAccessLog(key);
    this.updateStats('get', key, true);
    
    console.log(`[Cache] Cache hit for page ${pageNumber} of document ${documentId}`);
    return entry.data;
  }

  /**
   * Store document metadata in cache
   */
  async setDocumentCache(documentId: string, metadata: any): Promise<void> {
    const key = this.generateDocumentCacheKey(documentId);
    const size = this.estimateDataSize(metadata);
    
    await this.ensureCacheSpace(size);
    
    const entry: CacheEntry = {
      key,
      data: metadata,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
      ttl: this.config.memoryCacheTTL * 2, // Document metadata lives longer
      metadata: {
        documentId,
        contentType: 'application/json',
        version: this.generateVersion(),
      },
    };

    this.memoryCache.set(key, entry);
    this.updateAccessLog(key);
  }

  /**
   * Get document metadata from cache
   */
  async getDocumentCache(documentId: string): Promise<any | null> {
    const key = this.generateDocumentCacheKey(documentId);
    const entry = this.memoryCache.get(key);
    
    if (!entry || Date.now() - entry.timestamp > entry.ttl) {
      if (entry) {
        this.memoryCache.delete(key);
      }
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateAccessLog(key);
    
    return entry.data;
  }

  /**
   * Invalidate cache for a specific document
   */
  async invalidateDocument(documentId: string): Promise<void> {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.metadata.documentId === documentId) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.memoryCache.delete(key);
      console.log(`[Cache] Invalidated cache entry: ${key}`);
    });
    
    console.log(`[Cache] Invalidated ${keysToDelete.length} entries for document ${documentId}`);
  }

  /**
   * Invalidate cache for a specific page
   */
  async invalidatePage(documentId: string, pageNumber: number): Promise<void> {
    const key = this.generateCacheKey(documentId, pageNumber);
    const deleted = this.memoryCache.delete(key);
    
    if (deleted) {
      console.log(`[Cache] Invalidated page ${pageNumber} for document ${documentId}`);
    }
  }

  /**
   * Clear all cache entries
   */
  async clearCache(): Promise<void> {
    const entriesCount = this.memoryCache.size;
    this.memoryCache.clear();
    this.accessLog.clear();
    this.stats = this.initializeStats();
    
    console.log(`[Cache] Cleared ${entriesCount} cache entries`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Optimize cache based on usage patterns
   */
  async optimizeCache(): Promise<void> {
    console.log('[Cache] Starting cache optimization...');
    
    // Remove least recently used entries if memory pressure
    if (this.memoryCache.size > this.config.memoryCacheSize * 0.8) {
      await this.evictLRUEntries(Math.floor(this.config.memoryCacheSize * 0.2));
    }
    
    // Remove entries with low access frequency
    await this.evictLowFrequencyEntries();
    
    // Update cache statistics
    this.updateCacheStats();
    
    console.log('[Cache] Cache optimization completed');
  }

  /**
   * Preload frequently accessed pages
   */
  async preloadFrequentPages(documentId: string, pageNumbers: number[]): Promise<void> {
    console.log(`[Cache] Preloading ${pageNumbers.length} pages for document ${documentId}`);
    
    // This would typically fetch from storage and cache
    // For now, we'll just mark these as high priority
    for (const pageNumber of pageNumbers) {
      const key = this.generateCacheKey(documentId, pageNumber);
      this.markHighPriority(key);
    }
  }

  /**
   * Get cache efficiency metrics
   */
  getCacheEfficiency(): number {
    const totalRequests = this.stats.memoryCache.hitRate + this.stats.memoryCache.missRate;
    if (totalRequests === 0) return 0;
    
    return (this.stats.memoryCache.hitRate / totalRequests) * 100;
  }

  /**
   * Cleanup expired entries and optimize memory usage
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => {
      this.memoryCache.delete(key);
    });
    
    if (expiredKeys.length > 0) {
      console.log(`[Cache] Cleaned up ${expiredKeys.length} expired entries`);
    }
    
    // Update statistics
    this.updateCacheStats();
  }

  /**
   * Ensure there's enough space in cache for new entry
   */
  private async ensureCacheSpace(requiredSize: number): Promise<void> {
    const currentSize = this.getCurrentCacheSize();
    const maxSize = this.config.persistentCacheSize * 1024 * 1024; // Convert MB to bytes
    
    if (currentSize + requiredSize > maxSize) {
      const bytesToFree = (currentSize + requiredSize) - maxSize;
      await this.evictLRUEntries(Math.ceil(bytesToFree / (currentSize / this.memoryCache.size)));
    }
  }

  /**
   * Evict least recently used entries
   */
  private async evictLRUEntries(count: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
      .slice(0, count);
    
    entries.forEach(([key]) => {
      this.memoryCache.delete(key);
    });
    
    console.log(`[Cache] Evicted ${entries.length} LRU entries`);
  }

  /**
   * Evict entries with low access frequency
   */
  private async evictLowFrequencyEntries(): Promise<void> {
    const threshold = 2; // Minimum access count
    const keysToEvict: string[] = [];
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.accessCount < threshold) {
        keysToEvict.push(key);
      }
    }
    
    keysToEvict.forEach(key => {
      this.memoryCache.delete(key);
    });
    
    if (keysToEvict.length > 0) {
      console.log(`[Cache] Evicted ${keysToEvict.length} low-frequency entries`);
    }
  }

  /**
   * Generate cache key for page
   */
  private generateCacheKey(documentId: string, pageNumber: number): string {
    return `page:${documentId}:${pageNumber}`;
  }

  /**
   * Generate cache key for document metadata
   */
  private generateDocumentCacheKey(documentId: string): string {
    return `doc:${documentId}`;
  }

  /**
   * Generate ETag for cache validation
   */
  private generateETag(): string {
    return `"${Date.now().toString(36)}-${Math.random().toString(36).substr(2)}"`;
  }

  /**
   * Generate version string
   */
  private generateVersion(): string {
    return Date.now().toString(36);
  }

  /**
   * Estimate data size in bytes
   */
  private estimateDataSize(data: any): number {
    if (typeof data === 'string') {
      return data.length * 2; // UTF-16 encoding
    }
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    }
    if (data instanceof Blob) {
      return data.size;
    }
    // Rough estimate for objects
    return JSON.stringify(data).length * 2;
  }

  /**
   * Get current cache size in bytes
   */
  private getCurrentCacheSize(): number {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  /**
   * Format size in human-readable format
   */
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Update access log for cache entry
   */
  private updateAccessLog(key: string): void {
    const log = this.accessLog.get(key) || [];
    log.push(Date.now());
    
    // Keep only last 10 accesses
    if (log.length > 10) {
      log.splice(0, log.length - 10);
    }
    
    this.accessLog.set(key, log);
  }

  /**
   * Mark entry as high priority
   */
  private markHighPriority(key: string): void {
    const entry = this.memoryCache.get(key);
    if (entry) {
      entry.ttl = this.config.memoryCacheTTL * 2; // Double TTL for high priority
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(operation: 'get' | 'set', key: string, hit: boolean): void {
    if (operation === 'get') {
      if (hit) {
        this.stats.memoryCache.hitRate++;
      } else {
        this.stats.memoryCache.missRate++;
      }
    }
  }

  /**
   * Update comprehensive cache statistics
   */
  private updateCacheStats(): void {
    this.stats.memoryCache.size = this.getCurrentCacheSize();
    this.stats.memoryCache.entries = this.memoryCache.size;
    
    const totalRequests = this.stats.memoryCache.hitRate + this.stats.memoryCache.missRate;
    if (totalRequests > 0) {
      this.stats.performance.cacheEfficiency = (this.stats.memoryCache.hitRate / totalRequests) * 100;
    }
    
    this.stats.performance.memoryUsage = this.getCurrentCacheSize();
  }

  /**
   * Initialize cache statistics
   */
  private initializeStats(): CacheStats {
    return {
      memoryCache: {
        size: 0,
        entries: 0,
        hitRate: 0,
        missRate: 0,
      },
      browserCache: {
        strategy: this.config.browserCacheStrategy,
        ttl: this.config.browserCacheTTL,
        estimatedSize: 0,
      },
      cdnCache: {
        ttl: this.config.cdnCacheTTL,
        hitRate: 0,
        bandwidth: 0,
      },
      performance: {
        averageLoadTime: 0,
        cacheEfficiency: 0,
        memoryUsage: 0,
      },
    };
  }

  /**
   * Start cleanup scheduler
   */
  private startCleanupScheduler(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup scheduler
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clearCache();
  }
}

// Export singleton instance
export const documentCacheManager = new DocumentCacheManager();