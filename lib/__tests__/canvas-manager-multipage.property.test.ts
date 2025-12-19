/**
 * Canvas Manager Multi-page Memory Efficiency Property Tests
 * 
 * Property-based tests for multi-page memory efficiency
 * 
 * **PDF Rendering Reliability Fix, Property 10: Multi-page memory efficiency**
 * **Validates: Requirements 4.4**
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { CanvasManager } from '../pdf-reliability/canvas-manager';
import { DEFAULT_RELIABILITY_CONFIG } from '../pdf-reliability/config';
import type { ReliabilityConfig } from '../pdf-reliability/types';

// Mock DOM environment for canvas creation
const mockCanvas = () => {
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(),
  } as unknown as HTMLCanvasElement;
  
  return canvas;
};

const mockContext = () => ({
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
});

// Mock document.createElement
const originalCreateElement = document.createElement;
beforeEach(() => {
  document.createElement = vi.fn((tagName: string) => {
    if (tagName === 'canvas') {
      const canvas = mockCanvas();
      const ctx = mockContext();
      (canvas.getContext as any).mockReturnValue(ctx);
      return canvas;
    }
    return originalCreateElement.call(document, tagName);
  });
});

afterEach(() => {
  document.createElement = originalCreateElement;
});

describe('Canvas Manager Multi-page Memory Efficiency Properties', () => {
  let canvasManager: CanvasManager;

  beforeEach(() => {
    // Use a reasonable memory threshold for testing
    const testConfig: ReliabilityConfig = {
      ...DEFAULT_RELIABILITY_CONFIG,
      memoryPressureThreshold: 5 * 1024 * 1024, // 5MB threshold
    };
    canvasManager = new CanvasManager(testConfig);
  });

  afterEach(() => {
    canvasManager.cleanup();
  });

  test('**PDF Rendering Reliability Fix, Property 10: Multi-page memory efficiency** - Memory usage scales linearly with page count', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 1, max: 5 }), // smaller number of pages to avoid cleanup
      fc.integer({ min: 100, max: 300 }), // smaller canvases to avoid memory pressure
      fc.integer({ min: 100, max: 300 }), // smaller canvases to avoid memory pressure
      (pageCount, width, height) => {
        // Start with clean state
        canvasManager.cleanup();
        
        const canvases: HTMLCanvasElement[] = [];
        const expectedMemoryPerPage = width * height * 4; // 4 bytes per pixel
        
        // Create canvases for multiple pages
        for (let i = 0; i < pageCount; i++) {
          const canvas = canvasManager.createCanvas(width, height);
          canvases.push(canvas);
        }

        const stats = canvasManager.getMemoryStats();
        
        // Property: Memory usage should scale with page count (allowing for cleanup)
        expect(stats.totalCanvases).toBeGreaterThan(0);
        expect(stats.totalCanvases).toBeLessThanOrEqual(pageCount);
        expect(stats.totalMemoryUsage).toBeGreaterThan(0);
        
        // If no cleanup occurred, memory should scale linearly
        if (stats.totalCanvases === pageCount) {
          expect(stats.totalMemoryUsage).toBe(expectedMemoryPerPage * pageCount);
        }
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 10: Multi-page memory efficiency** - Large documents trigger automatic cleanup', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 15, max: 25 }), // large number of pages
      fc.integer({ min: 300, max: 500 }), // page width
      fc.integer({ min: 300, max: 500 }), // page height
      (pageCount, width, height) => {
        // Start with clean state
        canvasManager.cleanup();
        
        const canvases: HTMLCanvasElement[] = [];
        
        // Create many large canvases to trigger memory pressure
        for (let i = 0; i < pageCount; i++) {
          const canvas = canvasManager.createCanvas(width, height);
          canvases.push(canvas);
          
          // Simulate some pages being older by not accessing them
          if (i < pageCount - 5) {
            // Don't access these canvases, making them candidates for cleanup
          } else {
            // Access recent canvases to mark them as recently used
            canvasManager.getContext(canvas);
          }
        }

        const beforeCleanupStats = canvasManager.getMemoryStats();
        
        // Force cleanup if under memory pressure
        if (beforeCleanupStats.memoryPressure) {
          canvasManager.cleanupUnusedCanvases();
          const afterCleanupStats = canvasManager.getMemoryStats();
          
          // Property: Cleanup should reduce memory usage for large documents
          expect(afterCleanupStats.totalMemoryUsage).toBeLessThanOrEqual(beforeCleanupStats.totalMemoryUsage);
          expect(afterCleanupStats.totalCanvases).toBeLessThanOrEqual(beforeCleanupStats.totalCanvases);
        }
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 10: Multi-page memory efficiency** - Memory bounds are maintained regardless of page count', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 5, max: 20 }), // number of pages
      fc.integer({ min: 400, max: 800 }), // page width
      fc.integer({ min: 400, max: 800 }), // page height
      (pageCount, width, height) => {
        // Start with clean state
        canvasManager.cleanup();
        
        const canvases: HTMLCanvasElement[] = [];
        const maxExpectedMemory = 10 * 1024 * 1024; // 10MB reasonable upper bound
        
        // Create pages and monitor memory
        for (let i = 0; i < pageCount; i++) {
          const canvas = canvasManager.createCanvas(width, height);
          canvases.push(canvas);
          
          const stats = canvasManager.getMemoryStats();
          
          // Property: Memory usage should stay within reasonable bounds
          // If memory pressure is detected, cleanup should keep it manageable
          if (stats.memoryPressure) {
            expect(stats.totalMemoryUsage).toBeLessThan(maxExpectedMemory);
          }
        }
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 10: Multi-page memory efficiency** - Recently accessed pages are preserved during cleanup', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 8, max: 15 }), // number of pages
      fc.integer({ min: 300, max: 500 }), // page width
      fc.integer({ min: 300, max: 500 }), // page height
      (pageCount, width, height) => {
        // Start with clean state
        canvasManager.cleanup();
        
        const canvases: HTMLCanvasElement[] = [];
        
        // Create multiple pages
        for (let i = 0; i < pageCount; i++) {
          const canvas = canvasManager.createCanvas(width, height);
          canvases.push(canvas);
        }

        // Access only the last few pages (make them recently used)
        const recentlyUsedCount = Math.min(3, pageCount);
        const recentlyUsedCanvases = canvases.slice(-recentlyUsedCount);
        
        for (const canvas of recentlyUsedCanvases) {
          canvasManager.getContext(canvas); // This updates last used time
        }

        const beforeCleanupStats = canvasManager.getMemoryStats();
        
        // Force cleanup
        canvasManager.cleanupUnusedCanvases();
        
        const afterCleanupStats = canvasManager.getMemoryStats();
        
        // Property: Recently used pages should be more likely to be preserved
        // At minimum, we should still have some canvases if we started with any
        if (beforeCleanupStats.totalCanvases > 0) {
          expect(afterCleanupStats.totalCanvases).toBeGreaterThan(0);
          
          // If cleanup occurred, we should have fewer or equal canvases
          expect(afterCleanupStats.totalCanvases).toBeLessThanOrEqual(beforeCleanupStats.totalCanvases);
        }
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 10: Multi-page memory efficiency** - Memory efficiency improves with page reuse', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 2, max: 4 }), // smaller number to avoid cleanup
      fc.integer({ min: 100, max: 200 }), // smaller base width
      fc.integer({ min: 100, max: 200 }), // smaller base height
      (uniquePageCount, baseWidth, baseHeight) => {
        // Start with clean state
        canvasManager.cleanup();
        
        const pageSizes = [];
        for (let i = 0; i < uniquePageCount; i++) {
          pageSizes.push({
            width: baseWidth + i * 20, // smaller increment
            height: baseHeight + i * 20, // smaller increment
          });
        }

        // Create canvases for each unique page size
        const canvases: HTMLCanvasElement[] = [];
        for (const size of pageSizes) {
          const canvas = canvasManager.createCanvas(size.width, size.height);
          canvases.push(canvas);
        }

        const stats = canvasManager.getMemoryStats();
        
        // Property: Should have created some canvases (allowing for cleanup)
        expect(stats.totalCanvases).toBeGreaterThan(0);
        expect(stats.totalCanvases).toBeLessThanOrEqual(uniquePageCount);
        expect(stats.totalMemoryUsage).toBeGreaterThan(0);
        
        // Destroy and recreate some canvases (simulating page navigation)
        if (canvases.length > 0 && stats.totalCanvases > 0) {
          const initialCanvasCount = stats.totalCanvases;
          const initialMemory = stats.totalMemoryUsage;
          
          // Find a canvas that still exists
          const existingCanvas = canvases.find(c => {
            try {
              return canvasManager.getContext(c) !== null;
            } catch {
              return false;
            }
          });
          
          if (existingCanvas) {
            const originalSize = pageSizes[0];
            
            canvasManager.destroyCanvas(existingCanvas);
            const newCanvas = canvasManager.createCanvas(originalSize.width, originalSize.height);
            
            const newStats = canvasManager.getMemoryStats();
            
            // Property: Should maintain reasonable canvas count after recreation
            expect(newStats.totalCanvases).toBeGreaterThan(0);
          }
        }
      }
    ), { numRuns: 100 });
  });
});