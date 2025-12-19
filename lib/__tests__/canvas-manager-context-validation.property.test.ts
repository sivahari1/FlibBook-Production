/**
 * Canvas Manager Context Validation Property Tests
 * 
 * Property-based tests for canvas context validation functionality
 * 
 * **PDF Rendering Reliability Fix, Property 9: Canvas context validation**
 * **Validates: Requirements 4.1**
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
      return mockCanvas();
    }
    return originalCreateElement.call(document, tagName);
  });
});

afterEach(() => {
  document.createElement = originalCreateElement;
});

describe('Canvas Manager Context Validation Properties', () => {
  let canvasManager: CanvasManager;

  beforeEach(() => {
    canvasManager = new CanvasManager(DEFAULT_RELIABILITY_CONFIG);
  });

  afterEach(() => {
    canvasManager.cleanup();
  });

  test('**PDF Rendering Reliability Fix, Property 9: Canvas context validation** - Canvas creation always validates context', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 1, max: 4096 }), // width
      fc.integer({ min: 1, max: 4096 }), // height
      (width, height) => {
        // Mock successful context creation
        const mockCtx = mockContext();
        const canvas = mockCanvas();
        (canvas.getContext as any).mockReturnValue(mockCtx);
        (document.createElement as any).mockReturnValue(canvas);

        // Property: Canvas creation should always validate context successfully
        const createdCanvas = canvasManager.createCanvas(width, height);
        
        // Verify canvas was created with correct dimensions
        expect(createdCanvas.width).toBe(width);
        expect(createdCanvas.height).toBe(height);
        
        // Verify context was requested and validated
        expect(canvas.getContext).toHaveBeenCalledWith('2d');
        
        // Verify context can be retrieved
        const context = canvasManager.getContext(createdCanvas);
        expect(context).toBeTruthy();
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 9: Canvas context validation** - Context creation failure throws appropriate error', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 1, max: 4096 }), // width
      fc.integer({ min: 1, max: 4096 }), // height
      (width, height) => {
        // Mock failed context creation
        const canvas = mockCanvas();
        (canvas.getContext as any).mockReturnValue(null);
        (document.createElement as any).mockReturnValue(canvas);

        // Property: Failed context creation should always throw an error
        expect(() => {
          canvasManager.createCanvas(width, height);
        }).toThrow();
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 9: Canvas context validation** - Context validation detects corrupted contexts', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 1, max: 1024 }), // width
      fc.integer({ min: 1, max: 1024 }), // height
      (width, height) => {
        // Create canvas with working context initially
        const mockCtx = mockContext();
        const canvas = mockCanvas();
        (canvas.getContext as any).mockReturnValue(mockCtx);
        
        // Mock createElement to return different canvas instances
        let callCount = 0;
        (document.createElement as any).mockImplementation((tagName: string) => {
          if (tagName === 'canvas') {
            callCount++;
            const newCanvas = mockCanvas();
            newCanvas.width = width;
            newCanvas.height = height;
            
            if (callCount === 1) {
              // First canvas - will be corrupted
              (newCanvas.getContext as any).mockReturnValue(mockCtx);
              return newCanvas;
            } else {
              // Subsequent canvases - working context
              const workingCtx = mockContext();
              (newCanvas.getContext as any).mockReturnValue(workingCtx);
              return newCanvas;
            }
          }
          return originalCreateElement.call(document, tagName);
        });

        const createdCanvas = canvasManager.createCanvas(width, height);
        
        // Simulate context corruption by making save/restore throw
        mockCtx.save.mockImplementation(() => {
          throw new Error('Context corrupted');
        });

        // Property: Validation should detect corrupted context and recreate canvas
        const validatedCanvas = canvasManager.validateAndRecreateCanvas(createdCanvas);
        
        // Should return a different canvas (recreated)
        expect(validatedCanvas).not.toBe(createdCanvas);
        expect(validatedCanvas.width).toBe(width);
        expect(validatedCanvas.height).toBe(height);
      }
    ), { numRuns: 100 });
  });

  test('**PDF Rendering Reliability Fix, Property 9: Canvas context validation** - Valid contexts pass validation unchanged', async () => {
    await fc.assert(fc.property(
      fc.integer({ min: 1, max: 1024 }), // width
      fc.integer({ min: 1, max: 1024 }), // height
      (width, height) => {
        // Create canvas with working context
        const mockCtx = mockContext();
        const canvas = mockCanvas();
        (canvas.getContext as any).mockReturnValue(mockCtx);
        (document.createElement as any).mockReturnValue(canvas);

        const createdCanvas = canvasManager.createCanvas(width, height);
        
        // Property: Valid context should pass validation unchanged
        const validatedCanvas = canvasManager.validateAndRecreateCanvas(createdCanvas);
        
        // Should return the same canvas (no recreation needed)
        expect(validatedCanvas).toBe(createdCanvas);
      }
    ), { numRuns: 100 });
  });
});