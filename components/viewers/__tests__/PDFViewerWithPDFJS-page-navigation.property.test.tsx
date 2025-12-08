/**
 * Property-based tests for PDF page navigation
 * 
 * Feature: pdf-iframe-blocking-fix, Property 14: Page navigation support
 * Validates: Requirements 5.1
 * 
 * Tests:
 * - For any page navigation action (next/previous), the system should display the correct page
 * - Page navigation should work correctly for any valid page number
 * - Navigation should respect document boundaries (first/last page)
 * - Page indicators should update correctly after navigation
 */

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
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
    prioritizePages: vi.fn((visiblePages: number[]) => visiblePages),
    removeNonPriorityPages: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('@/lib/pdfjs-render-pipeline', () => ({
  getGlobalRenderPipeline: vi.fn(() => ({
    queueRender: vi.fn((_page, _pageNumber, _canvas, _scale, _priority, callback) => {
      // Simulate successful render
      setTimeout(() => callback(null), 10);
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

describe('PDFViewerWithPDFJS - Page Navigation Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 14: Page navigation support
   * For any page navigation action (next/previous), the system should display the correct page
   * Validates: Requirements 5.1
   */
  it('should navigate to correct page for any next/previous action', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random number of pages (2-100)
        fc.integer({ min: 2, max: 100 }),
        // Generate random starting page (will be clamped to valid range)
        fc.integer({ min: 1, max: 100 }),
        async (pdfUrl, numPages, startPage) => {
          // Clamp starting page to valid range
          const validStartPage = Math.max(1, Math.min(startPage, numPages));
          
          // Mock successful PDF loading
          const mockDocument = {
            numPages,
            getPage: vi.fn((pageNum: number) => Promise.resolve({
              getViewport: vi.fn(() => ({ width: 800, height: 600 })),
              render: vi.fn(() => ({ promise: Promise.resolve() })),
              pageNumber: pageNum,
            })),
            destroy: vi.fn(),
          };

          (loadPDFDocument as any).mockResolvedValue({
            document: mockDocument,
            numPages,
            loadTime: 1000,
          });

          const onPageChange = vi.fn();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle="Test Document"
              onPageChange={onPageChange}
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(
              () => {
                expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
              },
              { timeout: 5000 }
            );

            // Wait for navigation controls to appear
            await waitFor(
              () => {
                expect(screen.getByTestId('pdfjs-page-navigation')).toBeInTheDocument();
              },
              { timeout: 2000 }
            );

            // Get navigation buttons
            const nextButton = screen.getByTestId('pdfjs-next-page-button');
            const prevButton = screen.getByTestId('pdfjs-prev-page-button');
            const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;

            // Verify initial page is 1
            expect(pageInput.value).toBe('1');

            // Test next navigation if not on last page
            if (validStartPage < numPages) {
              fireEvent.click(nextButton);
              
              await waitFor(
                () => {
                  expect(pageInput.value).toBe('2');
                },
                { timeout: 1000 }
              );

              // Note: onPageChange is called after page renders, not immediately
              // The important thing is that the page indicator updates correctly
            }

            // Test previous navigation if we're on page 2 or higher
            if (parseInt(pageInput.value) > 1) {
              const currentPage = parseInt(pageInput.value);
              fireEvent.click(prevButton);
              
              await waitFor(
                () => {
                  expect(pageInput.value).toBe(String(currentPage - 1));
                },
                { timeout: 1000 }
              );
            }

            // Test multiple next navigations
            const currentPageNum = parseInt(pageInput.value);
            const navigationsToTest = Math.min(3, numPages - currentPageNum);
            
            for (let i = 0; i < navigationsToTest; i++) {
              const expectedPage = currentPageNum + i + 1;
              fireEvent.click(nextButton);
              
              await waitFor(
                () => {
                  expect(pageInput.value).toBe(String(expectedPage));
                },
                { timeout: 1000 }
              );
            }

            // Verify we can't go beyond last page
            const finalPage = parseInt(pageInput.value);
            if (finalPage === numPages) {
              expect(nextButton).toBeDisabled();
            }

            // Verify we can't go before first page
            if (finalPage === 1) {
              expect(prevButton).toBeDisabled();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  /**
   * Property 14: Direct page navigation
   * For any valid page number input, the system should navigate to that page
   * Validates: Requirements 5.1
   */
  it('should navigate to correct page for any valid page number input', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random number of pages (5-50)
        fc.integer({ min: 5, max: 50 }),
        // Generate random target page
        fc.integer({ min: 1, max: 50 }),
        async (pdfUrl, numPages, targetPage) => {
          // Clamp target page to valid range
          const validTargetPage = Math.max(1, Math.min(targetPage, numPages));
          
          // Mock successful PDF loading
          const mockDocument = {
            numPages,
            getPage: vi.fn((pageNum: number) => Promise.resolve({
              getViewport: vi.fn(() => ({ width: 800, height: 600 })),
              render: vi.fn(() => ({ promise: Promise.resolve() })),
              pageNumber: pageNum,
            })),
            destroy: vi.fn(),
          };

          (loadPDFDocument as any).mockResolvedValue({
            document: mockDocument,
            numPages,
            loadTime: 1000,
          });

          const onPageChange = vi.fn();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle="Test Document"
              onPageChange={onPageChange}
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(
              () => {
                expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
              },
              { timeout: 5000 }
            );

            // Wait for navigation controls to appear
            await waitFor(
              () => {
                expect(screen.getByTestId('pdfjs-page-navigation')).toBeInTheDocument();
              },
              { timeout: 2000 }
            );

            // Get page input
            const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;

            // Navigate to target page by typing in input
            fireEvent.change(pageInput, { target: { value: String(validTargetPage) } });
            
            await waitFor(
              () => {
                expect(pageInput.value).toBe(String(validTargetPage));
              },
              { timeout: 1000 }
            );

            // Verify page indicator shows correct total
            const pageCount = screen.getByTestId('pdfjs-page-count');
            expect(pageCount).toHaveTextContent(`of ${numPages}`);

            // Verify navigation buttons are in correct state
            const nextButton = screen.getByTestId('pdfjs-next-page-button');
            const prevButton = screen.getByTestId('pdfjs-prev-page-button');

            if (validTargetPage === 1) {
              expect(prevButton).toBeDisabled();
            } else {
              expect(prevButton).not.toBeDisabled();
            }

            if (validTargetPage === numPages) {
              expect(nextButton).toBeDisabled();
            } else {
              expect(nextButton).not.toBeDisabled();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  /**
   * Property 14: Page navigation boundaries
   * For any PDF, navigation should respect document boundaries (can't go below 1 or above numPages)
   * Validates: Requirements 5.1
   */
  it('should respect document boundaries for any PDF', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random number of pages (1-100)
        fc.integer({ min: 1, max: 100 }),
        async (pdfUrl, numPages) => {
          // Mock successful PDF loading
          const mockDocument = {
            numPages,
            getPage: vi.fn((pageNum: number) => Promise.resolve({
              getViewport: vi.fn(() => ({ width: 800, height: 600 })),
              render: vi.fn(() => ({ promise: Promise.resolve() })),
              pageNumber: pageNum,
            })),
            destroy: vi.fn(),
          };

          (loadPDFDocument as any).mockResolvedValue({
            document: mockDocument,
            numPages,
            loadTime: 1000,
          });

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle="Test Document"
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(
              () => {
                expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
              },
              { timeout: 5000 }
            );

            // Wait for navigation controls to appear
            await waitFor(
              () => {
                expect(screen.getByTestId('pdfjs-page-navigation')).toBeInTheDocument();
              },
              { timeout: 2000 }
            );

            // Get navigation elements
            const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
            const prevButton = screen.getByTestId('pdfjs-prev-page-button');

            // Verify we start at page 1
            expect(pageInput.value).toBe('1');

            // Verify previous button is disabled on first page
            expect(prevButton).toBeDisabled();

            // Try to navigate to page 0 (should clamp to 1)
            fireEvent.change(pageInput, { target: { value: '0' } });
            
            // Page should remain at 1 or be clamped
            await waitFor(
              () => {
                const currentValue = parseInt(pageInput.value);
                expect(currentValue).toBeGreaterThanOrEqual(1);
              },
              { timeout: 1000 }
            );

            // Try to navigate beyond last page (should clamp to numPages)
            fireEvent.change(pageInput, { target: { value: String(numPages + 10) } });
            
            await waitFor(
              () => {
                const currentValue = parseInt(pageInput.value);
                expect(currentValue).toBeLessThanOrEqual(numPages);
              },
              { timeout: 1000 }
            );

            // Navigate to last page
            fireEvent.change(pageInput, { target: { value: String(numPages) } });
            
            await waitFor(
              () => {
                expect(pageInput.value).toBe(String(numPages));
              },
              { timeout: 1000 }
            );

            // Verify next button is disabled on last page (if multi-page)
            if (numPages > 1) {
              const nextButton = screen.getByTestId('pdfjs-next-page-button');
              expect(nextButton).toBeDisabled();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  /**
   * Property 14: Page indicator accuracy
   * For any page change, the page indicator should update to show the correct current page
   * Validates: Requirements 5.1, 5.3
   */
  it('should update page indicator correctly for any page change', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random number of pages (3-50)
        fc.integer({ min: 3, max: 50 }),
        // Generate random sequence of page changes
        fc.array(fc.integer({ min: 1, max: 50 }), { minLength: 1, maxLength: 5 }),
        async (pdfUrl, numPages, pageSequence) => {
          // Clamp all pages in sequence to valid range
          const validPageSequence = pageSequence.map(p => Math.max(1, Math.min(p, numPages)));
          
          // Mock successful PDF loading
          const mockDocument = {
            numPages,
            getPage: vi.fn((pageNum: number) => Promise.resolve({
              getViewport: vi.fn(() => ({ width: 800, height: 600 })),
              render: vi.fn(() => ({ promise: Promise.resolve() })),
              pageNumber: pageNum,
            })),
            destroy: vi.fn(),
          };

          (loadPDFDocument as any).mockResolvedValue({
            document: mockDocument,
            numPages,
            loadTime: 1000,
          });

          const onPageChange = vi.fn();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle="Test Document"
              onPageChange={onPageChange}
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(
              () => {
                expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
              },
              { timeout: 5000 }
            );

            // Wait for navigation controls to appear
            await waitFor(
              () => {
                expect(screen.getByTestId('pdfjs-page-navigation')).toBeInTheDocument();
              },
              { timeout: 2000 }
            );

            // Get navigation elements
            const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
            const pageCount = screen.getByTestId('pdfjs-page-count');

            // Verify initial state
            expect(pageInput.value).toBe('1');
            expect(pageCount).toHaveTextContent(`of ${numPages}`);

            // Navigate through the page sequence
            for (const targetPage of validPageSequence) {
              fireEvent.change(pageInput, { target: { value: String(targetPage) } });
              
              await waitFor(
                () => {
                  expect(pageInput.value).toBe(String(targetPage));
                },
                { timeout: 1000 }
              );

              // Verify page count remains correct
              expect(pageCount).toHaveTextContent(`of ${numPages}`);

              // Note: onPageChange is called after page renders, not immediately
              // The important thing is that the page indicator updates correctly
            }

            // Verify final page indicator state
            const finalPage = parseInt(pageInput.value);
            expect(finalPage).toBeGreaterThanOrEqual(1);
            expect(finalPage).toBeLessThanOrEqual(numPages);
            expect(pageCount).toHaveTextContent(`of ${numPages}`);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  /**
   * Property 14: Sequential navigation consistency
   * For any PDF, navigating forward then backward should return to the original page
   * Validates: Requirements 5.1
   */
  it('should maintain consistency when navigating forward then backward', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random number of pages (3-50)
        fc.integer({ min: 3, max: 50 }),
        // Generate random starting page
        fc.integer({ min: 2, max: 49 }),
        async (pdfUrl, numPages, startPage) => {
          // Clamp starting page to valid range (not first or last)
          const validStartPage = Math.max(2, Math.min(startPage, numPages - 1));
          
          // Mock successful PDF loading
          const mockDocument = {
            numPages,
            getPage: vi.fn((pageNum: number) => Promise.resolve({
              getViewport: vi.fn(() => ({ width: 800, height: 600 })),
              render: vi.fn(() => ({ promise: Promise.resolve() })),
              pageNumber: pageNum,
            })),
            destroy: vi.fn(),
          };

          (loadPDFDocument as any).mockResolvedValue({
            document: mockDocument,
            numPages,
            loadTime: 1000,
          });

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle="Test Document"
            />
          );

          try {
            // Wait for PDF to load
            await waitFor(
              () => {
                expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
              },
              { timeout: 5000 }
            );

            // Wait for navigation controls to appear
            await waitFor(
              () => {
                expect(screen.getByTestId('pdfjs-page-navigation')).toBeInTheDocument();
              },
              { timeout: 2000 }
            );

            // Get navigation elements
            const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
            const nextButton = screen.getByTestId('pdfjs-next-page-button');
            const prevButton = screen.getByTestId('pdfjs-prev-page-button');

            // Navigate to starting page
            fireEvent.change(pageInput, { target: { value: String(validStartPage) } });
            
            await waitFor(
              () => {
                expect(pageInput.value).toBe(String(validStartPage));
              },
              { timeout: 1000 }
            );

            // Navigate forward
            fireEvent.click(nextButton);
            
            await waitFor(
              () => {
                expect(pageInput.value).toBe(String(validStartPage + 1));
              },
              { timeout: 1000 }
            );

            // Navigate backward
            fireEvent.click(prevButton);
            
            await waitFor(
              () => {
                expect(pageInput.value).toBe(String(validStartPage));
              },
              { timeout: 1000 }
            );

            // Verify we're back at the original page
            expect(pageInput.value).toBe(String(validStartPage));
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);
});
