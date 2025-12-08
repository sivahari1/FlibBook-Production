import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import PDFViewerWithPDFJS from '../PDFViewerWithPDFJS';

/**
 * Property-based tests for PDF.js context menu prevention
 * 
 * Feature: pdf-iframe-blocking-fix, Property 10: Context menu prevention
 * Validates: Requirements 4.1
 * 
 * Tests:
 * - For any right-click event on PDF.js rendered content, the context menu should be prevented from appearing
 * - For any PDF document with DRM enabled, context menu events should be blocked
 * - For any PDF document with DRM disabled, context menu events should be allowed
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

describe('PDFViewerWithPDFJS Context Menu Prevention Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 10: Context menu prevention
   * For any right-click event on PDF.js rendered content, the context menu should be prevented from appearing
   * Validates: Requirements 4.1
   */
  it('should prevent context menu for any right-click event when DRM is enabled', async () => {
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

            // Create a contextmenu event
            const contextMenuEvent = new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');
            const stopPropagationSpy = vi.spyOn(contextMenuEvent, 'stopPropagation');

            // Dispatch the event
            container.dispatchEvent(contextMenuEvent);

            // Verify preventDefault was called
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

  it('should allow context menu for any right-click event when DRM is disabled', async () => {
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

            // Create a contextmenu event
            const contextMenuEvent = new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');

            // Dispatch the event
            container.dispatchEvent(contextMenuEvent);

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

  it('should prevent context menu on document level when DRM is enabled', async () => {
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

            // Create a contextmenu event on document
            const contextMenuEvent = new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');
            const stopPropagationSpy = vi.spyOn(contextMenuEvent, 'stopPropagation');

            // Dispatch the event on document
            document.dispatchEvent(contextMenuEvent);

            // Verify preventDefault was called (document-level listener)
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

  it('should prevent context menu at different mouse positions when DRM is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random mouse coordinates
        fc.integer({ min: 0, max: 1920 }), // clientX
        fc.integer({ min: 0, max: 1080 }), // clientY
        async (pdfUrl, clientX, clientY) => {
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

            // Create a contextmenu event with specific coordinates
            const contextMenuEvent = new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              clientX,
              clientY,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');

            // Dispatch the event
            container.dispatchEvent(contextMenuEvent);

            // Verify preventDefault was called regardless of position
            expect(preventDefaultSpy).toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should prevent context menu with different mouse buttons when DRM is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random mouse button (0=left, 1=middle, 2=right)
        fc.integer({ min: 0, max: 2 }),
        async (pdfUrl, button) => {
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

            // Create a contextmenu event with specific button
            const contextMenuEvent = new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              button,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');

            // Dispatch the event
            container.dispatchEvent(contextMenuEvent);

            // Verify preventDefault was called regardless of button
            expect(preventDefaultSpy).toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should prevent context menu in continuous scroll mode for any page', async () => {
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

            // Create a contextmenu event
            const contextMenuEvent = new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');
            const stopPropagationSpy = vi.spyOn(contextMenuEvent, 'stopPropagation');

            // Dispatch the event
            container.dispatchEvent(contextMenuEvent);

            // Verify preventDefault was called
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

  it('should prevent context menu regardless of watermark settings when DRM is enabled', async () => {
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

            // Create a contextmenu event
            const contextMenuEvent = new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');

            // Dispatch the event
            container.dispatchEvent(contextMenuEvent);

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

  it('should consistently prevent context menu across multiple events when DRM is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random number of events to test (2-10)
        fc.integer({ min: 2, max: 10 }),
        async (pdfUrl, numEvents) => {
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

            // Test multiple context menu events
            for (let i = 0; i < numEvents; i++) {
              const contextMenuEvent = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
              });

              const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');

              container.dispatchEvent(contextMenuEvent);

              // Verify preventDefault was called for each event
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

  it('should prevent context menu when toggling between view modes with DRM enabled', async () => {
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

            // Test context menu prevention in initial mode
            let container = initialViewMode === 'single' 
              ? screen.getByTestId('pdfjs-viewer-container')
              : screen.getByTestId('pdfjs-continuous-container');

            let contextMenuEvent = new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
            });

            let preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');
            container.dispatchEvent(contextMenuEvent);
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

            // Test context menu prevention in new mode
            container = newViewMode === 'single' 
              ? screen.getByTestId('pdfjs-viewer-container')
              : screen.getByTestId('pdfjs-continuous-container');

            contextMenuEvent = new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
            });

            preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');
            container.dispatchEvent(contextMenuEvent);
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
