/**
 * Memory Manager - Performance Optimization for Memory Usage
 * 
 * Implements memory management strategies for flipbook viewer:
 * - Clean up unused page images
 * - Limit number of cached pages
 * - Monitor and prevent memory leaks
 * 
 * Requirements: 17.3, 20.4
 */

export interface MemoryManagerOptions {
  /**
   * Maximum number of pages to keep in memory
   * @default 10
   */
  maxPagesInMemory?: number;

  /**
   * Number of pages to keep around current page
   * @default 3
   */
  keepAroundCurrent?: number;

  /**
   * Enable automatic cleanup
   * @default true
   */
  autoCleanup?: boolean;

  /**
   * Cleanup interval in milliseconds
   * @default 30000 (30 seconds)
   */
  cleanupInterval?: number;

  /**
   * Memory threshold for aggressive cleanup (in MB)
   * @default 100
   */
  memoryThreshold?: number;

  /**
   * Enable memory monitoring
   * @default true
   */
  enableMonitoring?: boolean;
}

export interface PageMemoryInfo {
  pageNumber: number;
  imageUrl: string;
  imageElement: HTMLImageElement | null;
  lastAccessed: number;
  memorySize: number; // Estimated size in bytes
}

export interface MemoryStats {
  totalPages: number;
  pagesInMemory: number;
  estimatedMemoryUsage: number; // in MB
  lastCleanup: number;
  cleanupCount: number;
}

/**
 * MemoryManager handles memory optimization for flipbook pages
 */
export class MemoryManager {
  private pages: Map<number, PageMemoryInfo> = new Map();
  private options: Required<MemoryManagerOptions>;
  private currentPage: number = 0;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private stats: MemoryStats = {
    totalPages: 0,
    pagesInMemory: 0,
    estimatedMemoryUsage: 0,
    lastCleanup: Date.now(),
    cleanupCount: 0,
  };

  constructor(options: MemoryManagerOptions = {}) {
    this.options = {
      maxPagesInMemory: options.maxPagesInMemory ?? 10,
      keepAroundCurrent: options.keepAroundCurrent ?? 3,
      autoCleanup: options.autoCleanup ?? true,
      cleanupInterval: options.cleanupInterval ?? 30000,
      memoryThreshold: options.memoryThreshold ?? 100,
      enableMonitoring: options.enableMonitoring ?? true,
    };

    if (this.options.autoCleanup) {
      this.startAutoCleanup();
    }

    if (this.options.enableMonitoring) {
      this.startMemoryMonitoring();
    }
  }

  /**
   * Register a page in memory
   */
  registerPage(
    pageNumber: number,
    imageUrl: string,
    imageElement: HTMLImageElement | null = null
  ): void {
    const memorySize = this.estimateImageSize(imageElement);

    this.pages.set(pageNumber, {
      pageNumber,
      imageUrl,
      imageElement,
      lastAccessed: Date.now(),
      memorySize,
    });

    this.updateStats();

    // Trigger cleanup if over limit
    if (this.pages.size > this.options.maxPagesInMemory) {
      this.cleanup();
    }
  }

  /**
   * Update current page
   */
  setCurrentPage(pageNumber: number): void {
    this.currentPage = pageNumber;
    
    // Update last accessed time for current page
    const page = this.pages.get(pageNumber);
    if (page) {
      page.lastAccessed = Date.now();
    }
  }

  /**
   * Get page info
   */
  getPage(pageNumber: number): PageMemoryInfo | undefined {
    const page = this.pages.get(pageNumber);
    if (page) {
      page.lastAccessed = Date.now();
    }
    return page;
  }

  /**
   * Remove a page from memory
   */
  removePage(pageNumber: number): void {
    const page = this.pages.get(pageNumber);
    if (page) {
      // Clear image element to free memory
      if (page.imageElement) {
        page.imageElement.src = '';
        page.imageElement = null;
      }
      this.pages.delete(pageNumber);
      this.updateStats();
    }
  }

  /**
   * Cleanup unused pages
   */
  cleanup(aggressive: boolean = false): void {
    const pagesToKeep = new Set<number>();

    // Always keep pages around current page
    const keepRange = aggressive ? 1 : this.options.keepAroundCurrent;
    for (let i = -keepRange; i <= keepRange; i++) {
      pagesToKeep.add(this.currentPage + i);
    }

    // Get pages sorted by last accessed time
    const pagesByAccess = Array.from(this.pages.values()).sort(
      (a, b) => b.lastAccessed - a.lastAccessed
    );

    // Determine how many pages to remove
    const targetSize = aggressive
      ? Math.floor(this.options.maxPagesInMemory * 0.5)
      : this.options.maxPagesInMemory;

    const pagesToRemove: number[] = [];

    // Remove oldest pages that are not in keep range
    for (const page of pagesByAccess) {
      if (this.pages.size - pagesToRemove.length <= targetSize) {
        break;
      }

      if (!pagesToKeep.has(page.pageNumber)) {
        pagesToRemove.push(page.pageNumber);
      }
    }

    // Remove pages
    pagesToRemove.forEach((pageNum) => this.removePage(pageNum));

    this.stats.lastCleanup = Date.now();
    this.stats.cleanupCount++;

    if (pagesToRemove.length > 0) {
      console.log(`Cleaned up ${pagesToRemove.length} pages from memory`);
    }
  }

  /**
   * Clear all pages from memory
   */
  clearAll(): void {
    this.pages.forEach((page) => {
      if (page.imageElement) {
        page.imageElement.src = '';
        page.imageElement = null;
      }
    });
    this.pages.clear();
    this.updateStats();
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    return { ...this.stats };
  }

  /**
   * Check if memory usage is high
   */
  isMemoryHigh(): boolean {
    return this.stats.estimatedMemoryUsage > this.options.memoryThreshold;
  }

  /**
   * Force garbage collection (if available)
   */
  forceGarbageCollection(): void {
    // Note: This only works in specific environments (Node.js with --expose-gc flag)
    if (typeof global !== 'undefined' && (global as any).gc) {
      (global as any).gc();
      console.log('Forced garbage collection');
    }
  }

  /**
   * Start automatic cleanup
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      if (this.isMemoryHigh()) {
        this.cleanup(true); // Aggressive cleanup
      } else {
        this.cleanup(false); // Normal cleanup
      }
    }, this.options.cleanupInterval);
  }

  /**
   * Stop automatic cleanup
   */
  private stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Check for Performance Memory API
    const perf = performance as any;
    if (perf.memory) {
      setInterval(() => {
        const memoryInfo = perf.memory;
        const usedMemoryMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
        
        // Trigger aggressive cleanup if memory is high
        if (usedMemoryMB > this.options.memoryThreshold * 2) {
          console.warn(`High memory usage detected: ${usedMemoryMB.toFixed(2)} MB`);
          this.cleanup(true);
        }
      }, 10000); // Check every 10 seconds
    }
  }

  /**
   * Estimate image size in bytes
   */
  private estimateImageSize(imageElement: HTMLImageElement | null): number {
    if (!imageElement) return 0;

    // Estimate: width * height * 4 bytes per pixel (RGBA)
    const width = imageElement.naturalWidth || imageElement.width || 800;
    const height = imageElement.naturalHeight || imageElement.height || 1200;
    
    return width * height * 4;
  }

  /**
   * Update memory statistics
   */
  private updateStats(): void {
    this.stats.totalPages = this.pages.size;
    this.stats.pagesInMemory = this.pages.size;
    
    let totalMemory = 0;
    this.pages.forEach((page) => {
      totalMemory += page.memorySize;
    });
    
    this.stats.estimatedMemoryUsage = totalMemory / 1024 / 1024; // Convert to MB
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.stopAutoCleanup();
    this.clearAll();
  }
}

/**
 * Memory leak detector
 */
export class MemoryLeakDetector {
  private snapshots: Map<string, number> = new Map();
  private warningThreshold: number = 50; // MB

  /**
   * Take a memory snapshot
   */
  takeSnapshot(label: string): void {
    if (typeof window === 'undefined') return;

    const perf = performance as any;
    if (perf.memory) {
      const usedMemory = perf.memory.usedJSHeapSize / 1024 / 1024;
      this.snapshots.set(label, usedMemory);
    }
  }

  /**
   * Compare snapshots and detect leaks
   */
  compareSnapshots(label1: string, label2: string): {
    leaked: boolean;
    difference: number;
    message: string;
  } {
    const snapshot1 = this.snapshots.get(label1);
    const snapshot2 = this.snapshots.get(label2);

    if (snapshot1 === undefined || snapshot2 === undefined) {
      return {
        leaked: false,
        difference: 0,
        message: 'Snapshots not found',
      };
    }

    const difference = snapshot2 - snapshot1;
    const leaked = difference > this.warningThreshold;

    return {
      leaked,
      difference,
      message: leaked
        ? `Potential memory leak detected: ${difference.toFixed(2)} MB increase`
        : `Memory usage normal: ${difference.toFixed(2)} MB change`,
    };
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots.clear();
  }
}

/**
 * Singleton instance for global memory management
 */
let globalMemoryManager: MemoryManager | null = null;

export function getGlobalMemoryManager(options?: MemoryManagerOptions): MemoryManager {
  if (!globalMemoryManager) {
    globalMemoryManager = new MemoryManager(options);
  }
  return globalMemoryManager;
}

/**
 * React hook for using MemoryManager
 */
export function useMemoryManager(options?: MemoryManagerOptions): MemoryManager {
  return getGlobalMemoryManager(options);
}
