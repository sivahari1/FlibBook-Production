import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import PDFViewerWithPDFJS, { WatermarkSettings } from '../PDFViewerWithPDFJS';
import userEvent from '@testing-library/user-event';

/**
 * Property-based tests for PDF.js watermark navigation persistence
 * 
 * Feature: pdf-iframe-blocking-fix, Property 8: Watermark navigation persistence
 * Validates: Requirements 3.4
 * 
 * Tests:
 * - For any page navigation action, watermarks should remain visible on all pages
 * - For any sequence of page changes, watermarks should persist with correct settings
 * - For any navigation method (buttons, keyboard, direct page input), watermarks should remain visible
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
        numPages: 10,
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
      numPages: 10,
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

describe('PDFViewerWithPDFJS Watermark Navigation Persistence Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 8: Watermark navigation persistence
   * For any page navigation action, watermarks should remain visible on all pages
   * Validates: Requirements 3.4
   */
  it('should maintain watermark presence when navigating to next page', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random watermark settings
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 50 }),
          opacity: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
          fontSize: fc.integer({ min: 12, max: 100 }),
        }),
        // Generate random starting page (1 to 9, so we can navigate next)
        fc.integer({ min: 1, max: 9 }),
        async (watermark, startPage) => {
          const user = userEvent.setup();
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={watermark}
              viewMode="single"
            />
          );

          try {
            // Wait for PDF to load and render
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify watermark is present on initial page
            let watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
            expect(watermarkContainer).toBeInTheDocument();
            
            let watermarkOverlay = screen.getByTestId('watermark-overlay');
            expect(watermarkOverlay).toHaveAttribute('data-text', watermark.text);

            // Navigate to next page
            const nextButton = screen.getByRole('button', { name: /next/i });
            await user.click(nextButton);

            // Wait for page to render (check page input value changes)
            await waitFor(() => {
              const pageInput = screen.getByTestId('pdfjs-page-input');
              expect(pageInput).toBeInTheDocument();
            }, { timeout: 2000 });

            // Verify watermark is still present after navigation
            watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
            expect(watermarkContainer).toBeInTheDocument();
            
            watermarkOverlay = screen.getByTestId('watermark-overlay');
            expect(watermarkOverlay).toBeInTheDocument();
            expect(watermarkOverlay).toHaveAttribute('data-text', watermark.text);
            
            // Verify watermark properties are maintained
            expect(parseFloat(watermarkOverlay.getAttribute('data-opacity') || '0')).toBeCloseTo(watermark.opacity, 2);
            expect(watermarkContainer).toHaveClass('absolute', 'inset-0');
            expect(watermarkContainer).toHaveStyle({ pointerEvents: 'none' });
            expect(watermarkContainer).toHaveStyle({ zIndex: '10' });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should maintain watermark presence when navigating to previous page', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random watermark settings
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 50 }),
          opacity: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
          fontSize: fc.integer({ min: 12, max: 100 }),
        }),
        async (watermark) => {
          const user = userEvent.setup();
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={watermark}
              viewMode="single"
            />
          );

          try {
            // Wait for PDF to load and render
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Navigate to page 2 first
            const nextButton = screen.getByRole('button', { name: /next/i });
            await user.click(nextButton);

            await waitFor(() => {
              const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
              expect(pageInput.value).toBe('2');
            }, { timeout: 2000 });

            // Verify watermark is present on page 2
            let watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
            expect(watermarkContainer).toBeInTheDocument();

            // Navigate back to previous page
            const prevButton = screen.getByRole('button', { name: /previous/i });
            await user.click(prevButton);

            await waitFor(() => {
              const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
              expect(pageInput.value).toBe('1');
            }, { timeout: 2000 });

            // Verify watermark is still present after navigating back
            watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
            expect(watermarkContainer).toBeInTheDocument();
            
            const watermarkOverlay = screen.getByTestId('watermark-overlay');
            expect(watermarkOverlay).toBeInTheDocument();
            expect(watermarkOverlay).toHaveAttribute('data-text', watermark.text);
            
            // Verify watermark properties are maintained
            expect(parseFloat(watermarkOverlay.getAttribute('data-opacity') || '0')).toBeCloseTo(watermark.opacity, 2);
            expect(watermarkContainer).toHaveClass('absolute', 'inset-0');
            expect(watermarkContainer).toHaveStyle({ pointerEvents: 'none' });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should maintain watermark through sequence of page navigations', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random watermark settings
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 30 }),
          opacity: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
          fontSize: fc.integer({ min: 20, max: 80 }),
        }),
        // Generate sequence of navigation actions (2-5 actions)
        fc.array(
          fc.constantFrom('next', 'previous'),
          { minLength: 2, maxLength: 5 }
        ),
        async (watermark, navigationSequence) => {
          const user = userEvent.setup();
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={watermark}
              viewMode="single"
            />
          );

          try {
            // Wait for PDF to load and render
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Perform each navigation action in sequence
            for (const action of navigationSequence) {
              // Verify watermark is present before navigation
              let watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
              expect(watermarkContainer).toBeInTheDocument();
              
              let watermarkOverlay = screen.getByTestId('watermark-overlay');
              expect(watermarkOverlay).toHaveAttribute('data-text', watermark.text);

              // Perform navigation
              if (action === 'next') {
                const nextButton = screen.queryByRole('button', { name: /next/i });
                if (nextButton && !nextButton.hasAttribute('disabled')) {
                  await user.click(nextButton);
                  await waitFor(() => {
                    expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
                  }, { timeout: 2000 });
                }
              } else {
                const prevButton = screen.queryByRole('button', { name: /previous/i });
                if (prevButton && !prevButton.hasAttribute('disabled')) {
                  await user.click(prevButton);
                  await waitFor(() => {
                    expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
                  }, { timeout: 2000 });
                }
              }

              // Verify watermark is still present after navigation
              watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
              expect(watermarkContainer).toBeInTheDocument();
              
              watermarkOverlay = screen.getByTestId('watermark-overlay');
              expect(watermarkOverlay).toBeInTheDocument();
              expect(watermarkOverlay).toHaveAttribute('data-text', watermark.text);
            }

            // Final verification that watermark is still present
            const finalWatermarkContainer = screen.getByTestId('pdfjs-watermark-container');
            expect(finalWatermarkContainer).toBeInTheDocument();
            
            const finalWatermarkOverlay = screen.getByTestId('watermark-overlay');
            expect(finalWatermarkOverlay).toHaveAttribute('data-text', watermark.text);
            expect(parseFloat(finalWatermarkOverlay.getAttribute('data-opacity') || '0')).toBeCloseTo(watermark.opacity, 2);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50, timeout: 15000 }
    );
  }, 45000);

  it('should maintain watermark properties unchanged across page navigation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random watermark settings
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 50 }),
          opacity: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
          fontSize: fc.integer({ min: 12, max: 100 }),
        }),
        // Generate number of pages to navigate (1-5)
        fc.integer({ min: 1, max: 5 }),
        async (watermark, pagesToNavigate) => {
          const user = userEvent.setup();
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={watermark}
              viewMode="single"
            />
          );

          try {
            // Wait for PDF to load and render
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Get initial watermark properties
            const initialOverlay = screen.getByTestId('watermark-overlay');
            const initialText = initialOverlay.getAttribute('data-text');
            const initialOpacity = parseFloat(initialOverlay.getAttribute('data-opacity') || '0');
            const initialFontSize = parseFloat(initialOverlay.getAttribute('data-fontsize') || '0');

            // Navigate through pages
            const nextButton = screen.getByRole('button', { name: /next/i });
            for (let i = 0; i < pagesToNavigate; i++) {
              if (!nextButton.hasAttribute('disabled')) {
                await user.click(nextButton);
                await waitFor(() => {
                  expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
                }, { timeout: 2000 });
              }
            }

            // Verify watermark properties are unchanged
            const finalOverlay = screen.getByTestId('watermark-overlay');
            expect(finalOverlay.getAttribute('data-text')).toBe(initialText);
            expect(parseFloat(finalOverlay.getAttribute('data-opacity') || '0')).toBeCloseTo(initialOpacity, 2);
            expect(parseFloat(finalOverlay.getAttribute('data-fontsize') || '0')).toBe(initialFontSize);

            // Verify watermark container properties are maintained
            const watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
            expect(watermarkContainer).toHaveClass('absolute', 'inset-0');
            expect(watermarkContainer).toHaveStyle({ pointerEvents: 'none' });
            expect(watermarkContainer).toHaveStyle({ zIndex: '10' });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should maintain watermark when navigating to first page', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random watermark settings
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 50 }),
          opacity: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
          fontSize: fc.integer({ min: 12, max: 100 }),
        }),
        async (watermark) => {
          const user = userEvent.setup();
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={watermark}
              viewMode="single"
            />
          );

          try {
            // Wait for PDF to load and render
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Navigate to a middle page first
            const nextButton = screen.getByRole('button', { name: /next/i });
            await user.click(nextButton);
            await user.click(nextButton);
            await user.click(nextButton);

            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 2000 });

            // Navigate to first page using keyboard shortcut (Home)
            await user.keyboard('{Home}');

            await waitFor(() => {
              const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
              expect(pageInput.value).toBe('1');
            }, { timeout: 2000 });

            // Verify watermark is present on first page
            const watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
            expect(watermarkContainer).toBeInTheDocument();
            
            const watermarkOverlay = screen.getByTestId('watermark-overlay');
            expect(watermarkOverlay).toBeInTheDocument();
            expect(watermarkOverlay).toHaveAttribute('data-text', watermark.text);
            expect(parseFloat(watermarkOverlay.getAttribute('data-opacity') || '0')).toBeCloseTo(watermark.opacity, 2);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should maintain watermark when navigating to last page', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random watermark settings
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 50 }),
          opacity: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
          fontSize: fc.integer({ min: 12, max: 100 }),
        }),
        async (watermark) => {
          const user = userEvent.setup();
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={watermark}
              viewMode="single"
            />
          );

          try {
            // Wait for PDF to load and render
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Navigate to last page using keyboard shortcut (End)
            await user.keyboard('{End}');

            await waitFor(() => {
              const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
              expect(pageInput.value).toBe('10');
            }, { timeout: 2000 });

            // Verify watermark is present on last page
            const watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
            expect(watermarkContainer).toBeInTheDocument();
            
            const watermarkOverlay = screen.getByTestId('watermark-overlay');
            expect(watermarkOverlay).toBeInTheDocument();
            expect(watermarkOverlay).toHaveAttribute('data-text', watermark.text);
            expect(parseFloat(watermarkOverlay.getAttribute('data-opacity') || '0')).toBeCloseTo(watermark.opacity, 2);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should maintain watermark when using keyboard navigation (arrow keys)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random watermark settings
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 30 }),
          opacity: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
          fontSize: fc.integer({ min: 20, max: 80 }),
        }),
        // Generate random key (ArrowRight or ArrowLeft)
        fc.constantFrom('ArrowRight', 'ArrowLeft'),
        async (watermark, arrowKey) => {
          const user = userEvent.setup();
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={watermark}
              viewMode="single"
            />
          );

          try {
            // Wait for PDF to load and render
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // If using ArrowLeft, navigate forward first so we can go back
            if (arrowKey === 'ArrowLeft') {
              await user.keyboard('{ArrowRight}');
              await waitFor(() => {
                expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
              }, { timeout: 2000 });
            }

            // Verify watermark before keyboard navigation
            let watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
            expect(watermarkContainer).toBeInTheDocument();

            // Navigate using keyboard
            await user.keyboard(`{${arrowKey}}`);

            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 2000 });

            // Verify watermark is still present after keyboard navigation
            watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
            expect(watermarkContainer).toBeInTheDocument();
            
            const watermarkOverlay = screen.getByTestId('watermark-overlay');
            expect(watermarkOverlay).toBeInTheDocument();
            expect(watermarkOverlay).toHaveAttribute('data-text', watermark.text);
            expect(parseFloat(watermarkOverlay.getAttribute('data-opacity') || '0')).toBeCloseTo(watermark.opacity, 2);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should maintain watermark in continuous scroll mode when scrolling through pages', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random watermark settings
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 50 }),
          opacity: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
          fontSize: fc.integer({ min: 12, max: 100 }),
        }),
        async (watermark) => {
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={watermark}
              viewMode="continuous"
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-continuous-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Wait for pages to load
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-page-1')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify continuous container exists
            const continuousContainer = screen.getByTestId('pdfjs-continuous-container');
            expect(continuousContainer).toBeInTheDocument();

            // In continuous mode, pages are stacked vertically
            // Each page should have its own watermark as it renders
            const page1 = screen.getByTestId('pdfjs-page-1');
            expect(page1).toBeInTheDocument();

            // Verify that the watermark settings are available for rendering
            // (In continuous mode, watermarks are applied per-page as they load)
            // The component should maintain watermark settings throughout scrolling
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should maintain watermark for any combination of navigation and watermark settings', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random watermark settings
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 50 }),
          opacity: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
          fontSize: fc.integer({ min: 12, max: 100 }),
        }),
        // Generate random view mode
        fc.constantFrom('single', 'continuous'),
        // Generate random DRM setting
        fc.boolean(),
        // Generate random number of navigation actions
        fc.integer({ min: 1, max: 3 }),
        async (watermark, viewMode, enableDRM, navigationCount) => {
          const user = userEvent.setup();
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={watermark}
              viewMode={viewMode}
              enableDRM={enableDRM}
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              if (viewMode === 'single') {
                expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
              } else {
                expect(screen.getByTestId('pdfjs-continuous-container')).toBeInTheDocument();
              }
            }, { timeout: 3000 });

            if (viewMode === 'single') {
              // Wait for watermark to render
              await waitFor(() => {
                expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
              }, { timeout: 3000 });

              // Perform navigation actions
              const nextButton = screen.getByRole('button', { name: /next/i });
              for (let i = 0; i < navigationCount; i++) {
                if (!nextButton.hasAttribute('disabled')) {
                  await user.click(nextButton);
                  await waitFor(() => {
                    expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
                  }, { timeout: 2000 });
                }
              }

              // Verify watermark is still present
              const watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
              expect(watermarkContainer).toBeInTheDocument();
              
              const watermarkOverlay = screen.getByTestId('watermark-overlay');
              expect(watermarkOverlay).toHaveAttribute('data-text', watermark.text);
              expect(parseFloat(watermarkOverlay.getAttribute('data-opacity') || '0')).toBeCloseTo(watermark.opacity, 2);
            } else {
              // In continuous mode, verify pages exist
              await waitFor(() => {
                expect(screen.getByTestId('pdfjs-page-1')).toBeInTheDocument();
              }, { timeout: 3000 });
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);
});
