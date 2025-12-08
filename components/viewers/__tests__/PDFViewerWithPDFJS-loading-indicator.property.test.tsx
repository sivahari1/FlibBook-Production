/**
 * Property-based tests for PDF loading indicator
 * 
 * Feature: pdf-iframe-blocking-fix, Property 19: Loading indicator display
 * Validates: Requirements 6.1
 * 
 * Tests:
 * - Loading indicator is visible during PDF loading
 * - Loading indicator shows progress percentage
 * - Loading indicator disappears when loading completes
 */

import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import PDFViewerWithPDFJS from '../PDFViewerWithPDFJS';

// Mock PDF.js modules
vi.mock('@/lib/pdfjs-config', () => ({
  initializePDFJS: vi.fn(),
  isPDFJSAvailable: vi.fn(() => true),
}));

vi.mock('@/lib/pdfjs-integration', () => ({
  loadPDFDocument: vi.fn(),
  renderPageToCanvas: vi.fn(),
  cleanupCanvas: vi.fn(),
  destroyPDFDocument: vi.fn(),
  PDFDocumentLoaderError: class PDFDocumentLoaderError extends Error {
    constructor(message: string, public code: string) {
      super(message);
      this.name = 'PDFDocumentLoaderError';
    }
  },
  PDFPageRendererError: class PDFPageRendererError extends Error {
    constructor(message: string, public code: string) {
      super(message);
      this.name = 'PDFPageRendererError';
    }
  },
}));

vi.mock('@/lib/pdfjs-memory', () => ({
  createMemoryManager: vi.fn(() => ({
    setPDFDocument: vi.fn(),
    addRenderedPage: vi.fn(),
    addPageObject: vi.fn(),
    prioritizePages: vi.fn(() => [1]),
    removeNonPriorityPages: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('@/lib/pdfjs-render-pipeline', () => ({
  getGlobalRenderPipeline: vi.fn(() => ({
    queueRender: vi.fn((page, pageNumber, canvas, scale, priority, callback) => {
      // Simulate successful render
      setTimeout(() => callback(null), 0);
    }),
  })),
}));

// Mock child components
vi.mock('../WatermarkOverlay', () => ({
  default: ({ text }: { text: string }) => <div data-testid="watermark">{text}</div>,
}));

vi.mock('../LoadingSpinner', () => ({
  default: ({ message }: { message?: string }) => (
    <div data-testid="loading-spinner">{message || 'Loading...'}</div>
  ),
}));

vi.mock('../ViewerError', () => ({
  default: ({ error, onRetry }: { error: string; onRetry: () => void }) => (
    <div data-testid="viewer-error">
      <p>{error}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

describe('PDFViewerWithPDFJS - Loading Indicator Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 19: Loading indicator display
   * For any PDF loading operation, a loading indicator should be visible until loading completes
   * Validates: Requirements 6.1
   */
  it('should display loading indicator for any PDF URL during loading', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs with different domains and paths
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random document titles
        fc.string({ minLength: 1, maxLength: 50 }),
        // Generate random number of pages
        fc.integer({ min: 1, max: 100 }),
        async (pdfUrl, documentTitle, numPages) => {
          
          // Mock loading that takes some time
          let resolveLoad: (value: any) => void;
          const loadPromise = new Promise((resolve) => {
            resolveLoad = resolve;
          });
          
          loadPDFDocument.mockImplementation(({ onProgress }: any) => {
            // Simulate progress updates
            if (onProgress) {
              setTimeout(() => onProgress({ loaded: 50, total: 100 }), 10);
              setTimeout(() => onProgress({ loaded: 100, total: 100 }), 20);
            }
            return loadPromise;
          });

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle={documentTitle}
            />
          );

          try {
            // Loading indicator should be visible immediately
            const loadingSpinner = await screen.findByTestId('loading-spinner');
            expect(loadingSpinner).toBeInTheDocument();
            
            // Loading message should contain "Loading PDF"
            expect(loadingSpinner.textContent).toMatch(/Loading PDF/i);

            // Resolve the loading
            const mockDocument = {
              numPages,
              getPage: vi.fn().mockResolvedValue({
                getViewport: vi.fn(() => ({ width: 800, height: 600 })),
                render: vi.fn(() => ({ promise: Promise.resolve() })),
              }),
              destroy: vi.fn(),
            };

            resolveLoad!({
              document: mockDocument,
              numPages,
              loadTime: 1000,
            });

            // Wait for loading to complete
            await waitFor(
              () => {
                expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
              },
              { timeout: 3000 }
            );
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  /**
   * Property 19: Loading indicator with progress
   * For any PDF loading operation, the loading indicator should show progress percentage
   * Validates: Requirements 6.1
   */
  it('should display progress percentage in loading indicator for any PDF', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random progress values (0-100)
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 5 }),
        async (pdfUrl, progressValues) => {
          
          let resolveLoad: (value: any) => void;
          const loadPromise = new Promise((resolve) => {
            resolveLoad = resolve;
          });
          
          loadPDFDocument.mockImplementation(({ onProgress }: any) => {
            // Simulate progress updates with the generated values
            if (onProgress) {
              progressValues.forEach((progress, index) => {
                setTimeout(() => {
                  onProgress({ loaded: progress, total: 100 });
                }, index * 10);
              });
            }
            return loadPromise;
          });

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle="Test Document"
            />
          );

          try {
            // Loading indicator should be visible
            const loadingSpinner = await screen.findByTestId('loading-spinner');
            expect(loadingSpinner).toBeInTheDocument();
            
            // Should show percentage
            await waitFor(() => {
              const text = loadingSpinner.textContent || '';
              expect(text).toMatch(/\d+%/);
            }, { timeout: 1000 });

            // Resolve the loading
            const mockDocument = {
              numPages: 10,
              getPage: vi.fn().mockResolvedValue({
                getViewport: vi.fn(() => ({ width: 800, height: 600 })),
                render: vi.fn(() => ({ promise: Promise.resolve() })),
              }),
              destroy: vi.fn(),
            };

            resolveLoad!({
              document: mockDocument,
              numPages: 10,
              loadTime: 1000,
            });

            // Wait for loading to complete
            await waitFor(
              () => {
                expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
              },
              { timeout: 3000 }
            );
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  /**
   * Property 19: Loading indicator disappears after completion
   * For any PDF that loads successfully, the loading indicator should disappear
   * Validates: Requirements 6.1
   */
  it('should hide loading indicator after any PDF loads successfully', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random document properties
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 50 }),
          numPages: fc.integer({ min: 1, max: 100 }),
          loadTime: fc.integer({ min: 100, max: 2000 }),
        }),
        async (pdfUrl, docProps) => {
          
          // Mock successful loading
          const mockDocument = {
            numPages: docProps.numPages,
            getPage: vi.fn().mockResolvedValue({
              getViewport: vi.fn(() => ({ width: 800, height: 600 })),
              render: vi.fn(() => ({ promise: Promise.resolve() })),
            }),
            destroy: vi.fn(),
          };

          loadPDFDocument.mockImplementation(({ onProgress }: any) => {
            // Simulate progress
            if (onProgress) {
              setTimeout(() => onProgress({ loaded: 50, total: 100 }), 10);
              setTimeout(() => onProgress({ loaded: 100, total: 100 }), 20);
            }
            
            return Promise.resolve({
              document: mockDocument,
              numPages: docProps.numPages,
              loadTime: docProps.loadTime,
            });
          });

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle={docProps.title}
            />
          );

          try {
            // Wait for either loading spinner or viewer container
            // (PDF might load very fast in tests)
            await waitFor(
              () => {
                const hasSpinner = screen.queryByTestId('loading-spinner');
                const hasViewer = screen.queryByTestId('pdfjs-viewer-container');
                expect(hasSpinner || hasViewer).toBeTruthy();
              },
              { timeout: 1000 }
            );

            // Wait for loading to complete - spinner should disappear
            await waitFor(
              () => {
                expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
              },
              { timeout: 5000 }
            );

            // Viewer container should be visible after loading
            expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  /**
   * Property 19: Loading indicator persists during entire loading operation
   * For any PDF loading operation, the loading indicator should remain visible throughout
   * Validates: Requirements 6.1
   */
  it('should keep loading indicator visible throughout the entire loading process', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random loading duration (100-1000ms)
        fc.integer({ min: 100, max: 1000 }),
        async (pdfUrl, loadingDuration) => {
          
          let resolveLoad: (value: any) => void;
          const loadPromise = new Promise((resolve) => {
            resolveLoad = resolve;
          });
          
          loadPDFDocument.mockImplementation(({ onProgress }: any) => {
            // Simulate progress updates during loading
            const progressInterval = loadingDuration / 10;
            for (let i = 1; i <= 10; i++) {
              setTimeout(() => {
                if (onProgress) {
                  onProgress({ loaded: i * 10, total: 100 });
                }
              }, i * progressInterval);
            }
            return loadPromise;
          });

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle="Test Document"
            />
          );

          try {
            // Loading indicator should be visible
            const loadingSpinner = await screen.findByTestId('loading-spinner');
            expect(loadingSpinner).toBeInTheDocument();

            // Wait for half the loading duration
            await new Promise(resolve => setTimeout(resolve, loadingDuration / 2));

            // Loading indicator should still be visible
            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

            // Resolve the loading
            const mockDocument = {
              numPages: 10,
              getPage: vi.fn().mockResolvedValue({
                getViewport: vi.fn(() => ({ width: 800, height: 600 })),
                render: vi.fn(() => ({ promise: Promise.resolve() })),
              }),
              destroy: vi.fn(),
            };

            resolveLoad!({
              document: mockDocument,
              numPages: 10,
              loadTime: loadingDuration,
            });

            // Wait for loading to complete
            await waitFor(
              () => {
                expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
              },
              { timeout: 5000 }
            );
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  /**
   * Property 19: Loading indicator for different document sizes
   * For any PDF with any number of pages, loading indicator should be displayed
   * Validates: Requirements 6.1
   */
  it('should display loading indicator for PDFs of any size', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random number of pages (1-1000)
        fc.integer({ min: 1, max: 1000 }),
        // Generate random file sizes (in bytes)
        fc.integer({ min: 1000, max: 100000000 }),
        async (pdfUrl, numPages, fileSize) => {
          
          let resolveLoad: (value: any) => void;
          const loadPromise = new Promise((resolve) => {
            resolveLoad = resolve;
          });
          
          loadPDFDocument.mockImplementation(({ onProgress }: any) => {
            // Simulate progress based on file size
            if (onProgress) {
              const chunks = 10;
              const chunkSize = fileSize / chunks;
              for (let i = 1; i <= chunks; i++) {
                setTimeout(() => {
                  onProgress({ loaded: i * chunkSize, total: fileSize });
                }, i * 10);
              }
            }
            return loadPromise;
          });

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle="Test Document"
            />
          );

          try {
            // Loading indicator should be visible
            const loadingSpinner = await screen.findByTestId('loading-spinner');
            expect(loadingSpinner).toBeInTheDocument();

            // Resolve the loading
            const mockDocument = {
              numPages,
              getPage: vi.fn().mockResolvedValue({
                getViewport: vi.fn(() => ({ width: 800, height: 600 })),
                render: vi.fn(() => ({ promise: Promise.resolve() })),
              }),
              destroy: vi.fn(),
            };

            resolveLoad!({
              document: mockDocument,
              numPages,
              loadTime: 1000,
            });

            // Wait for loading to complete
            await waitFor(
              () => {
                expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
              },
              { timeout: 5000 }
            );
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);
});
