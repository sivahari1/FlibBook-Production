/**
 * Memory Management Utilities for Document Viewers
 * 
 * Provides efficient memory management and performance optimization
 * for large PDF documents and viewer components.
 * 
 * Requirements: 2.2, 3.4, 5.5
 */

export interface MemoryInfo {
  used: number;
  total: number;
  limit: number;
  percentage: number;
}

export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  pageLoadTime: number;
  cacheHitRatio: number;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private memoryThreshold: number = 0.8;
  private maxConcurrentPages: number = 10;
  private cleanupCallbacks: (() => void)[] = [];
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();
  private cache: Map<string, any> = new Map();
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  private constructor() {}

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Get current memory usage information
   */
  getMemoryInfo(): MemoryInfo | null {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return null;
    }

    const memory = (window.performance as any).memory;
    if (!memory) return null;

    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      percentage: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
    };
  }

  /**
   * Check if system is under memory pressure
   */
  isMemoryPressure(): boolean {
    const memoryInfo = this.getMemoryInfo();
    return memoryInfo ? memoryInfo.percentage > this.memoryThreshold : false;
  }

  /**
   * Set memory pressure threshold (0-1)
   */
  setMemoryThreshold(threshold: number): void {
    this.memoryThreshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * Set maximum concurrent pages to keep in memory
   */
  setMaxConcurrentPages(maxPages: number): void {
    this.maxConcurrentPages = Math.max(1, maxPages);
  }

  /**
   * Register a cleanup callback for resource management
   */
  registerCleanup(callback: () => void): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Execute all registered cleanup callbacks
   */
  executeCleanup(): void {
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('[MemoryManager] Cleanup callback failed:', error);
      }
    });
    this.cleanupCallbacks = [];
  }

  /**
   * Implement lazy loading strategy for pages
   */
  shouldLoadPage(
    pageNumber: number,
    currentPage: number,
    totalPages: number,
    loadedPages: Set<number>
  ): boolean {
    // Always load pages within viewport range
    const viewportRange = 3;
    const isInViewport = Math.abs(pageNumber - currentPage) <= viewportRange;

    // Check memory constraints
    const isMemoryAvailable = !this.isMemoryPressure();

    // Check concurrent page limit
    const isWithinPageLimit = loadedPages.size < this.maxConcurrentPages;

    return isInViewport && isMemoryAvailable && isWithinPageLimit;
  }

  /**
   * Get pages that should be unloaded from memory
   */
  getPagesToUnload(
    currentPage: number,
    loadedPages: Set<number>,
    viewportRange: number = 5
  ): number[] {
    return Array.from(loadedPages).filter(
      pageNum => Math.abs(pageNum - currentPage) > viewportRange
    );
  }

  /**
   * Cache management with different strategies
   */
  setCacheItem(key: string, value: any, strategy: 'aggressive' | 'conservative' | 'minimal' = 'conservative'): void {
    if (strategy === 'minimal') {
      return; // No caching
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      strategy,
    });

    // Implement cache size limits based on strategy
    const maxCacheSize = strategy === 'aggressive' ? 100 : 50;
    if (this.cache.size > maxCacheSize) {
      this.evictOldestCacheEntries(maxCacheSize / 2);
    }
  }

  /**
   * Get cached item
   */
  getCacheItem(key: string): any {
    const item = this.cache.get(key);
    if (item) {
      this.cacheHits++;
      return item.value;
    }
    this.cacheMisses++;
    return null;
  }

  /**
   * Clear cache based on strategy
   */
  clearCache(strategy?: 'aggressive' | 'conservative' | 'minimal'): void {
    if (!strategy) {
      this.cache.clear();
      return;
    }

    const entries = Array.from(this.cache.entries());
    entries.forEach(([key, item]) => {
      if (item.strategy === strategy) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Get cache hit ratio for performance monitoring
   */
  getCacheHitRatio(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? this.cacheHits / total : 0;
  }

  /**
   * Record performance metrics
   */
  recordMetrics(documentId: string, metrics: Partial<PerformanceMetrics>): void {
    const existing = this.performanceMetrics.get(documentId) || {
      renderTime: 0,
      memoryUsage: 0,
      pageLoadTime: 0,
      cacheHitRatio: 0,
    };

    this.performanceMetrics.set(documentId, {
      ...existing,
      ...metrics,
      cacheHitRatio: this.getCacheHitRatio(),
    });
  }

  /**
   * Get performance metrics for a document
   */
  getMetrics(documentId: string): PerformanceMetrics | null {
    return this.performanceMetrics.get(documentId) || null;
  }

  /**
   * Optimize browser cache headers
   */
  optimizeBrowserCache(url: string, strategy: 'aggressive' | 'conservative' | 'minimal'): string {
    if (typeof window === 'undefined') return url;

    const cacheControl = {
      aggressive: 'public, max-age=86400, immutable', // 24 hours
      conservative: 'public, max-age=3600', // 1 hour
      minimal: 'no-cache',
    }[strategy];

    // For same-origin requests, we can't modify headers directly
    // But we can add cache-busting parameters for minimal strategy
    if (strategy === 'minimal') {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}_t=${Date.now()}`;
    }

    return url;
  }

  /**
   * Force garbage collection (development only)
   */
  forceGarbageCollection(): void {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
        console.log('[MemoryManager] Forced garbage collection');
      } catch (error) {
        console.warn('[MemoryManager] Garbage collection not available');
      }
    }
  }

  /**
   * Monitor memory usage and trigger cleanup when needed
   */
  startMemoryMonitoring(interval: number = 5000): NodeJS.Timeout {
    return setInterval(() => {
      const memoryInfo = this.getMemoryInfo();
      if (memoryInfo && memoryInfo.percentage > this.memoryThreshold) {
        console.warn(`[MemoryManager] Memory pressure detected: ${Math.round(memoryInfo.percentage * 100)}%`);
        this.executeCleanup();
        
        if (memoryInfo.percentage > 0.9) {
          // Critical memory pressure - force GC
          this.forceGarbageCollection();
        }
      }
    }, interval);
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
  }

  /**
   * Private method to evict oldest cache entries
   */
  private evictOldestCacheEntries(keepCount: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    const toRemove = entries.slice(0, entries.length - keepCount);
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  /**
   * Get memory management statistics
   */
  getStatistics() {
    const memoryInfo = this.getMemoryInfo();
    return {
      memoryInfo,
      cacheSize: this.cache.size,
      cacheHitRatio: this.getCacheHitRatio(),
      cleanupCallbacks: this.cleanupCallbacks.length,
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      isMemoryPressure: this.isMemoryPressure(),
    };
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance();

// Utility functions for common memory management tasks
export const memoryUtils = {
  /**
   * Create a debounced cleanup function
   */
  createDebouncedCleanup(cleanup: () => void, delay: number = 1000): () => void {
    let timeoutId: NodeJS.Timeout;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(cleanup, delay);
    };
  },

  /**
   * Create a throttled memory check function
   */
  createThrottledMemoryCheck(callback: (memoryInfo: MemoryInfo) => void, interval: number = 5000): () => void {
    let lastCheck = 0;
    return () => {
      const now = Date.now();
      if (now - lastCheck >= interval) {
        const memoryInfo = memoryManager.getMemoryInfo();
        if (memoryInfo) {
          callback(memoryInfo);
        }
        lastCheck = now;
      }
    };
  },

  /**
   * Calculate optimal viewport range based on memory constraints
   */
  calculateOptimalViewportRange(totalPages: number, memoryInfo: MemoryInfo | null): number {
    if (!memoryInfo) return 3; // Default range

    // Adjust viewport range based on memory pressure
    if (memoryInfo.percentage > 0.8) return 1; // Minimal range under pressure
    if (memoryInfo.percentage > 0.6) return 2; // Reduced range
    if (totalPages > 100) return 2; // Reduced range for large documents
    
    return 3; // Default range
  },

  /**
   * Estimate memory usage for a page
   */
  estimatePageMemoryUsage(pageWidth: number, pageHeight: number, quality: number = 1): number {
    // Rough estimate: width * height * 4 bytes per pixel * quality factor
    return pageWidth * pageHeight * 4 * quality;
  },
};