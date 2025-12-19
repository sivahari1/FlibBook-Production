/**
 * Canvas Manager Context Cleanup Property Tests
 * 
 * Property-based tests for context cleanup on document switch
 * 
 * **PDF Rendering Reliability Fix, Property 11: Context cleanup on switch**
 * **Validates: Requirements 4.5**
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { CanvasManager } from '../pdf-reliability/canvas-manager';
import { DEFAULT_RELIABILITY_CONFIG } from '../pdf-reliability/config';

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

describe('Canvas Manager Context Cleanup Properties', () => {
  let canvasManager: CanvasManager;

  beforeEach(() => {
    canvasManager = new CanvasManager(DEFAULT_RELIABILITY_CONFIG);
  });

  afterEach(() => {
    canvasManager.cleanup();
  });

  test('**PDF Rendering Reliability Fix, Property 11: Context cleanup on switch** - Canvas destruction clears all resources', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 100, max: 800 }), // width
      fc.integer({ min: 100, max: 800 }), // height
      (width, height) => {
        // Start with clean state
        canvasManager.cleanup();
        
        // Create canvas
        const canvas = canvasManager.createCanvas(width, height);
        const context = canvasManager.getContext(canvas);
        expect(context).toBeTruthy();

        const beforeDestroyStats = canvasManager.getMemoryStats();
        expect(beforeDestroyStats.totalCanvases).toBe(1);
        expect(beforeDestroyStats.totalMemoryUsage).toBe(width * height * 4);

        // Property: Destroying canvas should clear all resources
        canvasManager.destroyCanvas(canvas);

        const afterDestroyStats = canvasManager.getMemoryStats();
        expect(afterDestroyStats.totalCanvases).toBe(0);
        expect(afterDestroyStats.totalMemoryUsage).toBe(0);

        // Canvas should be cleared
        expect(canvas.width).toBe(0);
        expect(canvas.height).toBe(0);
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 11: Context cleanup on switch** - Multiple canvas cleanup is thorough', async () => {
    await fc.assert(fc.property(
      fc.array(
        fc.record({
          width: fc.integer({ min: 100, max: 400 }),
          height: fc.integer({ min: 100, max: 400 }),
        }),
        { minLength: 2, maxLength: 6 }
      ),
      (canvasSpecs) => {
        // Start with clean state
        canvasManager.cleanup();
        
        const canvases: HTMLCanvasElement[] = [];
        let totalExpectedMemory = 0;

        // Create multiple canvases
        for (const spec of canvasSpecs) {
          const canvas = canvasManager.createCanvas(spec.width, spec.height);
          canvases.push(canvas);
          totalExpectedMemory += spec.width * spec.height * 4;
        }

        const beforeCleanupStats = canvasManager.getMemoryStats();
        expect(beforeCleanupStats.totalCanvases).toBeGreaterThan(0);
        expect(beforeCleanupStats.totalMemoryUsage).toBeGreaterThan(0);

        // Property: Cleanup should remove all canvases and free all memory
        canvasManager.cleanup();

        const afterCleanupStats = canvasManager.getMemoryStats();
        expect(afterCleanupStats.totalCanvases).toBe(0);
        expect(afterCleanupStats.totalMemoryUsage).toBe(0);

        // All canvases should be cleared
        for (const canvas of canvases) {
          expect(canvas.width).toBe(0);
          expect(canvas.height).toBe(0);
        }
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 11: Context cleanup on switch** - Canvas clearing preserves canvas object', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 200, max: 600 }), // width
      fc.integer({ min: 200, max: 600 }), // height
      (width, height) => {
        // Create canvas
        const canvas = canvasManager.createCanvas(width, height);
        const context = canvasManager.getContext(canvas);
        expect(context).toBeTruthy();

        // Mock that context has some content
        (context!.clearRect as any).mockClear();

        // Property: Clearing canvas should call clearRect and preserve canvas object
        canvasManager.clearCanvas(canvas);

        // Should have called clearRect with full canvas dimensions
        expect(context!.clearRect).toHaveBeenCalledWith(0, 0, width, height);

        // Canvas object should still exist and have same dimensions
        expect(canvas.width).toBe(width);
        expect(canvas.height).toBe(height);

        // Should still be able to get context
        const contextAfterClear = canvasManager.getContext(canvas);
        expect(contextAfterClear).toBeTruthy();
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 11: Context cleanup on switch** - Document switch simulation cleans previous resources', async () => {
    await fc.assert(fc.property(
      fc.array(
        fc.record({
          width: fc.integer({ min: 150, max: 350 }),
          height: fc.integer({ min: 150, max: 350 }),
        }),
        { minLength: 1, maxLength: 3 }
      ),
      fc.array(
        fc.record({
          width: fc.integer({ min: 150, max: 350 }),
          height: fc.integer({ min: 150, max: 350 }),
        }),
        { minLength: 1, maxLength: 3 }
      ),
      (document1Specs, document2Specs) => {
        // Start with clean state
        canvasManager.cleanup();
        
        // Simulate first document
        const document1Canvases: HTMLCanvasElement[] = [];
        for (const spec of document1Specs) {
          const canvas = canvasManager.createCanvas(spec.width, spec.height);
          document1Canvases.push(canvas);
        }

        const afterDoc1Stats = canvasManager.getMemoryStats();
        expect(afterDoc1Stats.totalCanvases).toBeGreaterThan(0);

        // Simulate document switch - cleanup previous document
        for (const canvas of document1Canvases) {
          canvasManager.destroyCanvas(canvas);
        }

        const afterCleanupStats = canvasManager.getMemoryStats();

        // Simulate second document
        const document2Canvases: HTMLCanvasElement[] = [];
        for (const spec of document2Specs) {
          const canvas = canvasManager.createCanvas(spec.width, spec.height);
          document2Canvases.push(canvas);
        }

        const afterDoc2Stats = canvasManager.getMemoryStats();

        // Property: After document switch, should only have resources for new document
        expect(afterDoc2Stats.totalCanvases).toBeGreaterThan(0);
        expect(afterDoc2Stats.totalCanvases).toBeLessThanOrEqual(document2Specs.length);
        
        // Memory should be reasonable for new document
        expect(afterDoc2Stats.totalMemoryUsage).toBeGreaterThan(0);
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 11: Context cleanup on switch** - Cleanup is idempotent', async () => {
    await fc.assert(fc.property(
      fc.array(
        fc.record({
          width: fc.integer({ min: 100, max: 300 }),
          height: fc.integer({ min: 100, max: 300 }),
        }),
        { minLength: 1, maxLength: 4 }
      ),
      (canvasSpecs) => {
        // Start with clean state
        canvasManager.cleanup();
        
        // Create canvases
        for (const spec of canvasSpecs) {
          canvasManager.createCanvas(spec.width, spec.height);
        }

        // First cleanup
        canvasManager.cleanup();
        const firstCleanupStats = canvasManager.getMemoryStats();

        // Second cleanup (should be safe to call multiple times)
        canvasManager.cleanup();
        const secondCleanupStats = canvasManager.getMemoryStats();

        // Third cleanup
        canvasManager.cleanup();
        const thirdCleanupStats = canvasManager.getMemoryStats();

        // Property: Multiple cleanups should be safe and produce same result
        expect(firstCleanupStats.totalCanvases).toBe(0);
        expect(firstCleanupStats.totalMemoryUsage).toBe(0);
        
        expect(secondCleanupStats.totalCanvases).toBe(firstCleanupStats.totalCanvases);
        expect(secondCleanupStats.totalMemoryUsage).toBe(firstCleanupStats.totalMemoryUsage);
        
        expect(thirdCleanupStats.totalCanvases).toBe(firstCleanupStats.totalCanvases);
        expect(thirdCleanupStats.totalMemoryUsage).toBe(firstCleanupStats.totalMemoryUsage);
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 11: Context cleanup on switch** - Partial cleanup maintains consistency', async () => {
    await fc.assert(fc.property(
      fc.array(
        fc.record({
          width: fc.integer({ min: 100, max: 300 }),
          height: fc.integer({ min: 100, max: 300 }),
        }),
        { minLength: 3, maxLength: 6 }
      ),
      (canvasSpecs) => {
        // Start with clean state
        canvasManager.cleanup();
        
        const canvases: HTMLCanvasElement[] = [];
        let totalExpectedMemory = 0;

        // Create canvases
        for (const spec of canvasSpecs) {
          const canvas = canvasManager.createCanvas(spec.width, spec.height);
          canvases.push(canvas);
          totalExpectedMemory += spec.width * spec.height * 4;
        }

        const initialStats = canvasManager.getMemoryStats();
        
        // Destroy some canvases (partial cleanup)
        const canvasesToDestroy = canvases.slice(0, Math.floor(canvases.length / 2));
        let destroyedMemory = 0;
        
        for (const canvas of canvasesToDestroy) {
          destroyedMemory += canvas.width * canvas.height * 4;
          canvasManager.destroyCanvas(canvas);
        }

        const afterPartialCleanupStats = canvasManager.getMemoryStats();

        // Property: Partial cleanup should maintain accurate memory tracking
        const expectedRemainingCanvases = canvases.length - canvasesToDestroy.length;
        const expectedRemainingMemory = totalExpectedMemory - destroyedMemory;

        expect(afterPartialCleanupStats.totalCanvases).toBeLessThanOrEqual(expectedRemainingCanvases);
        expect(afterPartialCleanupStats.totalMemoryUsage).toBeLessThanOrEqual(expectedRemainingMemory);
        expect(afterPartialCleanupStats.totalCanvases).toBeGreaterThan(0);
        expect(afterPartialCleanupStats.totalMemoryUsage).toBeGreaterThan(0);
      }
    ), { numRuns: 100 });
  });
});