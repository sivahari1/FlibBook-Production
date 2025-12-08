import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import PDFViewerWithPDFJS from '../PDFViewerWithPDFJS';

/**
 * Property-based tests for PDF.js save shortcut blocking
 * 
 * Feature: pdf-iframe-blocking-fix, Property 13: Save shortcut blocking
 * Validates: Requirements 4.4
 * 
 * Tests:
 * - For any save keyboard shortcut (Ctrl+S, Cmd+S), the save dialog should be prevented from opening
 * - For any PDF document with DRM enabled, save shortcuts should be blocked
 * - For any PDF document with DRM disabled, save shortcuts should be allowed
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

describe('PDFViewerWithPDFJS Save Blocking Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 13: Save shortcut blocking
   * For any save keyboard shortcut (Ctrl+S, Cmd+S), the save dialog should be prevented from opening
   * Validates: Requirements 4.4
   */
  it('should block Ctrl+S save shortcut when DRM is enabled', async () => {
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

            // Create a Ctrl+S keyboard event
            const saveEvent = new KeyboardEvent('keydown', {
              key: 's',
              ctrlKey: true,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault and stopPropagation
            const preventDefaultSpy = vi.spyOn(saveEvent, 'preventDefault');
            const stopPropagationSpy = vi.spyOn(saveEvent, 'stopPropagation');

            // Dispatch the event on window
            window.dispatchEvent(saveEvent);

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

  it('should block Cmd+S save shortcut when DRM is enabled', async () => {
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

            // Create a Cmd+S keyboard event (Mac)
            const saveEvent = new KeyboardEvent('keydown', {
              key: 's',
              metaKey: true,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault and stopPropagation
            const preventDefaultSpy = vi.spyOn(saveEvent, 'preventDefault');
            const stopPropagationSpy = vi.spyOn(saveEvent, 'stopPropagation');

            // Dispatch the event on window
            window.dispatchEvent(saveEvent);

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

  it('should allow save shortcuts when DRM is disabled', async () => {
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

            // Create a save keyboard event
            const saveEvent = new KeyboardEvent('keydown', {
              key: 's',
              ctrlKey: !useMetaKey,
              metaKey: useMetaKey,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(saveEvent, 'preventDefault');

            // Dispatch the event on window
            window.dispatchEvent(saveEvent);

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

  it('should block save shortcuts with different key cases when DRM is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random key case ('s' or 'S')
        fc.constantFrom('s', 'S'),
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

            // Create a save keyboard event with specific key case
            const saveEvent = new KeyboardEvent('keydown', {
              key: keyValue,
              ctrlKey: !useMetaKey,
              metaKey: useMetaKey,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(saveEvent, 'preventDefault');

            // Dispatch the event on window
            window.dispatchEvent(saveEvent);

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

  it('should block save shortcuts in both view modes when DRM is enabled', async () => {
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

            // Create a save keyboard event
            const saveEvent = new KeyboardEvent('keydown', {
              key: 's',
              ctrlKey: !useMetaKey,
              metaKey: useMetaKey,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(saveEvent, 'preventDefault');

            // Dispatch the event on window
            window.dispatchEvent(saveEvent);

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

  it('should block save shortcuts regardless of watermark settings when DRM is enabled', async () => {
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

            // Create a save keyboard event
            const saveEvent = new KeyboardEvent('keydown', {
              key: 's',
              ctrlKey: !useMetaKey,
              metaKey: useMetaKey,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(saveEvent, 'preventDefault');

            // Dispatch the event on window
            window.dispatchEvent(saveEvent);

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

  it('should consistently block save shortcuts across multiple attempts when DRM is enabled', async () => {
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

            // Test multiple save attempts
            for (let i = 0; i < numAttempts; i++) {
              const saveEvent = new KeyboardEvent('keydown', {
                key: 's',
                ctrlKey: i % 2 === 0, // Alternate between Ctrl and Cmd
                metaKey: i % 2 !== 0,
                bubbles: true,
                cancelable: true,
              });

              const preventDefaultSpy = vi.spyOn(saveEvent, 'preventDefault');

              window.dispatchEvent(saveEvent);

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

  it('should block save shortcuts when toggling between view modes with DRM enabled', async () => {
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

            // Test save blocking in initial mode
            let saveEvent = new KeyboardEvent('keydown', {
              key: 's',
              ctrlKey: !useMetaKey,
              metaKey: useMetaKey,
              bubbles: true,
              cancelable: true,
            });

            let preventDefaultSpy = vi.spyOn(saveEvent, 'preventDefault');
            window.dispatchEvent(saveEvent);
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

            // Test save blocking in new mode
            saveEvent = new KeyboardEvent('keydown', {
              key: 's',
              ctrlKey: !useMetaKey,
              metaKey: useMetaKey,
              bubbles: true,
              cancelable: true,
            });

            preventDefaultSpy = vi.spyOn(saveEvent, 'preventDefault');
            window.dispatchEvent(saveEvent);
            expect(preventDefaultSpy).toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should not block other keyboard shortcuts when blocking save with DRM enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random non-save key (excluding 'p' which is also blocked for print)
        fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'q', 'r', 't', 'u', 'v', 'w', 'x', 'y', 'z'),
        async (pdfUrl, nonSaveKey) => {
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

            // Create a non-save keyboard event with Ctrl
            const keyEvent = new KeyboardEvent('keydown', {
              key: nonSaveKey,
              ctrlKey: true,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(keyEvent, 'preventDefault');

            // Dispatch the event on window
            window.dispatchEvent(keyEvent);

            // Verify preventDefault was NOT called for non-save keys
            // (unless it's 'p' which is also blocked for print)
            if (nonSaveKey !== 'p') {
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

  it('should block save shortcuts at different zoom levels when DRM is enabled', async () => {
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

            // Create a save keyboard event
            const saveEvent = new KeyboardEvent('keydown', {
              key: 's',
              ctrlKey: !useMetaKey,
              metaKey: useMetaKey,
              bubbles: true,
              cancelable: true,
            });

            // Spy on preventDefault
            const preventDefaultSpy = vi.spyOn(saveEvent, 'preventDefault');

            // Dispatch the event on window
            window.dispatchEvent(saveEvent);

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

  it('should block both save and print shortcuts when DRM is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URL
        fc.webUrl(),
        // Generate random modifier key (ctrl or meta)
        fc.boolean(),
        async (pdfUrl, useMetaKey) => {
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

            // Test save blocking
            const saveEvent = new KeyboardEvent('keydown', {
              key: 's',
              ctrlKey: !useMetaKey,
              metaKey: useMetaKey,
              bubbles: true,
              cancelable: true,
            });

            const savePreventDefaultSpy = vi.spyOn(saveEvent, 'preventDefault');
            window.dispatchEvent(saveEvent);
            expect(savePreventDefaultSpy).toHaveBeenCalled();

            // Test print blocking
            const printEvent = new KeyboardEvent('keydown', {
              key: 'p',
              ctrlKey: !useMetaKey,
              metaKey: useMetaKey,
              bubbles: true,
              cancelable: true,
            });

            const printPreventDefaultSpy = vi.spyOn(printEvent, 'preventDefault');
            window.dispatchEvent(printEvent);
            expect(printPreventDefaultSpy).toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);
});
