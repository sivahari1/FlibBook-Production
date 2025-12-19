/**
 * Canvas Manager
 * 
 * Handles canvas lifecycle management, memory pressure detection,
 * and canvas recreation on failure for reliable PDF rendering.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import type { ReliabilityConfig } from './types';
import { ErrorFactory } from './errors';

/**
 * Canvas Memory Info Interface
 */
interface CanvasMemoryInfo {
  canvas: HTMLCanvasElement;
  createdAt: Date;
  lastUsed: Date;
  memorySize: number; // Estimated memory usage in bytes
}

/**
 * Canvas Manager Class
 * 
 * Manages canvas lifecycle, memory pressure, and recovery
 */
export class CanvasManager {
  private config: ReliabilityConfig;
  private canvasRegistry: Map<HTMLCanvasElement, CanvasMemoryInfo> = new Map();
  private totalMemoryUsage: number = 0;

  constructor(config: ReliabilityConfig) {
    this.config = config;
  }

  /**
   * Create a new canvas element with validation
   * 
   * Requirements: 4.1
   */
  createCanvas(width: number, height: number): HTMLCanvasElement {
    // Check memory pressure before creating new canvas
    if (this.checkMemoryPressure()) {
      this.cleanupUnusedCanvases();
    }

    // Create canvas element
    const canvas = document.createElement('canvas');
    
    // Set dimensions
    canvas.width = width;
    canvas.height = height;

    // Validate canvas context creation
    const context = this.getContext(canvas);
    if (!context) {
      throw ErrorFactory.createCanvasContextError(
        'RENDERING' as any,
        'PDFJS_CANVAS' as any,
        { width, height }
      );
    }

    // Calculate estimated memory usage (width * height * 4 bytes per pixel)
    const memorySize = width * height * 4;

    // Register canvas
    const memoryInfo: CanvasMemoryInfo = {
      canvas,
      createdAt: new Date(),
      lastUsed: new Date(),
      memorySize,
    };

    this.canvasRegistry.set(canvas, memoryInfo);
    this.totalMemoryUsage += memorySize;

    return canvas;
  }

  /**
   * Get 2D rendering context with validation
   * 
   * Requirements: 4.1
   */
  getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
    try {
      const context = canvas.getContext('2d');
      
      if (!context) {
        return null;
      }

      // Update last used time if canvas is registered
      const memoryInfo = this.canvasRegistry.get(canvas);
      if (memoryInfo) {
        memoryInfo.lastUsed = new Date();
      }

      return context;
    } catch (error) {
      console.warn('Failed to get canvas context:', error);
      return null;
    }
  }

  /**
   * Clear canvas content
   * 
   * Requirements: 4.3, 4.5
   */
  clearCanvas(canvas: HTMLCanvasElement): void {
    try {
      const context = this.getContext(canvas);
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Update last used time
      const memoryInfo = this.canvasRegistry.get(canvas);
      if (memoryInfo) {
        memoryInfo.lastUsed = new Date();
      }
    } catch (error) {
      console.warn('Failed to clear canvas:', error);
    }
  }

  /**
   * Destroy canvas and clean up resources
   * 
   * Requirements: 4.5
   */
  destroyCanvas(canvas: HTMLCanvasElement): void {
    try {
      // Clear canvas content
      this.clearCanvas(canvas);

      // Reset dimensions to free memory
      canvas.width = 0;
      canvas.height = 0;

      // Remove from registry
      const memoryInfo = this.canvasRegistry.get(canvas);
      if (memoryInfo) {
        this.totalMemoryUsage -= memoryInfo.memorySize;
        this.canvasRegistry.delete(canvas);
      }
    } catch (error) {
      console.warn('Failed to destroy canvas:', error);
    }
  }

  /**
   * Check if system is under memory pressure
   * 
   * Requirements: 4.2
   */
  checkMemoryPressure(): boolean {
    // Check total canvas memory usage
    if (this.totalMemoryUsage > this.config.memoryPressureThreshold) {
      return true;
    }

    // Check browser memory API if available
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      if (memoryInfo && memoryInfo.usedJSHeapSize) {
        // Consider memory pressure if using more than 80% of available heap
        const memoryPressureRatio = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
        return memoryPressureRatio > 0.8;
      }
    }

    // Check number of canvases
    const canvasCount = this.canvasRegistry.size;
    return canvasCount > 10; // Arbitrary threshold for too many canvases
  }

  /**
   * Clean up unused canvases to free memory
   * 
   * Requirements: 4.2, 4.4
   */
  cleanupUnusedCanvases(): void {
    const now = new Date();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const canvasesToDestroy: HTMLCanvasElement[] = [];

    // Find old canvases
    for (const [canvas, memoryInfo] of this.canvasRegistry) {
      const age = now.getTime() - memoryInfo.lastUsed.getTime();
      if (age > maxAge) {
        canvasesToDestroy.push(canvas);
      }
    }

    // If no old canvases and still under pressure, remove oldest canvases
    if (canvasesToDestroy.length === 0 && this.checkMemoryPressure()) {
      const sortedCanvases = Array.from(this.canvasRegistry.entries())
        .sort(([, a], [, b]) => a.lastUsed.getTime() - b.lastUsed.getTime());

      // Remove oldest 25% of canvases
      const removeCount = Math.ceil(sortedCanvases.length * 0.25);
      for (let i = 0; i < removeCount && i < sortedCanvases.length; i++) {
        canvasesToDestroy.push(sortedCanvases[i][0]);
      }
    }

    // Destroy selected canvases
    for (const canvas of canvasesToDestroy) {
      this.destroyCanvas(canvas);
    }
  }

  /**
   * Recreate canvas on failure
   * 
   * Requirements: 4.3
   */
  recreateCanvas(failedCanvas: HTMLCanvasElement): HTMLCanvasElement {
    const memoryInfo = this.canvasRegistry.get(failedCanvas);
    
    // Get original dimensions or use defaults
    const width = failedCanvas.width || 800;
    const height = failedCanvas.height || 600;

    // Destroy the failed canvas
    this.destroyCanvas(failedCanvas);

    // Create new canvas with same dimensions
    return this.createCanvas(width, height);
  }

  /**
   * Get memory usage statistics
   * 
   * Requirements: 4.4
   */
  getMemoryStats(): {
    totalCanvases: number;
    totalMemoryUsage: number;
    memoryPressure: boolean;
    oldestCanvas?: Date;
    newestCanvas?: Date;
  } {
    const canvases = Array.from(this.canvasRegistry.values());
    
    return {
      totalCanvases: canvases.length,
      totalMemoryUsage: this.totalMemoryUsage,
      memoryPressure: this.checkMemoryPressure(),
      oldestCanvas: canvases.length > 0 
        ? new Date(Math.min(...canvases.map(c => c.createdAt.getTime())))
        : undefined,
      newestCanvas: canvases.length > 0
        ? new Date(Math.max(...canvases.map(c => c.createdAt.getTime())))
        : undefined,
    };
  }

  /**
   * Validate canvas context and recreate if necessary
   * 
   * Requirements: 4.1, 4.3
   */
  validateAndRecreateCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
    try {
      // Try to get context
      const context = this.getContext(canvas);
      
      if (!context) {
        // Context creation failed, recreate canvas
        return this.recreateCanvas(canvas);
      }

      // Test context functionality
      try {
        context.save();
        context.restore();
        return canvas; // Canvas is working
      } catch (error) {
        // Context is corrupted, recreate canvas
        return this.recreateCanvas(canvas);
      }
    } catch (error) {
      // Any error means we need to recreate
      return this.recreateCanvas(canvas);
    }
  }

  /**
   * Clean up all canvases (for shutdown/cleanup)
   * 
   * Requirements: 4.5
   */
  cleanup(): void {
    const canvases = Array.from(this.canvasRegistry.keys());
    for (const canvas of canvases) {
      this.destroyCanvas(canvas);
    }
  }
}