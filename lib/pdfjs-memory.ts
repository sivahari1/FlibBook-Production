/**
 * PDF.js Memory Management Utilities
 * 
 * Provides memory management for PDF.js rendering to prevent memory leaks
 * and optimize performance for large documents.
 * 
 * Requirements: 6.3, 6.4
 */

import type { PDFDocument, PDFPage } from './types/pdfjs';
import { destroyPDFDocument, cleanupCanvas } from './pdfjs-integration';

/**
 * Configuration for memory management
 */
export interface MemoryConfig {
  /** Maximum number of rendered pages to keep in memory */
  maxRenderedPages: number;
  
  /** Maximum number of PDF page objects to keep in memory */
  maxPageObjects: number;
  
  /** Enable memory monitoring */
  enableMonitoring: boolean;
  
  /** Memory warning threshold in MB */
  warningThreshold: number;
}

/**
 * Default memory configuration
 */
export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  maxRenderedPages: 2, // Keep only 2 rendered pages in memory (current + 1)
  maxPageObjects: 3, // Keep only 3 page objects in memory
  enableMonitoring: false, // Disable excessive monitoring
  warningThreshold: 50, // Warn if memory usage exceeds 50MB
};

/**
 * Page cache entry
 */
interface PageCacheEntry {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  lastAccessed: number;
  size: number; // Estimated size in bytes
}

/**
 * PDF Page object cache entry
 */
interface PageObjectCacheEntry {
  pageNumber: number;
  page: PDFPage;
  lastAccessed: number;
}

/**
 * Memory Manager for PDF.js
 * 
 * Manages memory usage by limiting the number of rendered pages
 * and PDF page objects kept in memory.
 */
export class PDFMemoryManager {
  private config: MemoryConfig;
  private pageCache: Map<number, PageCacheEntry>;
  private pageObjectCache: Map<number, PageObjectCacheEntry>;
  private pdfDocument: PDFDocument | null;
  private totalMemoryUsed: number;
  
  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
    this.pageCache = new Map();
    this.pageObjectCache = new Map();
    this.pdfDocument = null;
    this.totalMemoryUsed = 0;
  }
  
  /**
   * Set the PDF document
   */
  setPDFDocument(document: PDFDocument | null): void {
    this.pdfDocument = document;
  }
  
  /**
   * Add a rendered page to cache
   * 
   * Requirements: 6.3
   */
  addRenderedPage(pageNumber: number, canvas: HTMLCanvasElement): void {
    // Estimate canvas size (width * height * 4 bytes per pixel)
    const size = canvas.width * canvas.height * 4;
    
    const entry: PageCacheEntry = {
      pageNumber,
      canvas,
      lastAccessed: Date.now(),
      size,
    };
    
    this.pageCache.set(pageNumber, entry);
    this.totalMemoryUsed += size;
    
    // Check if we need to evict old pages
    this.evictOldPages();
    
    // Monitor memory if enabled
    if (this.config.enableMonitoring) {
      this.checkMemoryUsage();
    }
  }
  
  /**
   * Get a rendered page from cache
   */
  getRenderedPage(pageNumber: number): HTMLCanvasElement | null {
    const entry = this.pageCache.get(pageNumber);
    if (entry) {
      entry.lastAccessed = Date.now();
      return entry.canvas;
    }
    return null;
  }
  
  /**
   * Add a PDF page object to cache
   * 
   * Requirements: 6.4
   */
  addPageObject(pageNumber: number, page: PDFPage): void {
    const entry: PageObjectCacheEntry = {
      pageNumber,
      page,
      lastAccessed: Date.now(),
    };
    
    this.pageObjectCache.set(pageNumber, entry);
    
    // Check if we need to evict old page objects
    this.evictOldPageObjects();
  }
  
  /**
   * Get a PDF page object from cache
   */
  getPageObject(pageNumber: number): PDFPage | null {
    const entry = this.pageObjectCache.get(pageNumber);
    if (entry) {
      entry.lastAccessed = Date.now();
      return entry.page;
    }
    return null;
  }
  
  /**
   * Evict old rendered pages from cache
   * 
   * Requirements: 6.3
   */
  private evictOldPages(): void {
    if (this.pageCache.size <= this.config.maxRenderedPages) {
      return;
    }
    
    // Sort by last accessed time
    const entries = Array.from(this.pageCache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest pages until we're under the limit
    const toRemove = entries.slice(0, entries.length - this.config.maxRenderedPages);
    
    for (const [pageNumber, entry] of toRemove) {
      // Clean up canvas
      cleanupCanvas(entry.canvas);
      this.totalMemoryUsed -= entry.size;
      this.pageCache.delete(pageNumber);
    }
  }
  
  /**
   * Evict old PDF page objects from cache
   * 
   * Requirements: 6.4
   */
  private evictOldPageObjects(): void {
    if (this.pageObjectCache.size <= this.config.maxPageObjects) {
      return;
    }
    
    // Sort by last accessed time
    const entries = Array.from(this.pageObjectCache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest page objects until we're under the limit
    const toRemove = entries.slice(0, entries.length - this.config.maxPageObjects);
    
    for (const [pageNumber, entry] of toRemove) {
      // Destroy page object if it has a cleanup method
      if (entry.page && typeof (entry.page as any).cleanup === 'function') {
        try {
          (entry.page as any).cleanup();
        } catch (error) {
          console.warn(`Failed to cleanup page ${pageNumber}:`, error);
        }
      }
      this.pageObjectCache.delete(pageNumber);
    }
  }
  
  /**
   * Clear a specific page from cache
   */
  clearPage(pageNumber: number): void {
    const entry = this.pageCache.get(pageNumber);
    if (entry) {
      cleanupCanvas(entry.canvas);
      this.totalMemoryUsed -= entry.size;
      this.pageCache.delete(pageNumber);
    }
    
    const pageObjectEntry = this.pageObjectCache.get(pageNumber);
    if (pageObjectEntry) {
      if (pageObjectEntry.page && typeof (pageObjectEntry.page as any).cleanup === 'function') {
        try {
          (pageObjectEntry.page as any).cleanup();
        } catch (error) {
          console.warn(`Failed to cleanup page ${pageNumber}:`, error);
        }
      }
      this.pageObjectCache.delete(pageNumber);
    }
  }
  
  /**
   * Clear all cached pages
   */
  clearAllPages(): void {
    // Clean up all canvases
    for (const entry of this.pageCache.values()) {
      cleanupCanvas(entry.canvas);
    }
    
    // Clean up all page objects
    for (const entry of this.pageObjectCache.values()) {
      if (entry.page && typeof (entry.page as any).cleanup === 'function') {
        try {
          (entry.page as any).cleanup();
        } catch (error) {
          console.warn(`Failed to cleanup page ${entry.pageNumber}:`, error);
        }
      }
    }
    
    this.pageCache.clear();
    this.pageObjectCache.clear();
    this.totalMemoryUsed = 0;
  }
  
  /**
   * Destroy PDF document and clear all caches
   */
  destroy(): void {
    this.clearAllPages();
    
    if (this.pdfDocument) {
      try {
        destroyPDFDocument(this.pdfDocument);
      } catch (error) {
        console.warn('Failed to destroy PDF document:', error);
      }
      this.pdfDocument = null;
    }
  }
  
  /**
   * Check memory usage and log warnings if needed
   */
  private checkMemoryUsage(): void {
    // Only check if monitoring is enabled
    if (!this.config.enableMonitoring) {
      return;
    }
    
    const memoryMB = this.totalMemoryUsed / (1024 * 1024);
    
    if (memoryMB > this.config.warningThreshold) {
      console.warn(
        `PDF.js memory usage is high: ${memoryMB.toFixed(2)}MB. ` +
        `Consider reducing maxRenderedPages or maxPageObjects.`
      );
    }
  }
  
  /**
   * Get current memory statistics
   */
  getMemoryStats(): {
    totalMemoryMB: number;
    cachedPages: number;
    cachedPageObjects: number;
    maxRenderedPages: number;
    maxPageObjects: number;
  } {
    return {
      totalMemoryMB: this.totalMemoryUsed / (1024 * 1024),
      cachedPages: this.pageCache.size,
      cachedPageObjects: this.pageObjectCache.size,
      maxRenderedPages: this.config.maxRenderedPages,
      maxPageObjects: this.config.maxPageObjects,
    };
  }
  
  /**
   * Update memory configuration
   */
  updateConfig(config: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Evict pages if new limits are lower
    this.evictOldPages();
    this.evictOldPageObjects();
  }
  
  /**
   * Prioritize pages for rendering
   * 
   * Keeps visible pages and adjacent pages in memory
   * 
   * Requirements: 6.4
   */
  prioritizePages(visiblePages: number[], totalPages: number): number[] {
    const prioritized = new Set<number>();
    
    // Add visible pages
    for (const page of visiblePages) {
      prioritized.add(page);
    }
    
    // Add adjacent pages (one before and one after each visible page)
    for (const page of visiblePages) {
      if (page > 1) {
        prioritized.add(page - 1);
      }
      if (page < totalPages) {
        prioritized.add(page + 1);
      }
    }
    
    return Array.from(prioritized).sort((a, b) => a - b);
  }
  
  /**
   * Remove non-priority pages from cache
   * 
   * Requirements: 6.3, 6.4
   */
  removeNonPriorityPages(priorityPages: number[]): void {
    const prioritySet = new Set(priorityPages);
    
    // Remove rendered pages that are not in priority list
    for (const pageNumber of this.pageCache.keys()) {
      if (!prioritySet.has(pageNumber)) {
        this.clearPage(pageNumber);
      }
    }
    
    // Remove page objects that are not in priority list
    for (const pageNumber of this.pageObjectCache.keys()) {
      if (!prioritySet.has(pageNumber)) {
        const entry = this.pageObjectCache.get(pageNumber);
        if (entry && entry.page && typeof (entry.page as any).cleanup === 'function') {
          try {
            (entry.page as any).cleanup();
          } catch (error) {
            console.warn(`Failed to cleanup page ${pageNumber}:`, error);
          }
        }
        this.pageObjectCache.delete(pageNumber);
      }
    }
  }
}

/**
 * Create a memory manager instance
 */
export function createMemoryManager(config?: Partial<MemoryConfig>): PDFMemoryManager {
  return new PDFMemoryManager(config);
}
