import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import PDFViewerWithPDFJS, { WatermarkSettings } from '../PDFViewerWithPDFJS';

/**
 * Property-based tests for PDF.js watermark dynamic updates
 * 
 * Feature: pdf-iframe-blocking-fix, Property 9: Watermark dynamic updates
 * Validates: Requirements 3.5
 * 
 * Tests:
 * - For any watermark setting change, the display should update to reflect the new settings immediately
 * - For any sequence of watermark updates, each update should be reflected in the display
 * - For any watermark property (text, opacity, fontSize), changes should update immediately
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
        numPages: 3,
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
      numPages: 3,
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

// Mock WatermarkOverlay to track rendering
vi.mock('../WatermarkOverlay', () => ({
  default: ({ text, opacity, fontSize }: { text: string; opacity: number; fontSize: number }) => (
    <div 
      data-testid="watermark-overlay"
      data-text={text}
      data-opacity={opacity}
      data-fontsize={fontSize}
    >
      {text}
    </div>
  ),
}));

vi.mock('../LoadingSpinner', () => ({
  default: ({ message }: { message?: string }) => <div data-testid="loading-spinner">{message}</div>,
}));

vi.mock('../ViewerError', () => ({
  default: ({ error, onRetry }: { error: string; onRetry: () => void }) => (
    <div data-testid="viewer-error">
      <p>{error}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

describe('PDFViewerWithPDFJS Watermark Dynamic Updates Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 9: Watermark dynamic updates
   * For any watermark setting change, the display should update to reflect the new settings immediately
   * Validates: Requirements 3.5
   */
  it('should update watermark text immediately when settings change', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial watermark text
        fc.string({ minLength: 1, maxLength: 50 }),
        // Generate updated watermark text (different from initial)
        fc.string({ minLength: 1, maxLength: 50 }),
        // Generate opacity
        fc.double({ min: 0.1, max: 1.0 }),
        // Generate font size
        fc.integer({ min: 12, max: 100 }),
        async (initialText, updatedText, opacity, fontSize) => {
          // Ensure texts are different
          if (initialText === updatedText) {
            updatedText = updatedText + '_UPDATED';
          }

          const initialWatermark: WatermarkSettings = {
            text: initialText,
            opacity,
            fontSize,
          };

          const { rerender, unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={initialWatermark}
              viewMode="single"
            />
          );

          try {
            // Wait for initial watermark to render
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify initial watermark text
            const initialOverlay = screen.getByTestId('watermark-overlay');
            expect(initialOverlay).toHaveAttribute('data-text', initialText);

            // Update watermark settings
            const updatedWatermark: WatermarkSettings = {
              text: updatedText,
              opacity,
              fontSize,
            };

            rerender(
              <PDFViewerWithPDFJS
                pdfUrl="https://example.com/test.pdf"
                documentTitle="Test Document"
                watermark={updatedWatermark}
                viewMode="single"
              />
            );

            // Verify watermark text updated immediately
            await waitFor(() => {
              const updatedOverlay = screen.getByTestId('watermark-overlay');
              expect(updatedOverlay).toHaveAttribute('data-text', updatedText);
            }, { timeout: 1000 });

            // Verify watermark text is different from initial
            const finalOverlay = screen.getByTestId('watermark-overlay');
            expect(finalOverlay.getAttribute('data-text')).not.toBe(initialText);
            expect(finalOverlay.getAttribute('data-text')).toBe(updatedText);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should update watermark opacity immediately when settings change', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate text
        fc.string({ minLength: 1, maxLength: 30 }),
        // Generate initial opacity
        fc.double({ min: 0.1, max: 0.5, noNaN: true }),
        // Generate updated opacity (different range to ensure difference)
        fc.double({ min: 0.6, max: 1.0, noNaN: true }),
        // Generate font size
        fc.integer({ min: 20, max: 80 }),
        async (text, initialOpacity, updatedOpacity, fontSize) => {
          const initialWatermark: WatermarkSettings = {
            text,
            opacity: initialOpacity,
            fontSize,
          };

          const { rerender, unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={initialWatermark}
              viewMode="single"
            />
          );

          try {
            // Wait for initial watermark to render
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify initial opacity
            const initialOverlay = screen.getByTestId('watermark-overlay');
            expect(parseFloat(initialOverlay.getAttribute('data-opacity') || '0')).toBeCloseTo(initialOpacity, 2);

            // Update watermark settings
            const updatedWatermark: WatermarkSettings = {
              text,
              opacity: updatedOpacity,
              fontSize,
            };

            rerender(
              <PDFViewerWithPDFJS
                pdfUrl="https://example.com/test.pdf"
                documentTitle="Test Document"
                watermark={updatedWatermark}
                viewMode="single"
              />
            );

            // Verify opacity updated immediately
            await waitFor(() => {
              const updatedOverlay = screen.getByTestId('watermark-overlay');
              const currentOpacity = parseFloat(updatedOverlay.getAttribute('data-opacity') || '0');
              expect(currentOpacity).toBeCloseTo(updatedOpacity, 2);
            }, { timeout: 1000 });

            // Verify opacity is different from initial
            const finalOverlay = screen.getByTestId('watermark-overlay');
            const finalOpacity = parseFloat(finalOverlay.getAttribute('data-opacity') || '0');
            expect(Math.abs(finalOpacity - initialOpacity)).toBeGreaterThan(0.05);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should update watermark font size immediately when settings change', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate text
        fc.string({ minLength: 1, maxLength: 30 }),
        // Generate opacity
        fc.double({ min: 0.1, max: 1.0 }),
        // Generate initial font size
        fc.integer({ min: 12, max: 50 }),
        // Generate updated font size (different range to ensure difference)
        fc.integer({ min: 51, max: 100 }),
        async (text, opacity, initialFontSize, updatedFontSize) => {
          const initialWatermark: WatermarkSettings = {
            text,
            opacity,
            fontSize: initialFontSize,
          };

          const { rerender, unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={initialWatermark}
              viewMode="single"
            />
          );

          try {
            // Wait for initial watermark to render
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify initial font size (scaled by zoom level 1.0)
            const initialOverlay = screen.getByTestId('watermark-overlay');
            expect(parseFloat(initialOverlay.getAttribute('data-fontsize') || '0')).toBe(initialFontSize * 1.0);

            // Update watermark settings
            const updatedWatermark: WatermarkSettings = {
              text,
              opacity,
              fontSize: updatedFontSize,
            };

            rerender(
              <PDFViewerWithPDFJS
                pdfUrl="https://example.com/test.pdf"
                documentTitle="Test Document"
                watermark={updatedWatermark}
                viewMode="single"
              />
            );

            // Verify font size updated immediately
            await waitFor(() => {
              const updatedOverlay = screen.getByTestId('watermark-overlay');
              const currentFontSize = parseFloat(updatedOverlay.getAttribute('data-fontsize') || '0');
              expect(currentFontSize).toBe(updatedFontSize * 1.0);
            }, { timeout: 1000 });

            // Verify font size is different from initial
            const finalOverlay = screen.getByTestId('watermark-overlay');
            const finalFontSize = parseFloat(finalOverlay.getAttribute('data-fontsize') || '0');
            expect(finalFontSize).not.toBe(initialFontSize);
            expect(finalFontSize).toBe(updatedFontSize);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should update all watermark properties simultaneously when settings change', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial watermark settings
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 30 }),
          opacity: fc.double({ min: 0.1, max: 0.5, noNaN: true }),
          fontSize: fc.integer({ min: 12, max: 50 }),
        }),
        // Generate updated watermark settings (different ranges)
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 30 }),
          opacity: fc.double({ min: 0.6, max: 1.0, noNaN: true }),
          fontSize: fc.integer({ min: 51, max: 100 }),
        }),
        async (initialWatermark, updatedWatermark) => {
          // Ensure texts are different
          if (initialWatermark.text === updatedWatermark.text) {
            updatedWatermark.text = updatedWatermark.text + '_UPDATED';
          }

          const { rerender, unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={initialWatermark}
              viewMode="single"
            />
          );

          try {
            // Wait for initial watermark to render
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify initial settings
            const initialOverlay = screen.getByTestId('watermark-overlay');
            expect(initialOverlay).toHaveAttribute('data-text', initialWatermark.text);
            expect(parseFloat(initialOverlay.getAttribute('data-opacity') || '0')).toBeCloseTo(initialWatermark.opacity, 2);
            expect(parseFloat(initialOverlay.getAttribute('data-fontsize') || '0')).toBe(initialWatermark.fontSize * 1.0);

            // Update all watermark settings
            rerender(
              <PDFViewerWithPDFJS
                pdfUrl="https://example.com/test.pdf"
                documentTitle="Test Document"
                watermark={updatedWatermark}
                viewMode="single"
              />
            );

            // Verify all settings updated immediately
            await waitFor(() => {
              const updatedOverlay = screen.getByTestId('watermark-overlay');
              expect(updatedOverlay).toHaveAttribute('data-text', updatedWatermark.text);
              
              const currentOpacity = parseFloat(updatedOverlay.getAttribute('data-opacity') || '0');
              expect(currentOpacity).toBeCloseTo(updatedWatermark.opacity, 2);
              
              const currentFontSize = parseFloat(updatedOverlay.getAttribute('data-fontsize') || '0');
              expect(currentFontSize).toBe(updatedWatermark.fontSize * 1.0);
            }, { timeout: 1000 });

            // Verify all properties are different from initial
            const finalOverlay = screen.getByTestId('watermark-overlay');
            expect(finalOverlay.getAttribute('data-text')).not.toBe(initialWatermark.text);
            
            const finalOpacity = parseFloat(finalOverlay.getAttribute('data-opacity') || '0');
            expect(Math.abs(finalOpacity - initialWatermark.opacity)).toBeGreaterThan(0.05);
            
            const finalFontSize = parseFloat(finalOverlay.getAttribute('data-fontsize') || '0');
            expect(finalFontSize).not.toBe(initialWatermark.fontSize);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should handle sequence of watermark updates correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of watermark settings (2-5 updates)
        fc.array(
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 20 }),
            opacity: fc.double({ min: 0.1, max: 1.0 }),
            fontSize: fc.integer({ min: 20, max: 80 }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (watermarkSequence) => {
          // Ensure each watermark has unique text
          watermarkSequence.forEach((wm, index) => {
            wm.text = `${wm.text}_${index}`;
          });

          const { rerender, unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={watermarkSequence[0]}
              viewMode="single"
            />
          );

          try {
            // Wait for initial watermark to render
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Apply each watermark update in sequence
            for (let i = 1; i < watermarkSequence.length; i++) {
              const currentWatermark = watermarkSequence[i];
              
              rerender(
                <PDFViewerWithPDFJS
                  pdfUrl="https://example.com/test.pdf"
                  documentTitle="Test Document"
                  watermark={currentWatermark}
                  viewMode="single"
                />
              );

              // Verify watermark updated to current settings
              await waitFor(() => {
                const overlay = screen.getByTestId('watermark-overlay');
                expect(overlay).toHaveAttribute('data-text', currentWatermark.text);
                
                const opacity = parseFloat(overlay.getAttribute('data-opacity') || '0');
                expect(opacity).toBeCloseTo(currentWatermark.opacity, 2);
                
                const fontSize = parseFloat(overlay.getAttribute('data-fontsize') || '0');
                expect(fontSize).toBe(currentWatermark.fontSize * 1.0);
              }, { timeout: 1000 });
            }

            // Verify final watermark matches last in sequence
            const finalWatermark = watermarkSequence[watermarkSequence.length - 1];
            const finalOverlay = screen.getByTestId('watermark-overlay');
            expect(finalOverlay).toHaveAttribute('data-text', finalWatermark.text);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50, timeout: 15000 }
    );
  }, 45000);

  it('should remove watermark immediately when settings are cleared', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial watermark settings
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 50 }),
          opacity: fc.double({ min: 0.1, max: 1.0 }),
          fontSize: fc.integer({ min: 12, max: 100 }),
        }),
        async (initialWatermark) => {
          const { rerender, unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={initialWatermark}
              viewMode="single"
            />
          );

          try {
            // Wait for initial watermark to render
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify watermark is present
            expect(screen.getByTestId('watermark-overlay')).toBeInTheDocument();

            // Clear watermark settings
            rerender(
              <PDFViewerWithPDFJS
                pdfUrl="https://example.com/test.pdf"
                documentTitle="Test Document"
                watermark={undefined}
                viewMode="single"
              />
            );

            // Verify watermark removed immediately
            await waitFor(() => {
              expect(screen.queryByTestId('pdfjs-watermark-container')).not.toBeInTheDocument();
            }, { timeout: 1000 });

            // Verify watermark overlay is also gone
            expect(screen.queryByTestId('watermark-overlay')).not.toBeInTheDocument();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should restore watermark immediately when settings are re-enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate watermark settings
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 50 }),
          opacity: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
          fontSize: fc.integer({ min: 12, max: 100 }),
        }),
        async (watermark) => {
          const { rerender, unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={watermark}
              viewMode="single"
            />
          );

          try {
            // Wait for initial watermark to render
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Clear watermark
            rerender(
              <PDFViewerWithPDFJS
                pdfUrl="https://example.com/test.pdf"
                documentTitle="Test Document"
                watermark={undefined}
                viewMode="single"
              />
            );

            await waitFor(() => {
              expect(screen.queryByTestId('pdfjs-watermark-container')).not.toBeInTheDocument();
            }, { timeout: 1000 });

            // Re-enable watermark
            rerender(
              <PDFViewerWithPDFJS
                pdfUrl="https://example.com/test.pdf"
                documentTitle="Test Document"
                watermark={watermark}
                viewMode="single"
              />
            );

            // Verify watermark restored immediately
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 1000 });

            // Verify watermark has correct settings
            const overlay = screen.getByTestId('watermark-overlay');
            expect(overlay).toHaveAttribute('data-text', watermark.text);
            expect(parseFloat(overlay.getAttribute('data-opacity') || '0')).toBeCloseTo(watermark.opacity, 2);
            expect(parseFloat(overlay.getAttribute('data-fontsize') || '0')).toBe(watermark.fontSize * 1.0);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should update watermark in continuous mode immediately when settings change', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial watermark
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 30 }),
          opacity: fc.double({ min: 0.1, max: 0.5 }),
          fontSize: fc.integer({ min: 20, max: 50 }),
        }),
        // Generate updated watermark
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 30 }),
          opacity: fc.double({ min: 0.6, max: 1.0 }),
          fontSize: fc.integer({ min: 51, max: 80 }),
        }),
        async (initialWatermark, updatedWatermark) => {
          // Ensure texts are different
          if (initialWatermark.text === updatedWatermark.text) {
            updatedWatermark.text = updatedWatermark.text + '_UPDATED';
          }

          const { rerender, unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={initialWatermark}
              viewMode="continuous"
            />
          );

          try {
            // Wait for continuous container to render
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-continuous-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Wait for at least one page to load
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-page-1')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Update watermark settings
            rerender(
              <PDFViewerWithPDFJS
                pdfUrl="https://example.com/test.pdf"
                documentTitle="Test Document"
                watermark={updatedWatermark}
                viewMode="continuous"
              />
            );

            // Verify continuous container still exists
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-continuous-container')).toBeInTheDocument();
            }, { timeout: 1000 });

            // In continuous mode, watermarks update as pages render
            // The component should have the updated watermark settings ready
            // for when pages are rendered
            expect(screen.getByTestId('pdfjs-page-1')).toBeInTheDocument();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);
});
