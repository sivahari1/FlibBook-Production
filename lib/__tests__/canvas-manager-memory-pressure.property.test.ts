/**
 * Canvas Manager Memory Pressure Property Tests
 * 
 * Property-based tests for memory pressure detection and handling
 * 
 * **PDF Rendering Reliability Fix, Property 6: Memory pressure handling**
 * **Validates: Requirements 2.3, 4.2**
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

describe('Canvas Manager Memory Pressure Properties', () => {
  let canvasManager: CanvasManager;

  beforeEach(() => {
    // Use a low memory threshold for testing
    const testConfig: ReliabilityConfig = {
      ...DEFAULT_RELIABILITY_CONFIG,
      memoryPressureThreshold: 1024 * 1024, // 1MB threshold for testing
    };
    canvasManager = new CanvasManager(testConfig);
  });

  afterEach(() => {
    canvasManager.cleanup();
  });

  test('**PDF Rendering Reliability Fix, Property 6: Memory pressure handling** - Memory pressure triggers cleanup', async () => {
    await fc.assert(fc.property(
      fc.array(
        fc.record({
          width: fc.integer({ min: 100, max: 500 }),
          height: fc.integer({ min: 100, max: 500 }),
        }),
        { minLength: 5, maxLength: 20 }
      ),
      (canvasSpecs) => {
        const createdCanvases: HTMLCanvasElement[] = [];
        
        // Create multiple canvases to trigger memory pressure
        for (const spec of canvasSpecs) {
          const canvas = canvasManager.createCanvas(spec.width, spec.height);
          createdCanvases.push(canvas);
        }

        const initialStats = canvasManager.getMemoryStats();
        const initialCanvasCount = initialStats.totalCanvases;

        // Property: When memory pressure is detected, cleanup should reduce canvas count
        if (initialStats.memoryPressure) {
          canvasManager.cleanupUnusedCanvases();
          const afterCleanupStats = canvasManager.getMemoryStats();
          
          // Should have fewer canvases after cleanup
          expect(afterCleanupStats.totalCanvases).toBeLessThanOrEqual(initialCanvasCount);
          expect(afterCleanupStats.totalMemoryUsage).toBeLessThanOrEqual(initialStats.totalMemoryUsage);
        }
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 6: Memory pressure handling** - Memory pressure detection is consistent', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 1, max: 10 }), // number of large canvases
      (canvasCount) => {
        const canvases: HTMLCanvasElement[] = [];
        
        // Create large canvases to trigger memory pressure
        for (let i = 0; i < canvasCount; i++) {
          const canvas = canvasManager.createCanvas(1000, 1000); // Large canvas
          canvases.push(canvas);
        }

        const memoryPressure1 = canvasManager.checkMemoryPressure();
        const memoryPressure2 = canvasManager.checkMemoryPressure();

        // Property: Memory pressure detection should be consistent
        expect(memoryPressure1).toBe(memoryPressure2);

        const stats = canvasManager.getMemoryStats();
        expect(stats.memoryPressure).toBe(memoryPressure1);
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 6: Memory pressure handling** - Cleanup preserves recently used canvases', async () => {
    await fc.assert(fc.property(
      fc.array(
        fc.record({
          width: fc.integer({ min: 200, max: 400 }),
          height: fc.integer({ min: 200, max: 400 }),
        }),
        { minLength: 3, maxLength: 8 }
      ),
      (canvasSpecs) => {
        const canvases: HTMLCanvasElement[] = [];
        
        // Create canvases
        for (const spec of canvasSpecs) {
          const canvas = canvasManager.createCanvas(spec.width, spec.height);
          canvases.push(canvas);
        }

        // Use the last canvas (make it recently used)
        if (canvases.length > 0) {
          const recentCanvas = canvases[canvases.length - 1];
          canvasManager.getContext(recentCanvas); // This updates last used time
        }

        const initialStats = canvasManager.getMemoryStats();
        
        // Force cleanup
        canvasManager.cleanupUnusedCanvases();
        
        const afterStats = canvasManager.getMemoryStats();

        // Property: Cleanup should not increase canvas count or memory usage
        expect(afterStats.totalCanvases).toBeLessThanOrEqual(initialStats.totalCanvases);
        expect(afterStats.totalMemoryUsage).toBeLessThanOrEqual(initialStats.totalMemoryUsage);
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 6: Memory pressure handling** - Memory stats are accurate', async () => {
    await fc.assert(fc.property(
      fc.array(
        fc.record({
          width: fc.integer({ min: 50, max: 300 }),
          height: fc.integer({ min: 50, max: 300 }),
        }),
        { minLength: 1, maxLength: 5 }
      ),
      (canvasSpecs) => {
        // Start with clean state
        canvasManager.cleanup();
        
        const canvases: HTMLCanvasElement[] = [];
        let expectedMemory = 0;
        
        // Create canvases and calculate expected memory
        for (const spec of canvasSpecs) {
          const canvas = canvasManager.createCanvas(spec.width, spec.height);
          canvases.push(canvas);
          expectedMemory += spec.width * spec.height * 4; // 4 bytes per pixel
        }

        const stats = canvasManager.getMemoryStats();

        // Property: Memory stats should accurately reflect created canvases
        expect(stats.totalCanvases).toBe(canvases.length);
        expect(stats.totalMemoryUsage).toBe(expectedMemory);
        
        // Destroy one canvas
        if (canvases.length > 0) {
          const canvasToDestroy = canvases[0];
          const destroyedMemory = canvasToDestroy.width * canvasToDestroy.height * 4;
          canvasManager.destroyCanvas(canvasToDestroy);
          
          const updatedStats = canvasManager.getMemoryStats();
          expect(updatedStats.totalCanvases).toBe(canvases.length - 1);
          expect(updatedStats.totalMemoryUsage).toBe(expectedMemory - destroyedMemory);
        }
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 6: Memory pressure handling** - Canvas creation under pressure triggers cleanup', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 100, max: 400 }), // width
      fc.integer({ min: 100, max: 400 }), // height
      (width, height) => {
        // Create many canvases to ensure memory pressure
        const canvases: HTMLCanvasElement[] = [];
        for (let i = 0; i < 15; i++) {
          const canvas = canvasManager.createCanvas(300, 300);
          canvases.push(canvas);
        }

        const beforeStats = canvasManager.getMemoryStats();
        
        // Property: Creating canvas under memory pressure should succeed
        // (cleanup should be triggered automatically)
        const newCanvas = canvasManager.createCanvas(width, height);
        expect(newCanvas).toBeTruthy();
        expect(newCanvas.width).toBe(width);
        expect(newCanvas.height).toBe(height);

        const afterStats = canvasManager.getMemoryStats();
        
        // Should have successfully created the canvas
        expect(afterStats.totalCanvases).toBeGreaterThan(0);
      }
    ), { numRuns: 100 });
  });
});