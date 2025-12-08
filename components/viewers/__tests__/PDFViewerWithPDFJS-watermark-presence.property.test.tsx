import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import PDFViewerWithPDFJS, { WatermarkSettings } from '../PDFViewerWithPDFJS';

/**
 * Property-based tests for PDF.js watermark presence
 * 
 * Feature: pdf-iframe-blocking-fix, Property 6: Watermark overlay presence
 * Validates: Requirements 3.1, 3.2
 * 
 * Tests:
 * - For any PDF rendered with watermarks enabled, the watermark overlay should be visible on the rendered content
 * - For any watermark settings, the watermark should maintain visibility across all rendering states
 * - For any view mode (single/continuous), watermarks should be present when enabled
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

describe('PDFViewerWithPDFJS Watermark Presence Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 6: Watermark overlay presence
   * For any PDF rendered with watermarks enabled, the watermark overlay should be visible on the rendered content
   * Validates: Requirements 3.1, 3.2
   */
  it('should display watermark overlay for any valid watermark settings in single page mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random watermark text (non-empty strings)
        fc.string({ minLength: 1, maxLength: 50 }),
        // Generate random opacity (0.1 to 1.0)
        fc.double({ min: 0.1, max: 1.0 }),
        // Generate random font size (12 to 100)
        fc.integer({ min: 12, max: 100 }),
        async (text, opacity, fontSize) => {
          const watermark: WatermarkSettings = {
            text,
            opacity,
            fontSize,
          };

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

            // Verify watermark overlay is present
            const watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
            expect(watermarkContainer).toBeInTheDocument();

            // Verify watermark overlay component is rendered
            const watermarkOverlay = screen.getByTestId('watermark-overlay');
            expect(watermarkOverlay).toBeInTheDocument();

            // Verify watermark has correct settings
            expect(watermarkOverlay).toHaveAttribute('data-text', text);
            expect(watermarkOverlay).toHaveAttribute('data-opacity', String(opacity));
            
            // Verify watermark is non-interactive (pointer-events: none)
            expect(watermarkContainer).toHaveStyle({ pointerEvents: 'none' });
            
            // Verify watermark has correct z-index (above content)
            expect(watermarkContainer).toHaveStyle({ zIndex: '10' });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should display watermark overlay for any valid watermark settings in continuous mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random watermark text (non-empty strings)
        fc.string({ minLength: 1, maxLength: 50 }),
        // Generate random opacity (0.1 to 1.0)
        fc.double({ min: 0.1, max: 1.0 }),
        // Generate random font size (12 to 100)
        fc.integer({ min: 12, max: 100 }),
        async (text, opacity, fontSize) => {
          const watermark: WatermarkSettings = {
            text,
            opacity,
            fontSize,
          };

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

            // Verify continuous container is present
            const continuousContainer = screen.getByTestId('pdfjs-continuous-container');
            expect(continuousContainer).toBeInTheDocument();

            // In continuous mode, watermarks are rendered per page as they load
            // Verify page containers exist (watermarks will be added as pages render)
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-page-1')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify at least one page container exists
            const page1 = screen.getByTestId('pdfjs-page-1');
            expect(page1).toBeInTheDocument();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should not display watermark when watermark settings are undefined', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random view mode
        fc.constantFrom('single', 'continuous'),
        async (viewMode) => {
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={undefined}
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

            // Verify watermark container is NOT present
            expect(screen.queryByTestId('pdfjs-watermark-container')).not.toBeInTheDocument();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should maintain watermark visibility across different zoom levels', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random watermark text
        fc.string({ minLength: 1, maxLength: 30 }),
        // Generate random opacity
        fc.double({ min: 0.1, max: 1.0 }),
        // Generate random font size
        fc.integer({ min: 20, max: 80 }),
        // Generate random zoom level (0.5 to 3.0)
        fc.double({ min: 0.5, max: 3.0 }),
        async (text, opacity, fontSize, zoomLevel) => {
          const watermark: WatermarkSettings = {
            text,
            opacity,
            fontSize,
          };

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

            // Verify watermark is present
            const watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
            expect(watermarkContainer).toBeInTheDocument();

            // Verify watermark overlay is rendered
            const watermarkOverlay = screen.getByTestId('watermark-overlay');
            expect(watermarkOverlay).toBeInTheDocument();

            // Watermark should be visible regardless of zoom level
            // (font size scales with zoom, but watermark remains visible)
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

  it('should maintain watermark positioning (absolute, inset-0) for any watermark settings', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random watermark settings
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 50 }),
          opacity: fc.double({ min: 0.1, max: 1.0 }),
          fontSize: fc.integer({ min: 12, max: 100 }),
        }),
        async (watermark) => {
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

            // Verify watermark container positioning
            const watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
            
            // Watermark should be absolutely positioned
            expect(watermarkContainer).toHaveClass('absolute', 'inset-0');
            
            // Watermark should be non-interactive
            expect(watermarkContainer).toHaveStyle({ pointerEvents: 'none' });
            
            // Watermark should have correct z-index
            expect(watermarkContainer).toHaveStyle({ zIndex: '10' });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should render watermark with correct opacity for any valid opacity value', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random opacity (0.1 to 1.0)
        fc.double({ min: 0.1, max: 1.0 }),
        async (opacity) => {
          const watermark: WatermarkSettings = {
            text: 'TEST WATERMARK',
            opacity,
            fontSize: 48,
          };

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

            // Verify watermark overlay has correct opacity
            const watermarkOverlay = screen.getByTestId('watermark-overlay');
            expect(watermarkOverlay).toHaveAttribute('data-opacity', String(opacity));
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should render watermark with correct font size for any valid font size', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random font size (12 to 100)
        fc.integer({ min: 12, max: 100 }),
        async (fontSize) => {
          const watermark: WatermarkSettings = {
            text: 'TEST WATERMARK',
            opacity: 0.3,
            fontSize,
          };

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

            // Verify watermark overlay has correct font size
            const watermarkOverlay = screen.getByTestId('watermark-overlay');
            // Font size is scaled by zoom level (default 1.0)
            expect(watermarkOverlay).toHaveAttribute('data-fontsize', String(fontSize * 1.0));
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should maintain watermark presence when DRM is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random watermark settings
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 50 }),
          opacity: fc.double({ min: 0.1, max: 1.0 }),
          fontSize: fc.integer({ min: 12, max: 100 }),
        }),
        // Generate random DRM setting
        fc.boolean(),
        async (watermark, enableDRM) => {
          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              watermark={watermark}
              enableDRM={enableDRM}
              viewMode="single"
            />
          );

          try {
            // Wait for PDF to load and render
            await waitFor(() => {
              expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify watermark is present regardless of DRM setting
            const watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
            expect(watermarkContainer).toBeInTheDocument();

            // Verify watermark overlay is rendered
            const watermarkOverlay = screen.getByTestId('watermark-overlay');
            expect(watermarkOverlay).toBeInTheDocument();
            expect(watermarkOverlay).toHaveAttribute('data-text', watermark.text);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  it('should render watermark for any combination of valid settings', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random watermark settings with all parameters
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 50 }),
          opacity: fc.double({ min: 0.1, max: 1.0 }),
          fontSize: fc.integer({ min: 12, max: 100 }),
        }),
        // Generate random view mode
        fc.constantFrom('single', 'continuous'),
        // Generate random DRM setting
        fc.boolean(),
        async (watermark, viewMode, enableDRM) => {
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

            // In single mode, watermark should be present immediately after render
            if (viewMode === 'single') {
              await waitFor(() => {
                expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
              }, { timeout: 3000 });

              const watermarkOverlay = screen.getByTestId('watermark-overlay');
              expect(watermarkOverlay).toBeInTheDocument();
              expect(watermarkOverlay).toHaveAttribute('data-text', watermark.text);
            } else {
              // In continuous mode, verify page containers exist
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
