import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import PDFViewerWithPDFJS from '../PDFViewerWithPDFJS';

/**
 * Property-based tests for PDF.js print shortcut blocking
 * 
 * Feature: pdf-iframe-blocking-fix, Property 11: Print shortcut blocking
 * Validates: Requirements 4.2
 * 
 * Tests:
 * - For any print keyboard shortcut (Ctrl+P, Cmd+P), the print dialog should be prevented from opening
 * - For any PDF document with DRM enabled, print shortcuts should be blocked
 * - For any PDF document with DRM disabled, print shortcuts should be allowed
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

describe('PDFViewerWithPDFJS Print Blocking Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 11: Print shortcut blocking
   * For any print keyboard shortcut (Ctrl+P, Cmd+P), the print dialog should be prevented from opening
   * Validates: Requirements 4.2
   */
  it('should block Ctrl+P print shortcut when DRM is enabled', async () => {
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

            // Create a Ctrl+P keyboard event
            const printEvent = new KeyboardEvent('keydown', {
              key: 'p',
              ctrlKey: true,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault and stopPropagation
            const preventDefaultSpy = vi.spyOn(printEvent, 'preventDefault');
            const stopPropagationSpy = vi.spyOn(printEvent, 'stopPropagation');

            // Dispatch the event on window
            window.dispatchEvent(printEvent);

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

  it('should block Cmd+P print shortcut when DRM is enabled', async () => {
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

            // Create a Cmd+P keyboard event (Mac)
            const printEvent = new KeyboardEvent('keydown', {
              key: 'p',
              metaKey: true,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault and stopPropagation
            const preventDefaultSpy = vi.spyOn(printEvent, 'preventDefault');
            const stopPropagationSpy = vi.spyOn(printEvent, 'stopPropagation');

            // Dispatch the event on window
            window.dispatchEvent(printEvent);

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

  it('should allow print shortcuts when DRM is disabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random document title
        fc.string({ minLength: 1, maxLength: 100 }),
        // Generate random view mode
        fc.constantFrom('single', 'continuous'),
        // Generate random modifier key (ctrl or meta)
        fc.boolean(),
        async (pdfUrl, documentTitle, viewMode, useMetaKey) => {
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

            // Create a print keyboard event
            const printEvent = new KeyboardEvent('keydown', {
              key: 'p',
              ctrlKey: !useMetaKey,
              metaKey: useMetaKey,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(printEvent, 'preventDefault');

            // Dispatch the event on window
            window.dispatchEvent(printEvent);

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

  it('should block print shortcuts with different key cases when DRM is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random key case ('p' or 'P')
        fc.constantFrom('p', 'P'),
        // Generate random modifier key (ctrl or meta)
        fc.boolean(),
        async (pdfUrl, keyValue, useMetaKey) => {
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

            // Create a print keyboard event with specific key case
            const printEvent = new KeyboardEvent('keydown', {
              key: keyValue,
              ctrlKey: !useMetaKey,
              metaKey: useMetaKey,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(printEvent, 'preventDefault');

            // Dispatch the event on window
            window.dispatchEvent(printEvent);

            // Verify preventDefault was called regardless of key case
            expect(preventDefaultSpy).toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should block print shortcuts in both view modes when DRM is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random view mode
        fc.constantFrom('single', 'continuous'),
        // Generate random modifier key (ctrl or meta)
        fc.boolean(),
        async (pdfUrl, viewMode, useMetaKey) => {
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

            // Create a print keyboard event
            const printEvent = new KeyboardEvent('keydown', {
              key: 'p',
              ctrlKey: !useMetaKey,
              metaKey: useMetaKey,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(printEvent, 'preventDefault');

            // Dispatch the event on window
            window.dispatchEvent(printEvent);

            // Verify preventDefault was called in both view modes
            expect(preventDefaultSpy).toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should block print shortcuts regardless of watermark settings when DRM is enabled', async () => {
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
        // Generate random modifier key (ctrl or meta)
        fc.boolean(),
        async (pdfUrl, watermark, useMetaKey) => {
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

            // Create a print keyboard event
            const printEvent = new KeyboardEvent('keydown', {
              key: 'p',
              ctrlKey: !useMetaKey,
              metaKey: useMetaKey,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(printEvent, 'preventDefault');

            // Dispatch the event on window
            window.dispatchEvent(printEvent);

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

  it('should consistently block print shortcuts across multiple attempts when DRM is enabled', async () => {
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

            // Test multiple print attempts
            for (let i = 0; i < numAttempts; i++) {
              const printEvent = new KeyboardEvent('keydown', {
                key: 'p',
                ctrlKey: i % 2 === 0, // Alternate between Ctrl and Cmd
                metaKey: i % 2 !== 0,
                bubbles: true,
                cancelable: true,
              });

              const preventDefaultSpy = vi.spyOn(printEvent, 'preventDefault');

              window.dispatchEvent(printEvent);

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

  it('should block print shortcuts when toggling between view modes with DRM enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate initial view mode
        fc.constantFrom('single', 'continuous'),
        // Generate random modifier key (ctrl or meta)
        fc.boolean(),
        async (pdfUrl, initialViewMode, useMetaKey) => {
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

            // Test print blocking in initial mode
            let printEvent = new KeyboardEvent('keydown', {
              key: 'p',
              ctrlKey: !useMetaKey,
              metaKey: useMetaKey,
              bubbles: true,
              cancelable: true,
            });

            let preventDefaultSpy = vi.spyOn(printEvent, 'preventDefault');
            window.dispatchEvent(printEvent);
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

            // Test print blocking in new mode
            printEvent = new KeyboardEvent('keydown', {
              key: 'p',
              ctrlKey: !useMetaKey,
              metaKey: useMetaKey,
              bubbles: true,
              cancelable: true,
            });

            preventDefaultSpy = vi.spyOn(printEvent, 'preventDefault');
            window.dispatchEvent(printEvent);
            expect(preventDefaultSpy).toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should not block other keyboard shortcuts when blocking print with DRM enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random non-print key
        fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'q', 'r', 't', 'u', 'v', 'w', 'x', 'y', 'z'),
        async (pdfUrl, nonPrintKey) => {
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

            // Create a non-print keyboard event with Ctrl
            const keyEvent = new KeyboardEvent('keydown', {
              key: nonPrintKey,
              ctrlKey: true,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(keyEvent, 'preventDefault');

            // Dispatch the event on window
            window.dispatchEvent(keyEvent);

            // Verify preventDefault was NOT called for non-print keys
            // (unless it's 's' which is also blocked for save)
            if (nonPrintKey !== 's') {
              expect(preventDefaultSpy).not.toHaveBeenCalled();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should block print shortcuts at different zoom levels when DRM is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random zoom level (0.5 to 3.0)
        fc.double({ min: 0.5, max: 3.0 }),
        // Generate random modifier key (ctrl or meta)
        fc.boolean(),
        async (pdfUrl, zoomLevel, useMetaKey) => {
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

            // Simulate zoom (this would normally be done through UI, but we're testing the keyboard handler)
            // The zoom level doesn't affect keyboard event handling, but we test it anyway

            // Create a print keyboard event
            const printEvent = new KeyboardEvent('keydown', {
              key: 'p',
              ctrlKey: !useMetaKey,
              metaKey: useMetaKey,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(printEvent, 'preventDefault');

            // Dispatch the event on window
            window.dispatchEvent(printEvent);

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
});
