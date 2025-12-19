/**
 * PDFViewerWithPDFJS Effect Execution Stability Property Tests
 * 
 * **Feature: pdf-viewer-infinite-loop-fix, Property 1: Effect Execution Stability**
 * **Validates: Requirements 1.1, 1.2, 2.4**
 * 
 * Tests that useEffect hooks execute exactly once per URL change and don't
 * re-execute due to dependency changes during the same URL session.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import PDFViewerWithPDFJS from '../PDFViewerWithPDFJS';

// Helper to create watermark generator
const watermarkGenerator = () => fc.record({
  text: fc.string({ minLength: 1, maxLength: 50 }),
  opacity: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
  fontSize: fc.integer({ min: 8, max: 24 }),
});

// Mock PDF.js and related modules
vi.mock('@/lib/pdfjs-config', () => ({
  initializePDFJS: vi.fn(),
  isPDFJSAvailable: vi.fn(() => true),
}));

vi.mock('@/lib/pdfjs-integration', () => ({
  loadPDFDocument: vi.fn(),
  cleanupCanvas: vi.fn(),
  destroyPDFDocument: vi.fn(),
  PDFDocumentLoaderError: class PDFDocumentLoaderError extends Error {
    constructor(message: string, public code: string) {
      super(message);
    }
  },
  PDFPageRendererError: class PDFPageRendererError extends Error {
    constructor(message: string, public code: string) {
      super(message);
    }
  },
}));

vi.mock('@/lib/pdfjs-memory', () => ({
  createMemoryManager: vi.fn(() => ({
    setPDFDocument: vi.fn(),
    addRenderedPage: vi.fn(),
    addPageObject: vi.fn(),
    prioritizePages: vi.fn(() => [1, 2, 3]),
    removeNonPriorityPages: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('@/lib/pdfjs-render-pipeline', () => ({
  getGlobalRenderPipeline: vi.fn(() => ({
    queueRender: vi.fn((page, pageNum, canvas, zoom, priority, callback) => {
      // Simulate successful render
      setTimeout(() => callback(null), 10);
    }),
  })),
}));

vi.mock('@/lib/pdf-reliability/reliable-pdf-renderer', () => ({
  ReliablePDFRenderer: class MockReliablePDFRenderer {
    renderPDF = vi.fn().mockResolvedValue({
      success: true,
      renderingId: 'test-rendering-id',
      pages: [{ pageNumber: 1 }, { pageNumber: 2 }],
    });
    onProgressUpdate = vi.fn();
    cancelRendering = vi.fn();
    forceRetry = vi.fn();
  },
}));

// Mock child components
vi.mock('../WatermarkOverlay', () => ({
  default: ({ text }: { text: string }) => <div data-testid="watermark">{text}</div>,
}));

vi.mock('../LoadingSpinner', () => ({
  default: ({ message }: { message: string }) => <div data-testid="loading">{message}</div>,
}));

vi.mock('../ViewerError', () => ({
  default: ({ error }: { error: string }) => <div data-testid="error">{error}</div>,
}));

vi.mock('../SimplePDFViewer', () => ({
  default: ({ pdfUrl }: { pdfUrl: string }) => <div data-testid="simple-viewer">{pdfUrl}</div>,
}));

describe('PDFViewerWithPDFJS Effect Execution Stability Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property 1: Effect Execution Stability
   * 
   * For any PDF URL provided to the component, the document loading effect 
   * should execute exactly once per URL change and not re-execute due to 
   * dependency changes during the same URL session.
   */
  it('should execute document loading effect exactly once per URL change', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data
        fc.record({
          pdfUrl: fc.webUrl({ validSchemes: ['https'] }),
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          watermark: fc.option(watermarkGenerator()),
          enableDRM: fc.boolean(),
          viewMode: fc.constantFrom('single', 'continuous'),
        }),
        async (testData) => {
          // Mock successful PDF loading
          const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
          const mockLoadPDFDocument = loadPDFDocument as any;
          mockLoadPDFDocument.mockResolvedValue({
            document: {
              numPages: 3,
              getPage: vi.fn().mockResolvedValue({
                getViewport: vi.fn(() => ({ width: 600, height: 800 })),
              }),
            },
            numPages: 3,
          });

          // Render component with initial props
          const { rerender } = render(
            <PDFViewerWithPDFJS
              pdfUrl={testData.pdfUrl}
              documentTitle={testData.documentTitle}
              watermark={testData.watermark}
              enableDRM={testData.enableDRM}
              viewMode={testData.viewMode as 'single' | 'continuous'}
            />
          );

          // Wait for initial render and effects
          await waitFor(() => {
            expect(screen.getByTestId('loading')).toBeInTheDocument();
          }, { timeout: 1000 });

          // Clear the mock call count after initial load
          mockLoadPDFDocument.mockClear();

          // Re-render with same URL but different non-URL props
          await act(async () => {
            rerender(
              <PDFViewerWithPDFJS
                pdfUrl={testData.pdfUrl} // Same URL
                documentTitle={testData.documentTitle + ' Updated'} // Different title
                watermark={testData.watermark ? {
                  ...testData.watermark,
                  opacity: Math.min(Math.fround(1.0), testData.watermark.opacity + Math.fround(0.1)), // Different watermark
                } : undefined}
                enableDRM={!testData.enableDRM} // Different DRM setting
                viewMode={testData.viewMode as 'single' | 'continuous'}
              />
            );
          });

          // Wait a bit for any potential re-executions
          await new Promise(resolve => setTimeout(resolve, 100));

          // Verify that loadPDFDocument was not called again
          // since the URL didn't change
          expect(mockLoadPDFDocument).toHaveBeenCalledTimes(0);
        }
      ),
      { 
        numRuns: 10, // Reduce iterations for faster testing during development
        timeout: 10000, // 10 second timeout
      }
    );
  });

  /**
   * Property: Effect Dependency Stability
   * 
   * For any sequence of prop changes that don't affect the PDF URL,
   * the main document loading effect should not re-execute.
   */
  it('should not re-execute document loading effect for non-URL prop changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial props and a sequence of prop changes
        fc.record({
          initialProps: fc.record({
            pdfUrl: fc.webUrl({ validSchemes: ['https'] }),
            documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
            watermark: fc.option(watermarkGenerator()),
            enableDRM: fc.boolean(),
            viewMode: fc.constantFrom('single', 'continuous'),
          }),
          propChanges: fc.array(
            fc.record({
              documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
              watermark: fc.option(watermarkGenerator()),
              enableDRM: fc.boolean(),
              viewMode: fc.constantFrom('single', 'continuous'),
            }),
            { minLength: 1, maxLength: 2 } // Reduced complexity
          ),
        }),
        async (testData) => {
          // Mock successful PDF loading
          const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
          const mockLoadPDFDocument = loadPDFDocument as any;
          mockLoadPDFDocument.mockClear();
          mockLoadPDFDocument.mockResolvedValue({
            document: {
              numPages: 2,
              getPage: vi.fn().mockResolvedValue({
                getViewport: vi.fn(() => ({ width: 600, height: 800 })),
              }),
            },
            numPages: 2,
          });

          // Render component with initial props
          const { rerender } = render(
            <PDFViewerWithPDFJS
              pdfUrl={testData.initialProps.pdfUrl}
              documentTitle={testData.initialProps.documentTitle}
              watermark={testData.initialProps.watermark}
              enableDRM={testData.initialProps.enableDRM}
              viewMode={testData.initialProps.viewMode as 'single' | 'continuous'}
            />
          );

          // Wait for initial load
          await waitFor(() => {
            expect(mockLoadPDFDocument).toHaveBeenCalledTimes(1);
          }, { timeout: 1000 });

          // Apply each prop change (keeping URL the same)
          for (const change of testData.propChanges) {
            await act(async () => {
              rerender(
                <PDFViewerWithPDFJS
                  pdfUrl={testData.initialProps.pdfUrl} // Keep URL the same
                  documentTitle={change.documentTitle}
                  watermark={change.watermark}
                  enableDRM={change.enableDRM}
                  viewMode={change.viewMode as 'single' | 'continuous'}
                />
              );
            });

            // Wait a bit for any potential re-executions
            await new Promise(resolve => setTimeout(resolve, 20)); // Reduced wait time
          }

          // Document loading should still have been called only once
          expect(mockLoadPDFDocument).toHaveBeenCalledTimes(1);
        }
      ),
      { 
        numRuns: 5, // Reduced iterations
        timeout: 8000, // Reduced timeout
      }
    );
  }, 10000); // Add test timeout

  /**
   * Property: URL Change Effect Re-execution
   * 
   * For any URL change, the document loading effect should execute exactly once
   * for the new URL.
   */
  it('should re-execute document loading effect exactly once when URL changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two different URLs and other props
        fc.record({
          firstUrl: fc.webUrl({ validSchemes: ['https'] }),
          secondUrl: fc.webUrl({ validSchemes: ['https'] }),
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          watermark: fc.option(watermarkGenerator()),
          enableDRM: fc.boolean(),
          viewMode: fc.constantFrom('single', 'continuous'),
        }).filter(data => data.firstUrl !== data.secondUrl), // Ensure URLs are different
        async (testData) => {
          // Mock successful PDF loading
          const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
          const mockLoadPDFDocument = loadPDFDocument as any;
          mockLoadPDFDocument.mockClear();
          mockLoadPDFDocument.mockResolvedValue({
            document: {
              numPages: 2,
              getPage: vi.fn().mockResolvedValue({
                getViewport: vi.fn(() => ({ width: 600, height: 800 })),
              }),
            },
            numPages: 2,
          });

          // Render component with first URL
          const { rerender } = render(
            <PDFViewerWithPDFJS
              pdfUrl={testData.firstUrl}
              documentTitle={testData.documentTitle}
              watermark={testData.watermark}
              enableDRM={testData.enableDRM}
              viewMode={testData.viewMode as 'single' | 'continuous'}
            />
          );

          // Wait for first load
          await waitFor(() => {
            expect(mockLoadPDFDocument).toHaveBeenCalledTimes(1);
          }, { timeout: 1000 });

          // Change to second URL
          await act(async () => {
            rerender(
              <PDFViewerWithPDFJS
                pdfUrl={testData.secondUrl}
                documentTitle={testData.documentTitle}
                watermark={testData.watermark}
                enableDRM={testData.enableDRM}
                viewMode={testData.viewMode as 'single' | 'continuous'}
              />
            );
          });

          // Wait for second load
          await waitFor(() => {
            expect(mockLoadPDFDocument).toHaveBeenCalledTimes(2);
          }, { timeout: 1000 });

          // Verify both URLs were loaded
          expect(mockLoadPDFDocument).toHaveBeenNthCalledWith(1, expect.objectContaining({
            source: testData.firstUrl,
          }));
          expect(mockLoadPDFDocument).toHaveBeenNthCalledWith(2, expect.objectContaining({
            source: testData.secondUrl,
          }));
        }
      ),
      { 
        numRuns: 5, // Reduced iterations
        timeout: 8000, // Reduced timeout
      }
    );
  }, 10000); // Add test timeout

  /**
   * Property: Callback Stability
   * 
   * For any sequence of callback prop changes, the document loading effect
   * should not re-execute if the URL remains the same.
   */
  it('should not re-execute document loading effect when callback props change', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          pdfUrl: fc.webUrl({ validSchemes: ['https'] }),
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          callbackChanges: fc.integer({ min: 1, max: 2 }), // Reduced complexity
        }),
        async (testData) => {
          // Mock successful PDF loading
          const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
          const mockLoadPDFDocument = loadPDFDocument as any;
          mockLoadPDFDocument.mockClear();
          mockLoadPDFDocument.mockResolvedValue({
            document: {
              numPages: 2,
              getPage: vi.fn().mockResolvedValue({
                getViewport: vi.fn(() => ({ width: 600, height: 800 })),
              }),
            },
            numPages: 2,
          });

          // Create initial callbacks
          let onPageChange = vi.fn();
          let onLoadComplete = vi.fn();
          let onError = vi.fn();

          // Render component with initial callbacks
          const { rerender } = render(
            <PDFViewerWithPDFJS
              pdfUrl={testData.pdfUrl}
              documentTitle={testData.documentTitle}
              onPageChange={onPageChange}
              onLoadComplete={onLoadComplete}
              onError={onError}
            />
          );

          // Wait for initial load
          await waitFor(() => {
            expect(mockLoadPDFDocument).toHaveBeenCalledTimes(1);
          }, { timeout: 1000 });

          // Change callbacks multiple times
          for (let i = 0; i < testData.callbackChanges; i++) {
            // Create new callback functions
            onPageChange = vi.fn();
            onLoadComplete = vi.fn();
            onError = vi.fn();

            await act(async () => {
              rerender(
                <PDFViewerWithPDFJS
                  pdfUrl={testData.pdfUrl} // Keep URL the same
                  documentTitle={testData.documentTitle}
                  onPageChange={onPageChange}
                  onLoadComplete={onLoadComplete}
                  onError={onError}
                />
              );
            });

            // Wait a bit for any potential re-executions
            await new Promise(resolve => setTimeout(resolve, 20)); // Reduced wait time
          }

          // Document loading should still have been called only once
          expect(mockLoadPDFDocument).toHaveBeenCalledTimes(1);
        }
      ),
      { 
        numRuns: 5, // Reduced iterations
        timeout: 8000, // Reduced timeout
      }
    );
  }, 10000); // Add test timeout
});