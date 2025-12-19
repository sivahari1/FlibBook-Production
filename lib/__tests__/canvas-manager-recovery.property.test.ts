/**
 * Canvas Manager Recovery Property Tests
 * 
 * Property-based tests for canvas recovery on failure
 * 
 * **PDF Rendering Reliability Fix, Property 5: Canvas recovery on failure**
 * **Validates: Requirements 2.2, 4.3**
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
  let canvasCount = 0;
  
  document.createElement = vi.fn((tagName: string) => {
    if (tagName === 'canvas') {
      canvasCount++;
      const canvas = mockCanvas();
      const ctx = mockContext();
      (canvas.getContext as any).mockReturnValue(ctx);
      
      // Make each canvas unique by adding an id
      (canvas as any)._testId = canvasCount;
      
      return canvas;
    }
    return originalCreateElement.call(document, tagName);
  });
});

afterEach(() => {
  document.createElement = originalCreateElement;
});

describe('Canvas Manager Recovery Properties', () => {
  let canvasManager: CanvasManager;

  beforeEach(() => {
    canvasManager = new CanvasManager(DEFAULT_RELIABILITY_CONFIG);
  });

  afterEach(() => {
    canvasManager.cleanup();
  });

  test('**PDF Rendering Reliability Fix, Property 5: Canvas recovery on failure** - Failed canvas is recreated with same dimensions', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 100, max: 2000 }), // width
      fc.integer({ min: 100, max: 2000 }), // height
      (width, height) => {
        // Create initial canvas
        const originalCanvas = canvasManager.createCanvas(width, height);
        expect(originalCanvas.width).toBe(width);
        expect(originalCanvas.height).toBe(height);

        // Property: Recreated canvas should have same dimensions as original
        const recreatedCanvas = canvasManager.recreateCanvas(originalCanvas);
        
        expect(recreatedCanvas).not.toBe(originalCanvas); // Should be different object
        expect(recreatedCanvas.width).toBe(width);
        expect(recreatedCanvas.height).toBe(height);
        
        // Should be able to get context from recreated canvas
        const context = canvasManager.getContext(recreatedCanvas);
        expect(context).toBeTruthy();
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 5: Canvas recovery on failure** - Validation recreates corrupted canvas', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 50, max: 1000 }), // width
      fc.integer({ min: 50, max: 1000 }), // height
      (width, height) => {
        // Create canvas with working context initially
        const originalCanvas = canvasManager.createCanvas(width, height);
        const originalId = (originalCanvas as any)._testId;

        // Simulate context corruption by making getContext return null
        (originalCanvas.getContext as any).mockReturnValue(null);

        // Property: Validation should detect failure and recreate canvas
        const validatedCanvas = canvasManager.validateAndRecreateCanvas(originalCanvas);
        const newId = (validatedCanvas as any)._testId;
        
        expect(validatedCanvas).not.toBe(originalCanvas); // Should be different object
        expect(newId).not.toBe(originalId); // Should have different ID (new canvas)
        expect(validatedCanvas.width).toBe(width);
        expect(validatedCanvas.height).toBe(height);
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 5: Canvas recovery on failure** - Context corruption triggers recreation', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 100, max: 800 }), // width
      fc.integer({ min: 100, max: 800 }), // height
      (width, height) => {
        // Create canvas with working context
        const originalCanvas = canvasManager.createCanvas(width, height);
        const originalContext = canvasManager.getContext(originalCanvas);
        expect(originalContext).toBeTruthy();

        // Simulate context corruption by making save/restore throw
        (originalContext!.save as any).mockImplementation(() => {
          throw new Error('Context corrupted');
        });

        // Property: Context corruption should trigger canvas recreation
        const recoveredCanvas = canvasManager.validateAndRecreateCanvas(originalCanvas);
        
        expect(recoveredCanvas).not.toBe(originalCanvas);
        expect(recoveredCanvas.width).toBe(width);
        expect(recoveredCanvas.height).toBe(height);
        
        // New canvas should have working context
        const newContext = canvasManager.getContext(recoveredCanvas);
        expect(newContext).toBeTruthy();
        
        // New context should work without throwing
        expect(() => {
          newContext!.save();
          newContext!.restore();
        }).not.toThrow();
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 5: Canvas recovery on failure** - Memory tracking updates on recreation', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 200, max: 600 }), // width
      fc.integer({ min: 200, max: 600 }), // height
      (width, height) => {
        // Start with clean state
        canvasManager.cleanup();
        
        // Create original canvas
        const originalCanvas = canvasManager.createCanvas(width, height);
        const statsAfterCreate = canvasManager.getMemoryStats();
        
        expect(statsAfterCreate.totalCanvases).toBe(1);
        const expectedMemory = width * height * 4;
        expect(statsAfterCreate.totalMemoryUsage).toBe(expectedMemory);

        // Recreate canvas
        const recreatedCanvas = canvasManager.recreateCanvas(originalCanvas);
        const statsAfterRecreate = canvasManager.getMemoryStats();

        // Property: Memory tracking should be accurate after recreation
        expect(statsAfterRecreate.totalCanvases).toBe(1); // Still one canvas
        expect(statsAfterRecreate.totalMemoryUsage).toBe(expectedMemory); // Same memory usage
        
        // Original canvas should be cleaned up
        expect(recreatedCanvas).not.toBe(originalCanvas);
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 5: Canvas recovery on failure** - Multiple failures can be recovered', async () => {
    await fc.assert(fc.property(
      fc.array(
        fc.record({
          width: fc.integer({ min: 100, max: 400 }),
          height: fc.integer({ min: 100, max: 400 }),
        }),
        { minLength: 2, maxLength: 5 }
      ),
      (canvasSpecs) => {
        // Start with clean state
        canvasManager.cleanup();
        
        const canvases: HTMLCanvasElement[] = [];
        
        // Create multiple canvases
        for (const spec of canvasSpecs) {
          const canvas = canvasManager.createCanvas(spec.width, spec.height);
          canvases.push(canvas);
        }

        const initialStats = canvasManager.getMemoryStats();
        expect(initialStats.totalCanvases).toBe(canvases.length);

        // Simulate failures and recover all canvases
        const recoveredCanvases: HTMLCanvasElement[] = [];
        for (let i = 0; i < canvases.length; i++) {
          const originalCanvas = canvases[i];
          const spec = canvasSpecs[i];
          
          // Simulate failure by making getContext return null
          (originalCanvas.getContext as any).mockReturnValue(null);
          
          // Recover canvas
          const recoveredCanvas = canvasManager.validateAndRecreateCanvas(originalCanvas);
          recoveredCanvases.push(recoveredCanvas);
          
          // Property: Each recovered canvas should have correct dimensions
          expect(recoveredCanvas.width).toBe(spec.width);
          expect(recoveredCanvas.height).toBe(spec.height);
          expect(recoveredCanvas).not.toBe(originalCanvas);
        }

        const finalStats = canvasManager.getMemoryStats();
        
        // Property: Should still have same number of canvases after recovery
        expect(finalStats.totalCanvases).toBe(canvasSpecs.length);
        expect(recoveredCanvases.length).toBe(canvasSpecs.length);
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 5: Canvas recovery on failure** - Working canvas passes validation unchanged', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 100, max: 800 }), // width
      fc.integer({ min: 100, max: 800 }), // height
      (width, height) => {
        // Create canvas with working context
        const workingCanvas = canvasManager.createCanvas(width, height);
        const originalId = (workingCanvas as any)._testId;

        // Property: Working canvas should pass validation unchanged
        const validatedCanvas = canvasManager.validateAndRecreateCanvas(workingCanvas);
        const validatedId = (validatedCanvas as any)._testId;
        
        expect(validatedCanvas).toBe(workingCanvas); // Should be same object
        expect(validatedId).toBe(originalId); // Should have same ID
        expect(validatedCanvas.width).toBe(width);
        expect(validatedCanvas.height).toBe(height);
      }
    ), { numRuns: 100 });
  });
});