/**
 * Cache Manager - Performance Optimization for Flipbook
 * 
 * Implements multi-level caching strategies for:
 * - Converted page images (7-day TTL)
 * - Annotation data (in-memory cache)
 * - Browser cache for static assets
 * 
 * Requirements: 2.4, 2.5, 17.4, 20.2
 */

export interface CacheOptions {
  /**
   * Time-to-live for page cache in seconds
   * @default 604800 (7 days)
   */
  pageCacheTTL?: number;

  /**
   * Time-to-live for annotation cache in seconds
   * @default 300 (5 minutes)
   */
  annotationCacheTTL?: number;

  /**
   * Maximum number of pages to keep in memory
   * @default 50
   */
  maxPagesInMemory?: number;

  /**
   * Maximum number of annotation sets to keep in memory
   * @default 20
   */
  maxAnnotationsInMemory?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * LRU (Least Recently Used) Cache implementation
 */
class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessOrder: string[] = [];
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  set(key: string, value: T, ttl: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: now,
      expiresAt: now + ttl * 1000,
    };

    // Remove if already exists to update access order
    if (this.cache.has(key)) {
      this.remove(key);
    }

    // Add to cache
    this.cache.set(key, entry);
    this.accessOrder.push(key);

    // Evict oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.remove(key);
      return null;
    }

    // Update access order
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    this.accessOrder.push(key);

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.remove(key);
      return false;
    }
    
    return true;
  }

  remove(key: string): void {
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

/**
 * CacheManager handles multi-level caching for flipbook data
 */
export class CacheManager {
  private pageCache: LRUCache<string>;
  private annotationCache: LRUCache<any[]>;
  private options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.options = {
      pageCacheTTL: options.pageCacheTTL ?? 604800, // 7 days
      annotationCacheTTL: options.annotationCacheTTL ?? 300, // 5 minutes
      maxPagesInMemory: options.maxPagesInMemory ?? 50,
      maxAnnotationsInMemory: options.maxAnnotationsInMemory ?? 20,
    };

    this.pageCache = new LRUCache<string>(this.options.maxPagesInMemory);
    this.annotationCache = new LRUCache<any[]>(this.options.maxAnnotationsInMemory);
  }

  /**
   * Cache a page image URL
   */
  cachePage(documentId: string, pageNumber: number, imageUrl: string): void {
    const key = this.getPageCacheKey(documentId, pageNumber);
    this.pageCache.set(key, imageUrl, this.options.pageCacheTTL);
  }

  /**
   * Get cached page image URL
   */
  getCachedPage(documentId: string, pageNumber: number): string | null {
    const key = this.getPageCacheKey(documentId, pageNumber);
    return this.pageCache.get(key);
  }

  /**
   * Check if page is cached
   */
  hasPageCached(documentId: string, pageNumber: number): boolean {
    const key = this.getPageCacheKey(documentId, pageNumber);
    return this.pageCache.has(key);
  }

  /**
   * Cache annotations for a document page
   */
  cacheAnnotations(documentId: string, pageNumber: number, annotations: any[]): void {
    const key = this.getAnnotationCacheKey(documentId, pageNumber);
    this.annotationCache.set(key, annotations, this.options.annotationCacheTTL);
  }

  /**
   * Get cached annotations
   */
  getCachedAnnotations(documentId: string, pageNumber: number): any[] | null {
    const key = this.getAnnotationCacheKey(documentId, pageNumber);
    return this.annotationCache.get(key);
  }

  /**
   * Check if annotations are cached
   */
  hasAnnotationsCached(documentId: string, pageNumber: number): boolean {
    const key = this.getAnnotationCacheKey(documentId, pageNumber);
    return this.annotationCache.has(key);
  }

  /**
   * Invalidate page cache for a document
   */
  invalidatePageCache(documentId: string): void {
    const keys = this.pageCache.keys();
    keys.forEach((key) => {
      if (key.startsWith(`page:${documentId}:`)) {
        this.pageCache.remove(key);
      }
    });
  }

  /**
   * Invalidate annotation cache for a document
   */
  invalidateAnnotationCache(documentId: string, pageNumber?: number): void {
    if (pageNumber !== undefined) {
      const key = this.getAnnotationCacheKey(documentId, pageNumber);
      this.annotationCache.remove(key);
    } else {
      const keys = this.annotationCache.keys();
      keys.forEach((key) => {
        if (key.startsWith(`annotation:${documentId}:`)) {
          this.annotationCache.remove(key);
        }
      });
    }
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.pageCache.clear();
    this.annotationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    pages: { size: number; maxSize: number };
    annotations: { size: number; maxSize: number };
  } {
    return {
      pages: {
        size: this.pageCache.size(),
        maxSize: this.options.maxPagesInMemory,
      },
      annotations: {
        size: this.annotationCache.size(),
        maxSize: this.options.maxAnnotationsInMemory,
      },
    };
  }

  /**
   * Generate cache key for page
   */
  private getPageCacheKey(documentId: string, pageNumber: number): string {
    return `page:${documentId}:${pageNumber}`;
  }

  /**
   * Generate cache key for annotations
   */
  private getAnnotationCacheKey(documentId: string, pageNumber: number): string {
    return `annotation:${documentId}:${pageNumber}`;
  }
}

/**
 * Browser Cache Headers Helper
 * Generates appropriate cache headers for API responses
 */
export class BrowserCacheHeaders {
  /**
   * Get cache headers for page images (long-term caching)
   */
  static getPageImageHeaders(): Record<string, string> {
    return {
      'Cache-Control': 'public, max-age=604800, immutable', // 7 days
      'CDN-Cache-Control': 'public, max-age=2592000', // 30 days for CDN
    };
  }

  /**
   * Get cache headers for annotations (short-term caching)
   */
  static getAnnotationHeaders(): Record<string, string> {
    return {
      'Cache-Control': 'private, max-age=300', // 5 minutes
    };
  }

  /**
   * Get cache headers for media files (medium-term caching)
   */
  static getMediaHeaders(): Record<string, string> {
    return {
      'Cache-Control': 'private, max-age=3600', // 1 hour
    };
  }

  /**
   * Get no-cache headers for dynamic content
   */
  static getNoCacheHeaders(): Record<string, string> {
    return {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
  }
}

/**
 * Singleton instance for global cache management
 */
let globalCacheManager: CacheManager | null = null;

export function getGlobalCacheManager(options?: CacheOptions): CacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new CacheManager(options);
  }
  return globalCacheManager;
}

/**
 * React hook for using CacheManager
 */
export function useCacheManager(options?: CacheOptions): CacheManager {
  return getGlobalCacheManager(options);
}
