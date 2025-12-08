/**
 * Property-based tests for PDF page indicators
 * 
 * Feature: pdf-iframe-blocking-fix, Property 16: Page indicator accuracy
 * Validates: Requirements 5.3
 * 
 * Tests:
 * - For any page change, the page indicator should update to show the correct current page number
 * - Page indicators should always display valid page numbers (1 to numPages)
 * - Page count should remain consistent regardless of navigation
 * - Page indicators should update immediately when page changes
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

describe('PDFViewerWithPDFJS - Page Indicators Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 16: Page indicator accuracy
   * For any page change, the page indicator should update to show the correct current page number
   * Validates: Requirements 5.3
   */
  it('should display correct page indicator for any page navigation', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random number of pages (2-100)
        fc.integer({ min: 2, max: 100 }),
        // Generate random sequence of page navigations
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 5 }),
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

            // Get page indicator elements
            const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
            const pageCount = screen.getByTestId('pdfjs-page-count');

            // Verify initial page indicator shows page 1
            expect(pageInput.value).toBe('1');
            expect(pageCount).toHaveTextContent(`of ${numPages}`);

            // Navigate through the page sequence and verify indicators update correctly
            for (const targetPage of validPageSequence) {
              // Navigate to target page
              fireEvent.change(pageInput, { target: { value: String(targetPage) } });
              
              // Verify page indicator updates to show correct page
              await waitFor(
                () => {
                  expect(pageInput.value).toBe(String(targetPage));
                },
                { timeout: 1000 }
              );

              // Verify page count remains consistent
              expect(pageCount).toHaveTextContent(`of ${numPages}`);

              // Verify page number is within valid range
              const displayedPage = parseInt(pageInput.value);
              expect(displayedPage).toBeGreaterThanOrEqual(1);
              expect(displayedPage).toBeLessThanOrEqual(numPages);
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
   * Property 16: Page indicator consistency with button navigation
   * For any next/previous button click, the page indicator should update correctly
   * Validates: Requirements 5.3
   */
  it('should update page indicator correctly for button navigation', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random number of pages (5-50)
        fc.integer({ min: 5, max: 50 }),
        // Generate random number of next button clicks (1-10)
        fc.integer({ min: 1, max: 10 }),
        async (pdfUrl, numPages, clickCount) => {
          // Clamp click count to not exceed pages
          const validClickCount = Math.min(clickCount, numPages - 1);
          
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

            // Get page indicator elements
            const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
            const pageCount = screen.getByTestId('pdfjs-page-count');
            const nextButton = screen.getByTestId('pdfjs-next-page-button');

            // Verify initial state
            expect(pageInput.value).toBe('1');
            expect(pageCount).toHaveTextContent(`of ${numPages}`);

            // Click next button multiple times and verify indicator updates
            for (let i = 0; i < validClickCount; i++) {
              const expectedPage = i + 2; // Starting from page 1, so next is 2, then 3, etc.
              
              fireEvent.click(nextButton);
              
              // Verify page indicator updates correctly
              await waitFor(
                () => {
                  expect(pageInput.value).toBe(String(expectedPage));
                },
                { timeout: 1000 }
              );

              // Verify page count remains consistent
              expect(pageCount).toHaveTextContent(`of ${numPages}`);
            }

            // Now click previous button and verify indicator updates
            const prevButton = screen.getByTestId('pdfjs-prev-page-button');
            const currentPage = parseInt(pageInput.value);
            
            if (currentPage > 1) {
              fireEvent.click(prevButton);
              
              await waitFor(
                () => {
                  expect(pageInput.value).toBe(String(currentPage - 1));
                },
                { timeout: 1000 }
              );

              // Verify page count remains consistent
              expect(pageCount).toHaveTextContent(`of ${numPages}`);
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
   * Property 16: Page indicator bounds validation
   * For any PDF, page indicators should always display valid page numbers (1 to numPages)
   * Validates: Requirements 5.3
   */
  it('should always display valid page numbers in indicators', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random number of pages (1-100)
        fc.integer({ min: 1, max: 100 }),
        // Generate random invalid page attempts (including negative, zero, and beyond max)
        fc.array(fc.integer({ min: -10, max: 200 }), { minLength: 1, maxLength: 3 }),
        async (pdfUrl, numPages, invalidPages) => {
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

            // Get page indicator elements
            const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
            const pageCount = screen.getByTestId('pdfjs-page-count');

            // Try to navigate to invalid pages
            for (const invalidPage of invalidPages) {
              fireEvent.change(pageInput, { target: { value: String(invalidPage) } });
              
              // Wait a bit for any updates (shorter timeout)
              await new Promise(resolve => setTimeout(resolve, 50));

              // Verify page indicator shows a valid page number
              const displayedPage = parseInt(pageInput.value);
              expect(displayedPage).toBeGreaterThanOrEqual(1);
              expect(displayedPage).toBeLessThanOrEqual(numPages);

              // Verify page count remains consistent
              expect(pageCount).toHaveTextContent(`of ${numPages}`);
            }
          } finally {
            unmount();
            // Ensure cleanup completes
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      ),
      { numRuns: 50, timeout: 8000 }
    );
  }, 20000);

  /**
   * Property 16: Page indicator immediate update
   * For any page change, the page indicator should update immediately (not delayed)
   * Validates: Requirements 5.3
   */
  it('should update page indicator immediately on page change', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random number of pages (3-50)
        fc.integer({ min: 3, max: 50 }),
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

          const { unmount, container } = render(
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
                const navElement = container.querySelector('[data-testid="pdfjs-page-navigation"]');
                expect(navElement).toBeInTheDocument();
              },
              { timeout: 2000 }
            );

            // Get page indicator elements using container queries to avoid multiple elements
            const pageInput = container.querySelector('[data-testid="pdfjs-page-input"]') as HTMLInputElement;
            const pageCount = container.querySelector('[data-testid="pdfjs-page-count"]');
            
            expect(pageInput).toBeInTheDocument();
            expect(pageCount).toBeInTheDocument();

            // Record time before navigation
            const startTime = Date.now();

            // Navigate to target page
            fireEvent.change(pageInput, { target: { value: String(validTargetPage) } });
              
            // Verify page indicator updates quickly (within 500ms)
            await waitFor(
              () => {
                expect(pageInput.value).toBe(String(validTargetPage));
              },
              { timeout: 500 }
            );

            const updateTime = Date.now() - startTime;

            // Verify update was immediate (less than 500ms)
            expect(updateTime).toBeLessThan(500);

            // Verify page count is still correct
            expect(pageCount).toHaveTextContent(`of ${numPages}`);
          } finally {
            unmount();
            // Ensure cleanup completes before next test
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      ),
      { numRuns: 50, timeout: 8000 }
    );
  }, 20000);

  /**
   * Property 16: Page indicator consistency across navigation methods
   * For any page, all navigation methods should result in the same page indicator
   * Validates: Requirements 5.3
   */
  it('should show consistent page indicator across different navigation methods', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random number of pages (5-50)
        fc.integer({ min: 5, max: 50 }),
        // Generate random target page
        fc.integer({ min: 2, max: 49 }),
        async (pdfUrl, numPages, targetPage) => {
          // Clamp target page to valid range (not first or last)
          const validTargetPage = Math.max(2, Math.min(targetPage, numPages - 1));
          
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

            // Get page indicator elements
            const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
            const pageCount = screen.getByTestId('pdfjs-page-count');
            const nextButton = screen.getByTestId('pdfjs-next-page-button');
            const prevButton = screen.getByTestId('pdfjs-prev-page-button');

            // Method 1: Navigate using input field
            fireEvent.change(pageInput, { target: { value: String(validTargetPage) } });
            
            await waitFor(
              () => {
                expect(pageInput.value).toBe(String(validTargetPage));
              },
              { timeout: 1000 }
            );

            const indicatorAfterInput = pageInput.value;
            const countAfterInput = pageCount.textContent;

            // Method 2: Navigate using next button (go to next page)
            fireEvent.click(nextButton);
            
            await waitFor(
              () => {
                expect(pageInput.value).toBe(String(validTargetPage + 1));
              },
              { timeout: 1000 }
            );

            // Method 3: Navigate back using previous button
            fireEvent.click(prevButton);
            
            await waitFor(
              () => {
                expect(pageInput.value).toBe(String(validTargetPage));
              },
              { timeout: 1000 }
            );

            const indicatorAfterButtons = pageInput.value;
            const countAfterButtons = pageCount.textContent;

            // Verify indicators are consistent across navigation methods
            expect(indicatorAfterButtons).toBe(indicatorAfterInput);
            expect(countAfterButtons).toBe(countAfterInput);
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
   * Property 16: Page count immutability
   * For any navigation, the total page count should never change
   * Validates: Requirements 5.3
   */
  it('should maintain consistent total page count during navigation', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random number of pages (2-100)
        fc.integer({ min: 2, max: 100 }),
        // Generate random sequence of page changes
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 3, maxLength: 10 }),
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

            // Get page indicator elements
            const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
            const pageCount = screen.getByTestId('pdfjs-page-count');

            // Record initial page count
            const initialPageCount = pageCount.textContent;
            expect(initialPageCount).toBe(`of ${numPages}`);

            // Navigate through multiple pages
            for (const targetPage of validPageSequence) {
              fireEvent.change(pageInput, { target: { value: String(targetPage) } });
              
              await waitFor(
                () => {
                  expect(pageInput.value).toBe(String(targetPage));
                },
                { timeout: 1000 }
              );

              // Verify page count never changes
              expect(pageCount.textContent).toBe(initialPageCount);
              expect(pageCount).toHaveTextContent(`of ${numPages}`);
            }

            // Verify final page count is still the same
            expect(pageCount.textContent).toBe(initialPageCount);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);
});
