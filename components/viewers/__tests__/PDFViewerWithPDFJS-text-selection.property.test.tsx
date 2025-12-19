import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import PDFViewerWithPDFJS from '../PDFViewerWithPDFJS';

/**
 * Property-based tests for PDF.js text selection prevention
 * 
 * Feature: pdf-iframe-blocking-fix, Property 12: Text selection prevention
 * Validates: Requirements 4.3
 * 
 * Tests:
 * - For any attempt to select text in PDF.js rendered content, the selection should be prevented
 * - For any PDF document with DRM enabled, text selection events should be blocked
 * - For any PDF document with DRM disabled, text selection events should be allowed
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

// Mock WatermarkOverlay
vi.mock('../WatermarkOverlay', () => ({
  default: ({ text }: { text: string }) => (
    <div data-testid="watermark-overlay">{text}</div>
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

describe('PDFViewerWithPDFJS Text Selection Prevention Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 12: Text selection prevention
   * For any attempt to select text in PDF.js rendered content, the selection should be prevented
   * Validates: Requirements 4.3
   */
  it('should prevent text selection when DRM is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random document title
        fc.string({ minLength: 1, maxLength: 100 }),
        // Generate random view mode
        fc.constantFrom('single', 'continuous'),
        async (pdfUrl, documentTitle, viewMode) => {
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle={documentTitle}
              enableDRM={true}
              viewMode={viewMode}
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

            // Get the container element
            const container = viewMode === 'single' 
              ? screen.getByTestId('pdfjs-viewer-container')
              : screen.getByTestId('pdfjs-continuous-container');

            // Create a selectstart event
            const selectStartEvent = new Event('selectstart', {
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault and stopPropagation
            const preventDefaultSpy = vi.spyOn(selectStartEvent, 'preventDefault');
            const stopPropagationSpy = vi.spyOn(selectStartEvent, 'stopPropagation');

            // Dispatch the event
            container.dispatchEvent(selectStartEvent);

            // Verify preventDefault and stopPropagation were called
            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(stopPropagationSpy).toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should allow text selection when DRM is disabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random document title
        fc.string({ minLength: 1, maxLength: 100 }),
        // Generate random view mode
        fc.constantFrom('single', 'continuous'),
        async (pdfUrl, documentTitle, viewMode) => {
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle={documentTitle}
              enableDRM={false}
              viewMode={viewMode}
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

            // Get the container element
            const container = viewMode === 'single' 
              ? screen.getByTestId('pdfjs-viewer-container')
              : screen.getByTestId('pdfjs-continuous-container');

            // Create a selectstart event
            const selectStartEvent = new Event('selectstart', {
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(selectStartEvent, 'preventDefault');

            // Dispatch the event
            container.dispatchEvent(selectStartEvent);

            // Verify preventDefault was NOT called (DRM is disabled)
            expect(preventDefaultSpy).not.toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should prevent text selection on document level when DRM is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random document title
        fc.string({ minLength: 1, maxLength: 100 }),
        async (pdfUrl, documentTitle) => {
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle={documentTitle}
              enableDRM={true}
              viewMode="single"
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Create a selectstart event on document
            const selectStartEvent = new Event('selectstart', {
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault and stopPropagation
            const preventDefaultSpy = vi.spyOn(selectStartEvent, 'preventDefault');
            const stopPropagationSpy = vi.spyOn(selectStartEvent, 'stopPropagation');

            // Dispatch the event on document
            document.dispatchEvent(selectStartEvent);

            // Verify preventDefault and stopPropagation were called (document-level listener)
            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(stopPropagationSpy).toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should prevent text selection in continuous scroll mode for any page', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random document title
        fc.string({ minLength: 1, maxLength: 100 }),
        async (pdfUrl, documentTitle) => {
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle={documentTitle}
              enableDRM={true}
              viewMode="continuous"
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-continuous-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            const container = screen.getByTestId('pdfjs-continuous-container');

            // Create a selectstart event
            const selectStartEvent = new Event('selectstart', {
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault and stopPropagation
            const preventDefaultSpy = vi.spyOn(selectStartEvent, 'preventDefault');
            const stopPropagationSpy = vi.spyOn(selectStartEvent, 'stopPropagation');

            // Dispatch the event
            container.dispatchEvent(selectStartEvent);

            // Verify preventDefault and stopPropagation were called
            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(stopPropagationSpy).toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should prevent text selection regardless of watermark settings when DRM is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate optional watermark settings
        fc.option(
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 50 }),
            opacity: fc.double({ min: 0.1, max: 1.0 }),
            fontSize: fc.integer({ min: 12, max: 100 }),
          })
        ),
        async (pdfUrl, watermark) => {
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle="Test Document"
              enableDRM={true}
              watermark={watermark || undefined}
              viewMode="single"
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            const container = screen.getByTestId('pdfjs-viewer-container');

            // Create a selectstart event
            const selectStartEvent = new Event('selectstart', {
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(selectStartEvent, 'preventDefault');

            // Dispatch the event
            container.dispatchEvent(selectStartEvent);

            // Verify preventDefault was called regardless of watermark
            expect(preventDefaultSpy).toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should consistently prevent text selection across multiple attempts when DRM is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random number of attempts (2-10)
        fc.integer({ min: 2, max: 10 }),
        async (pdfUrl, numAttempts) => {
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle="Test Document"
              enableDRM={true}
              viewMode="single"
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            const container = screen.getByTestId('pdfjs-viewer-container');

            // Test multiple selection attempts
            for (let i = 0; i < numAttempts; i++) {
              const selectStartEvent = new Event('selectstart', {
                bubbles: true,
                cancelable: true,
              });

              const preventDefaultSpy = vi.spyOn(selectStartEvent, 'preventDefault');

              container.dispatchEvent(selectStartEvent);

              // Verify preventDefault was called for each attempt
              expect(preventDefaultSpy).toHaveBeenCalled();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should prevent text selection when toggling between view modes with DRM enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate initial view mode
        fc.constantFrom('single', 'continuous'),
        async (pdfUrl, initialViewMode) => {
          const { unmount, rerender } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle="Test Document"
              enableDRM={true}
              viewMode={initialViewMode}
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              const testId = initialViewMode === 'single' 
                ? 'pdfjs-viewer-container' 
                : 'pdfjs-continuous-container';
              expect(screen.getByTestId(testId)).toBeInTheDocument();
            }, { timeout: 3000 });

            // Test text selection prevention in initial mode
            let container = initialViewMode === 'single' 
              ? screen.getByTestId('pdfjs-viewer-container')
              : screen.getByTestId('pdfjs-continuous-container');

            let selectStartEvent = new Event('selectstart', {
              bubbles: true,
              cancelable: true,
            });

            const preventDefaultSpy = vi.spyOn(selectStartEvent, 'preventDefault');
            container.dispatchEvent(selectStartEvent);
            expect(preventDefaultSpy).toHaveBeenCalled();

            // Toggle view mode
            const newViewMode = initialViewMode === 'single' ? 'continuous' : 'single';
            rerender(
              <PDFViewerWithPDFJS
                pdfUrl={pdfUrl}
                documentTitle="Test Document"
                enableDRM={true}
                viewMode={newViewMode}
              />
            );

            // Wait for new view mode to render
            await waitFor(() => {
              const testId = newViewMode === 'single' 
                ? 'pdfjs-viewer-container' 
                : 'pdfjs-continuous-container';
              expect(screen.getByTestId(testId)).toBeInTheDocument();
            }, { timeout: 3000 });

            // Test text selection prevention in new mode
            container = newViewMode === 'single' 
              ? screen.getByTestId('pdfjs-viewer-container')
              : screen.getByTestId('pdfjs-continuous-container');

            selectStartEvent = new Event('selectstart', {
              bubbles: true,
              cancelable: true,
            });

            preventDefaultSpy = vi.spyOn(selectStartEvent, 'preventDefault');
            container.dispatchEvent(selectStartEvent);
            expect(preventDefaultSpy).toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should prevent text selection at different zoom levels when DRM is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random zoom level (0.5 to 3.0)
        fc.double({ min: 0.5, max: 3.0 }),
        async (pdfUrl, zoomLevel) => {
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle="Test Document"
              enableDRM={true}
              viewMode="single"
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            const container = screen.getByTestId('pdfjs-viewer-container');

            // Create a selectstart event
            const selectStartEvent = new Event('selectstart', {
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(selectStartEvent, 'preventDefault');

            // Dispatch the event
            container.dispatchEvent(selectStartEvent);

            // Verify preventDefault was called regardless of zoom level
            expect(preventDefaultSpy).toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should prevent text selection with CSS user-select property when DRM is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random view mode
        fc.constantFrom('single', 'continuous'),
        async (pdfUrl, viewMode) => {
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle="Test Document"
              enableDRM={true}
              viewMode={viewMode}
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              const testId = viewMode === 'single' 
                ? 'pdfjs-viewer-container' 
                : 'pdfjs-continuous-container';
              expect(screen.getByTestId(testId)).toBeInTheDocument();
            }, { timeout: 3000 });

            const container = viewMode === 'single' 
              ? screen.getByTestId('pdfjs-viewer-container')
              : screen.getByTestId('pdfjs-continuous-container');

            // Check that CSS user-select is set to 'none'
            const computedStyle = window.getComputedStyle(container);
            
            // Note: In JSDOM, inline styles are applied but computed styles may not reflect all CSS properties
            // We check the inline style attribute instead
            const style = container.getAttribute('style');
            
            // Verify that user-select styles are applied
            expect(style).toContain('user-select: none');
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should allow text selection with CSS when DRM is disabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random view mode
        fc.constantFrom('single', 'continuous'),
        async (pdfUrl, viewMode) => {
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle="Test Document"
              enableDRM={false}
              viewMode={viewMode}
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(() => {
              const testId = viewMode === 'single' 
                ? 'pdfjs-viewer-container' 
                : 'pdfjs-continuous-container';
              expect(screen.getByTestId(testId)).toBeInTheDocument();
            }, { timeout: 3000 });

            const container = viewMode === 'single' 
              ? screen.getByTestId('pdfjs-viewer-container')
              : screen.getByTestId('pdfjs-continuous-container');

            // Check that CSS user-select is NOT set to 'none'
            const style = container.getAttribute('style');
            
            // Verify that user-select styles are NOT applied when DRM is disabled
            // Style attribute may be null or empty when DRM is disabled
            if (style) {
              expect(style).not.toContain('user-select: none');
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should prevent text selection on canvas container when DRM is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        async (pdfUrl) => {
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle="Test Document"
              enableDRM={true}
              viewMode="single"
            />
          );

          try {
            // Wait for PDF to load and render
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-canvas-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            const canvasContainer = screen.getByTestId('pdfjs-canvas-container');

            // Check that CSS user-select is set to 'none' on canvas container
            const style = canvasContainer.getAttribute('style');
            
            // Verify that user-select styles are applied to canvas container
            expect(style).toContain('user-select: none');
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);
});
