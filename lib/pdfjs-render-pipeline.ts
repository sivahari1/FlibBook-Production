/**
 * PDF.js Optimized Rendering Pipeline
 * 
 * Provides performance optimizations for PDF rendering including:
 * - Canvas caching
 * - requestAnimationFrame scheduling
 * - Render throttling
 * - Web worker support (via PDF.js)
 * 
 * Requirements: 6.2, 6.3 - Progressive rendering and on-demand loading
 */

import type { PDFPage, PDFViewport } from './types/pdfjs';
import { renderPageToCanvas, cleanupCanvas } from './pdfjs-integration';

/**
 * Cached Canvas Entry
 */
interface CachedCanvas {
  canvas: HTMLCanvasElement;
  viewport: PDFViewport;
  timestamp: number;
  pageNumber: number;
  scale: number;
}

/**
 * Render Queue Entry
 */
interface RenderQueueEntry {
  page: PDFPage;
  pageNumber: number;
  canvas: HTMLCanvasElement;
  scale: number;
  priority: number;
  callback?: (error?: Error) => void;
}

/**
 * Render Pipeline Options
 */
export interface RenderPipelineOptions {
  /** Maximum number of cached canvases (default: 10) */
  maxCacheSize?: number;
  
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTTL?: number;
  
  /** Maximum concurrent renders (default: 2) */
  maxConcurrentRenders?: number;
  
  /** Render throttle delay in ms (default: 16ms ~60fps) */
  throttleDelay?: number;
}

/**
 * Optimized PDF Rendering Pipeline
 * 
 * Manages canvas caching, render scheduling, and throttling
 * for optimal performance.
 */
export class PDFRenderPipeline {
  private canvasCache: Map<string, CachedCanvas> = new Map();
  private renderQueue: RenderQueueEntry[] = [];
  private activeRenders: number = 0;
  private isProcessing: boolean = false;
  private lastRenderTime: number = 0;
  
  private readonly maxCacheSize: number;
  private readonly cacheTTL: number;
  private readonly maxConcurrentRenders: number;
  private readonly throttleDelay: number;
  
  constructor(options: RenderPipelineOptions = {}) {
    this.maxCacheSize = options.maxCacheSize ?? 10;
    this.cacheTTL = options.cacheTTL ?? 5 * 60 * 1000; // 5 minutes
    this.maxConcurrentRenders = options.maxConcurrentRenders ?? 2;
    this.throttleDelay = options.throttleDelay ?? 16; // ~60fps
  }
  
  /**
   * Generate cache key for a page
   */
  private getCacheKey(pageNumber: number, scale: number): string {
    return `${pageNumber}-${scale.toFixed(2)}`;
  }
  
  /**
   * Get cached canvas if available and valid
   */
  getCachedCanvas(pageNumber: number, scale: number): HTMLCanvasElement | null {
    const key = this.getCacheKey(pageNumber, scale);
    const cached = this.canvasCache.get(key);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache entry is still valid
    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTTL) {
      this.canvasCache.delete(key);
      cleanupCanvas(cached.canvas);
      return null;
    }
    
    return cached.canvas;
  }
  
  /**
   * Store canvas in cache
   */
  private cacheCanvas(
    pageNumber: number,
    scale: number,
    canvas: HTMLCanvasElement,
    viewport: PDFViewport
  ): void {
    const key = this.getCacheKey(pageNumber, scale);
    
    // Evict oldest entries if cache is full
    if (this.canvasCache.size >= this.maxCacheSize) {
      const oldestKey = Array.from(this.canvasCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0];
      
      if (oldestKey) {
        const oldest = this.canvasCache.get(oldestKey);
        if (oldest) {
          cleanupCanvas(oldest.canvas);
        }
        this.canvasCache.delete(oldestKey);
      }
    }
    
    // Clone canvas for caching
    const cachedCanvas = document.createElement('canvas');
    cachedCanvas.width = canvas.width;
    cachedCanvas.height = canvas.height;
    const ctx = cachedCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, 0);
    }
    
    this.canvasCache.set(key, {
      canvas: cachedCanvas,
      viewport,
      timestamp: Date.now(),
      pageNumber,
      scale,
    });
  }
  
  /**
   * Clear all cached canvases
   */
  clearCache(): void {
    for (const cached of this.canvasCache.values()) {
      cleanupCanvas(cached.canvas);
    }
    this.canvasCache.clear();
  }
  
  /**
   * Clear cache for specific page
   */
  clearPageCache(pageNumber: number): void {
    const keysToDelete: string[] = [];
    
    for (const [key, cached] of this.canvasCache.entries()) {
      if (cached.pageNumber === pageNumber) {
        cleanupCanvas(cached.canvas);
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.canvasCache.delete(key);
    }
  }
  
  /**
   * Queue a page for rendering with priority
   * 
   * @param page - PDF page to render
   * @param pageNumber - Page number
   * @param canvas - Target canvas element
   * @param scale - Scale factor
   * @param priority - Render priority (higher = sooner)
   * @param callback - Completion callback
   */
  queueRender(
    page: PDFPage,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale: number,
    priority: number = 0,
    callback?: (error?: Error) => void
  ): void {
    // Check cache first
    const cached = this.getCachedCanvas(pageNumber, scale);
    if (cached) {
      // Copy cached canvas to target
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = cached.width;
        canvas.height = cached.height;
        ctx.drawImage(cached, 0, 0);
      }
      callback?.();
      return;
    }
    
    // Add to queue
    this.renderQueue.push({
      page,
      pageNumber,
      canvas,
      scale,
      priority,
      callback,
    });
    
    // Sort queue by priority (higher first)
    this.renderQueue.sort((a, b) => b.priority - a.priority);
    
    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }
  }
  
  /**
   * Process render queue with throttling and concurrency control
   */
  private processQueue(): void {
    if (this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    this.processNextBatch();
  }
  
  /**
   * Process next batch of renders using requestAnimationFrame
   */
  private processNextBatch(): void {
    // Check if we should throttle
    const now = Date.now();
    const timeSinceLastRender = now - this.lastRenderTime;
    
    if (timeSinceLastRender < this.throttleDelay) {
      // Schedule next batch after throttle delay
      requestAnimationFrame(() => {
        this.processNextBatch();
      });
      return;
    }
    
    // Process renders up to concurrency limit
    while (
      this.renderQueue.length > 0 &&
      this.activeRenders < this.maxConcurrentRenders
    ) {
      const entry = this.renderQueue.shift();
      if (entry) {
        this.renderEntry(entry);
      }
    }
    
    // Update last render time
    this.lastRenderTime = Date.now();
    
    // Continue processing if queue not empty
    if (this.renderQueue.length > 0 || this.activeRenders > 0) {
      requestAnimationFrame(() => {
        this.processNextBatch();
      });
    } else {
      this.isProcessing = false;
    }
  }
  
  /**
   * Render a single queue entry
   */
  private async renderEntry(entry: RenderQueueEntry): Promise<void> {
    this.activeRenders++;
    
    try {
      const result = await renderPageToCanvas({
        page: entry.page,
        canvas: entry.canvas,
        scale: entry.scale,
      });
      
      // Cache the rendered canvas
      this.cacheCanvas(
        entry.pageNumber,
        entry.scale,
        result.canvas,
        result.viewport
      );
      
      entry.callback?.();
    } catch (error) {
      entry.callback?.(error instanceof Error ? error : new Error('Render failed'));
    } finally {
      this.activeRenders--;
    }
  }
  
  /**
   * Cancel all pending renders
   */
  cancelAll(): void {
    // Clear queue and notify callbacks
    for (const entry of this.renderQueue) {
      entry.callback?.(new Error('Render cancelled'));
    }
    this.renderQueue = [];
  }
  
  /**
   * Cancel renders for specific page
   */
  cancelPage(pageNumber: number): void {
    const remaining: RenderQueueEntry[] = [];
    
    for (const entry of this.renderQueue) {
      if (entry.pageNumber === pageNumber) {
        entry.callback?.(new Error('Render cancelled'));
      } else {
        remaining.push(entry);
      }
    }
    
    this.renderQueue = remaining;
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.canvasCache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0, // TODO: Track hits/misses
    };
  }
  
  /**
   * Get queue statistics
   */
  getQueueStats(): {
    pending: number;
    active: number;
  } {
    return {
      pending: this.renderQueue.length,
      active: this.activeRenders,
    };
  }
  
  /**
   * Cleanup and destroy pipeline
   */
  destroy(): void {
    this.cancelAll();
    this.clearCache();
    this.isProcessing = false;
  }
}

/**
 * Create a singleton render pipeline instance
 */
let globalPipeline: PDFRenderPipeline | null = null;

/**
 * Get or create the global render pipeline
 */
export function getGlobalRenderPipeline(
  options?: RenderPipelineOptions
): PDFRenderPipeline {
  if (!globalPipeline) {
    globalPipeline = new PDFRenderPipeline(options);
  }
  return globalPipeline;
}

/**
 * Reset the global render pipeline
 */
export function resetGlobalRenderPipeline(): void {
  if (globalPipeline) {
    globalPipeline.destroy();
    globalPipeline = null;
  }
}
