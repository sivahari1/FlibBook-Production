import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import userEvent from '@testing-library/user-event';
import PDFViewerWithPDFJS from '../PDFViewerWithPDFJS';

/**
 * Property-based tests for PDF.js zoom controls
 * 
 * Feature: pdf-iframe-blocking-fix, Property 17: Zoom control functionality
 * Validates: Requirements 5.4
 * 
 * Tests:
 * - For any zoom action (in/out), the PDF scale should change by the specified amount
 * - Zoom level always stays between 0.5x and 3.0x
 * - Zoom operations maintain current page visibility
 */

// Mock PDF.js
vi.mock('@/lib/pdfjs-config', () => ({
  initializePDFJS: vi.fn(),
  isPDFJSAvailable: vi.fn(() => true),
}));

vi.mock('@/lib/pdfjs-integration', () => ({
  loadPDFDocument: vi.fn(async ({ onProgress }) => {
    // Simulate progress
    onProgress?.({ loaded: 50, total: 100 });
    onProgress?.({ loaded: 100, total: 100 });
    
    return {
      document: {
        numPages: 5,
        getPage: vi.fn(async (pageNum: number) => ({
          pageNumber: pageNum,
          getViewport: vi.fn(({ scale }: { scale: number }) => ({
            width: 800 * scale,
            height: 1000 * scale,
            scale,
          })),
          render: vi.fn(() => ({
            promise: Promise.resolve(),
          })),
        })),
      },
      numPages: 5,
    };
  }),
  renderPageToCanvas: vi.fn(async () => {}),
  cleanupCanvas: vi.fn(),
  destroyPDFDocument: vi.fn(),
  PDFDocumentLoaderError: class PDFDocumentLoaderError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
  PDFPageRendererError: class PDFPageRendererError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock('@/lib/pdfjs-memory', () => ({
  createMemoryManager: vi.fn(() => ({
    setPDFDocument: vi.fn(),
    addRenderedPage: vi.fn(),
    addPageObject: vi.fn(),
    prioritizePages: vi.fn((pages) => pages),
    removeNonPriorityPages: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('@/lib/pdfjs-render-pipeline', () => ({
  getGlobalRenderPipeline: vi.fn(() => ({
    queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
      // Simulate successful render
      setTimeout(() => callback(null), 0);
    }),
  })),
}));

describe('PDFViewerWithPDFJS Zoom Controls Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 17: Zoom control functionality
   * For any zoom action (in/out), the PDF scale should change by the specified amount
   * Validates: Requirements 5.4
   */
  it('should change zoom level by 0.25 (25%) for each zoom in/out action', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of zoom in clicks (1-8)
        fc.integer({ min: 1, max: 8 }),
        // Generate random number of zoom out clicks (1-4)
        fc.integer({ min: 1, max: 4 }),
        async (zoomInClicks, zoomOutClicks) => {
          const user = userEvent.setup();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-zoom-controls')).toBeInTheDocument();
            }, { timeout: 3000 });

            const zoomInButton = screen.getByTestId('pdfjs-zoom-in-button');
            const zoomOutButton = screen.getByTestId('pdfjs-zoom-out-button');
            const zoomLevelDisplay = screen.getByTestId('pdfjs-zoom-level');

            // Initial zoom should be 100%
            expect(zoomLevelDisplay.textContent).toBe('100%');

            // Perform zoom in operations
            for (let i = 0; i < zoomInClicks; i++) {
              await user.click(zoomInButton);
            }

            // Calculate expected zoom after zoom in
            const expectedZoomAfterIn = Math.min(100 + (zoomInClicks * 25), 300);
            expect(zoomLevelDisplay.textContent).toBe(`${expectedZoomAfterIn}%`);

            // Perform zoom out operations
            for (let i = 0; i < zoomOutClicks; i++) {
              await user.click(zoomOutButton);
            }

            // Calculate expected final zoom with bounds
            const expectedChange = (zoomInClicks - zoomOutClicks) * 25;
            const expectedFinalZoom = Math.max(50, Math.min(300, 100 + expectedChange));
            
            // Verify final zoom matches expected
            expect(zoomLevelDisplay.textContent).toBe(`${expectedFinalZoom}%`);
            
            // Verify actual zoom value
            const actualFinalZoom = parseInt(zoomLevelDisplay.textContent || '100');
            expect(actualFinalZoom).toBe(expectedFinalZoom);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 20000);

  it('should never allow zoom level below 0.5x (50%) when zooming out', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of zoom out clicks (1-10)
        fc.integer({ min: 1, max: 10 }),
        async (zoomOutClicks) => {
          const user = userEvent.setup();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-zoom-controls')).toBeInTheDocument();
            }, { timeout: 3000 });

            const zoomOutButton = screen.getByTestId('pdfjs-zoom-out-button');
            const zoomLevelDisplay = screen.getByTestId('pdfjs-zoom-level');

            // Perform zoom out operations
            for (let i = 0; i < zoomOutClicks; i++) {
              await user.click(zoomOutButton);
            }

            // Get final zoom level
            const finalZoom = parseInt(zoomLevelDisplay.textContent || '100');

            // Zoom level should never be below 50% (0.5x)
            expect(finalZoom).toBeGreaterThanOrEqual(50);

            // If at minimum zoom, button should be disabled
            if (finalZoom === 50) {
              expect(zoomOutButton).toBeDisabled();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 20000);

  it('should never allow zoom level above 3.0x (300%) when zooming in', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of zoom in clicks (1-15)
        fc.integer({ min: 1, max: 15 }),
        async (zoomInClicks) => {
          const user = userEvent.setup();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-zoom-controls')).toBeInTheDocument();
            }, { timeout: 3000 });

            const zoomInButton = screen.getByTestId('pdfjs-zoom-in-button');
            const zoomLevelDisplay = screen.getByTestId('pdfjs-zoom-level');

            // Perform zoom in operations
            for (let i = 0; i < zoomInClicks; i++) {
              await user.click(zoomInButton);
            }

            // Get final zoom level
            const finalZoom = parseInt(zoomLevelDisplay.textContent || '100');

            // Zoom level should never be above 300% (3.0x)
            expect(finalZoom).toBeLessThanOrEqual(300);

            // If at maximum zoom, button should be disabled
            if (finalZoom === 300) {
              expect(zoomInButton).toBeDisabled();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 20000);

  it('should maintain zoom bounds with random mixed zoom operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random sequence of zoom operations
        fc.array(fc.constantFrom('in', 'out'), { minLength: 3, maxLength: 12 }),
        async (zoomOperations) => {
          const user = userEvent.setup();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-zoom-controls')).toBeInTheDocument();
            }, { timeout: 3000 });

            const zoomInButton = screen.getByTestId('pdfjs-zoom-in-button');
            const zoomOutButton = screen.getByTestId('pdfjs-zoom-out-button');
            const zoomLevelDisplay = screen.getByTestId('pdfjs-zoom-level');

            // Perform random zoom operations
            for (const operation of zoomOperations) {
              if (operation === 'in') {
                await user.click(zoomInButton);
              } else {
                await user.click(zoomOutButton);
              }
            }

            // Get final zoom level
            const finalZoom = parseInt(zoomLevelDisplay.textContent || '100');

            // Zoom level should always be within bounds
            expect(finalZoom).toBeGreaterThanOrEqual(50);
            expect(finalZoom).toBeLessThanOrEqual(300);

            // Verify buttons are disabled at boundaries
            if (finalZoom === 50) {
              expect(zoomOutButton).toBeDisabled();
              expect(zoomInButton).not.toBeDisabled();
            } else if (finalZoom === 300) {
              expect(zoomInButton).toBeDisabled();
              expect(zoomOutButton).not.toBeDisabled();
            } else {
              expect(zoomInButton).not.toBeDisabled();
              expect(zoomOutButton).not.toBeDisabled();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 20000);

  it('should maintain zoom level consistency across multiple operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random sequence of operations
        fc.array(fc.constantFrom('in', 'out'), { minLength: 5, maxLength: 10 }),
        async (operations) => {
          const user = userEvent.setup();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-zoom-controls')).toBeInTheDocument();
            }, { timeout: 3000 });

            const zoomInButton = screen.getByTestId('pdfjs-zoom-in-button');
            const zoomOutButton = screen.getByTestId('pdfjs-zoom-out-button');
            const zoomLevelDisplay = screen.getByTestId('pdfjs-zoom-level');

            // Track zoom levels throughout operations
            const zoomLevels: number[] = [100]; // Start at 100%

            // Perform operations and track zoom
            for (const operation of operations) {
              const button = operation === 'in' ? zoomInButton : zoomOutButton;
              await user.click(button);
              
              const currentZoom = parseInt(zoomLevelDisplay.textContent || '100');
              zoomLevels.push(currentZoom);
            }

            // Verify all zoom levels are within bounds
            for (const zoom of zoomLevels) {
              expect(zoom).toBeGreaterThanOrEqual(50);
              expect(zoom).toBeLessThanOrEqual(300);
            }

            // Verify zoom changes are consistent (25% increments)
            for (let i = 1; i < zoomLevels.length; i++) {
              const change = Math.abs(zoomLevels[i] - zoomLevels[i - 1]);
              // Change should be 0 (at boundary) or 25 (normal increment)
              expect([0, 25]).toContain(change);
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 30, timeout: 10000 }
    );
  }, 20000);

  it('should handle rapid zoom operations without exceeding bounds', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of rapid clicks (5-12)
        fc.integer({ min: 5, max: 12 }),
        // Generate random operation type
        fc.constantFrom('in', 'out'),
        async (rapidClicks, operation) => {
          const user = userEvent.setup();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-zoom-controls')).toBeInTheDocument();
            }, { timeout: 3000 });

            const zoomInButton = screen.getByTestId('pdfjs-zoom-in-button');
            const zoomOutButton = screen.getByTestId('pdfjs-zoom-out-button');
            const zoomLevelDisplay = screen.getByTestId('pdfjs-zoom-level');

            // Perform rapid clicks
            const button = operation === 'in' ? zoomInButton : zoomOutButton;
            for (let i = 0; i < rapidClicks; i++) {
              await user.click(button);
            }

            // Get final zoom level
            const finalZoom = parseInt(zoomLevelDisplay.textContent || '100');

            // Zoom level should always be within bounds
            expect(finalZoom).toBeGreaterThanOrEqual(50);
            expect(finalZoom).toBeLessThanOrEqual(300);

            // Button should be disabled at boundaries
            if (finalZoom === 50) {
              expect(zoomOutButton).toBeDisabled();
            }
            if (finalZoom === 300) {
              expect(zoomInButton).toBeDisabled();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 30, timeout: 10000 }
    );
  }, 20000);

  it('should correctly calculate zoom level after alternating operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate equal number of zoom in and out operations
        fc.integer({ min: 1, max: 5 }),
        async (operationCount) => {
          const user = userEvent.setup();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-zoom-controls')).toBeInTheDocument();
            }, { timeout: 3000 });

            const zoomInButton = screen.getByTestId('pdfjs-zoom-in-button');
            const zoomOutButton = screen.getByTestId('pdfjs-zoom-out-button');
            const zoomLevelDisplay = screen.getByTestId('pdfjs-zoom-level');

            // Initial zoom should be 100%
            expect(zoomLevelDisplay.textContent).toBe('100%');

            // Perform equal zoom in and out operations
            for (let i = 0; i < operationCount; i++) {
              await user.click(zoomInButton);
            }
            for (let i = 0; i < operationCount; i++) {
              await user.click(zoomOutButton);
            }

            // Should return to 100%
            expect(zoomLevelDisplay.textContent).toBe('100%');
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 20000);

  it('should enforce zoom increment of exactly 0.25 (25%) per operation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of operations (1-4) to stay within bounds
        fc.integer({ min: 1, max: 4 }),
        async (operationCount) => {
          const user = userEvent.setup();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-zoom-controls')).toBeInTheDocument();
            }, { timeout: 3000 });

            const zoomInButton = screen.getByTestId('pdfjs-zoom-in-button');
            const zoomLevelDisplay = screen.getByTestId('pdfjs-zoom-level');

            // Track zoom levels
            const zoomLevels: number[] = [100]; // Initial zoom

            // Perform zoom operations and track each level
            for (let i = 0; i < operationCount; i++) {
              await user.click(zoomInButton);
              const currentZoom = parseInt(zoomLevelDisplay.textContent || '100');
              zoomLevels.push(currentZoom);
            }

            // Verify each increment is exactly 25%
            for (let i = 1; i < zoomLevels.length; i++) {
              const increment = zoomLevels[i] - zoomLevels[i - 1];
              expect(increment).toBe(25);
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 20000);
});
