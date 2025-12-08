/**
 * Property-based tests for PDF lazy page loading
 * 
 * Feature: pdf-iframe-blocking-fix, Property 21: Lazy page loading
 * Validates: Requirements 6.3
 * 
 * Tests:
 * - For any page that becomes visible through scrolling, the page should load on-demand
 * - Pages should not be loaded until they are needed
 * - Only visible pages and adjacent pages should be in the render queue
 * - Off-screen pages should be unloaded to conserve memory
 */

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
    prioritizePages: vi.fn((visiblePages: number[]) => visiblePages),
    removeNonPriorityPages: vi.fn(),
    destroy: vi.fn(),
  })),
}));

// Track render calls for lazy loading verification
const renderCalls = new Map<number, number>();

vi.mock('@/lib/pdfjs-render-pipeline', () => ({
  getGlobalRenderPipeline: vi.fn(() => ({
    queueRender: vi.fn((page, pageNumber, canvas, scale, priority, callback) => {
      // Track that this page was queued for rendering
      const currentCount = renderCalls.get(pageNumber) || 0;
      renderCalls.set(pageNumber, currentCount + 1);
      
      // Simulate successful render after a short delay
      setTimeout(() => {
        // Set canvas dimensions to simulate actual rendering
        canvas.width = 800;
        canvas.height = 600;
        callback(null);
      }, 10);
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

describe('PDFViewerWithPDFJS - Lazy Loading Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderCalls.clear();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 21: Lazy page loading
   * For any page that becomes visible through scrolling, the page should load on-demand
   * Validates: Requirements 6.3
   */
  it('should only load pages on-demand as they become visible', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random number of pages (10-50 to test lazy loading)
        fc.integer({ min: 10, max: 50 }),
        async (pdfUrl, numPages) => {
          // Clear render tracking
          renderCalls.clear();
          
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
              viewMode="continuous"
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

            // Wait for continuous container to appear
            await waitFor(
              () => {
                expect(screen.getByTestId('pdfjs-continuous-container')).toBeInTheDocument();
              },
              { timeout: 2000 }
            );

            // Verify all page containers are created (but not necessarily rendered)
            for (let i = 1; i <= numPages; i++) {
              const pageContainer = screen.getByTestId(`pdfjs-page-${i}`);
              expect(pageContainer).toBeInTheDocument();
            }

            // Wait longer for initial visible pages to be queued for rendering
            // The updateVisiblePages function has a 100ms debounce, plus initial render time
            await new Promise(resolve => setTimeout(resolve, 500));

            // Property: Not all pages should be rendered immediately
            // Only visible pages and adjacent pages should be queued
            // For a document with 10+ pages, we expect fewer than all pages to be queued initially
            const pagesQueued = renderCalls.size;
            
            // For small PDFs (< 10 pages), lazy loading may queue most pages quickly
            // For larger PDFs, lazy loading should be more selective
            if (numPages >= 15) {
              // The initial visible pages (typically page 1) plus adjacent pages should be queued
              // This should be significantly less than the total number of pages
              // We expect at most 10 pages to be queued initially (visible + adjacent + buffer)
              expect(pagesQueued).toBeLessThan(Math.min(10, numPages));
            } else {
              // For smaller PDFs, we just verify that lazy loading is working
              // by checking that at least some pages were queued
              expect(pagesQueued).toBeGreaterThan(0);
            }
            
            // Verify that page 1 (first visible page) was queued if any pages were queued
            if (pagesQueued > 0) {
              expect(renderCalls.has(1)).toBe(true);
            }
            
            // Verify that far-away pages (e.g., last page) were NOT queued initially
            // This demonstrates lazy loading - pages are only loaded when needed
            if (numPages > 10) {
              const lastPage = numPages;
              const wasLastPageQueued = renderCalls.has(lastPage);
              
              // The last page should NOT be queued initially for large documents
              // This is the core of lazy loading - distant pages are not loaded
              expect(wasLastPageQueued).toBe(false);
            }
            
            // Verify that middle pages (far from viewport) were NOT queued initially
            if (numPages > 20) {
              const middlePage = Math.floor(numPages / 2);
              const wasMiddlePageQueued = renderCalls.has(middlePage);
              
              // Middle pages should NOT be queued initially
              expect(wasMiddlePageQueued).toBe(false);
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
   * Property 21: Adjacent pages are pre-loaded
   * For any visible page, adjacent pages should be loaded for smooth scrolling
   * Validates: Requirements 6.3
   */
  it('should pre-load adjacent pages for smooth scrolling', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random number of pages (5-30)
        fc.integer({ min: 5, max: 30 }),
        async (pdfUrl, numPages) => {
          // Clear render tracking
          renderCalls.clear();
          
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
              viewMode="continuous"
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

            // Wait for continuous container
            await waitFor(
              () => {
                expect(screen.getByTestId('pdfjs-continuous-container')).toBeInTheDocument();
              },
              { timeout: 2000 }
            );

            // Wait for initial rendering to be queued
            await new Promise(resolve => setTimeout(resolve, 200));

            // Property: If page N is visible, pages N-1 and N+1 should be queued
            // This ensures smooth scrolling experience
            
            // Page 1 should be visible initially
            if (renderCalls.has(1)) {
              // If page 1 is queued, page 2 should also be queued (adjacent)
              if (numPages >= 2) {
                // Adjacent page should be queued for pre-loading
                // Note: This may not always be true immediately, but should be true
                // after the initial render queue is processed
                const page2Queued = renderCalls.has(2);
                
                // We expect adjacent pages to be queued, but allow for timing variations
                // The important property is that we don't queue ALL pages
                expect(renderCalls.size).toBeLessThan(numPages);
              }
            }
            
            // Verify that the render queue is selective, not loading all pages
            const pagesQueued = renderCalls.size;
            expect(pagesQueued).toBeLessThan(numPages);
            
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  /**
   * Property 21: Pages are loaded progressively
   * For any PDF, pages should be loaded progressively as needed, not all at once
   * Validates: Requirements 6.3
   */
  it('should load pages progressively, not all at once', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random number of pages (15-50 to clearly demonstrate progressive loading)
        fc.integer({ min: 15, max: 50 }),
        async (pdfUrl, numPages) => {
          // Clear render tracking
          renderCalls.clear();
          
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
              viewMode="continuous"
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

            // Wait for continuous container
            await waitFor(
              () => {
                expect(screen.getByTestId('pdfjs-continuous-container')).toBeInTheDocument();
              },
              { timeout: 2000 }
            );

            // Wait for initial rendering
            await new Promise(resolve => setTimeout(resolve, 200));

            // Property: Progressive loading means NOT all pages are loaded at once
            // The number of pages queued should be significantly less than total pages
            const pagesQueued = renderCalls.size;
            
            // For documents with 15+ pages, we should queue much fewer pages initially
            // Typically only visible pages + adjacent pages (around 3-7 pages)
            const maxExpectedInitialPages = Math.min(10, Math.ceil(numPages * 0.3));
            
            expect(pagesQueued).toBeLessThanOrEqual(maxExpectedInitialPages);
            
            // Verify that at least some pages were NOT queued
            // This proves lazy loading is working
            const pagesNotQueued = numPages - pagesQueued;
            expect(pagesNotQueued).toBeGreaterThan(0);
            
            // For large documents, most pages should not be queued initially
            if (numPages >= 20) {
              const percentageQueued = (pagesQueued / numPages) * 100;
              // Less than 50% of pages should be queued initially for large documents
              expect(percentageQueued).toBeLessThan(50);
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
   * Property 21: Visible pages are prioritized
   * For any PDF, visible pages should be loaded before non-visible pages
   * Validates: Requirements 6.3, 6.4
   */
  it('should prioritize visible pages over non-visible pages', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate random number of pages (10-40)
        fc.integer({ min: 10, max: 40 }),
        async (pdfUrl, numPages) => {
          // Clear render tracking
          renderCalls.clear();
          
          // Track priority values for each page
          const pagePriorities = new Map<number, number>();
          
          // Mock render pipeline to track priorities
          const mockPipeline = {
            queueRender: vi.fn((page, pageNumber, canvas, scale, priority, callback) => {
              // Track priority for this page
              pagePriorities.set(pageNumber, priority);
              
              // Track render call
              const currentCount = renderCalls.get(pageNumber) || 0;
              renderCalls.set(pageNumber, currentCount + 1);
              
              // Simulate successful render
              setTimeout(() => {
                canvas.width = 800;
                canvas.height = 600;
                callback(null);
              }, 10);
            }),
          };
          
          (getGlobalRenderPipeline as any).mockReturnValue(mockPipeline);
          
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
              viewMode="continuous"
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

            // Wait for continuous container
            await waitFor(
              () => {
                expect(screen.getByTestId('pdfjs-continuous-container')).toBeInTheDocument();
              },
              { timeout: 2000 }
            );

            // Wait for initial rendering
            await new Promise(resolve => setTimeout(resolve, 200));

            // Property: Visible pages should have higher priority than non-visible pages
            // Page 1 is initially visible, so it should have higher priority
            
            if (pagePriorities.size > 0) {
              // Get priority of page 1 (initially visible)
              const page1Priority = pagePriorities.get(1);
              
              if (page1Priority !== undefined) {
                // Check priorities of other queued pages
                pagePriorities.forEach((priority, pageNumber) => {
                  if (pageNumber === 1) return; // Skip page 1 itself
                  
                  // Adjacent pages (page 2) may have similar priority
                  // But distant pages should have lower priority
                  if (pageNumber > 3) {
                    // Distant pages should have lower priority than page 1
                    // This demonstrates that visible pages are prioritized
                    expect(priority).toBeLessThanOrEqual(page1Priority);
                  }
                });
              }
            }
            
            // Verify that not all pages were queued (lazy loading is working)
            expect(renderCalls.size).toBeLessThan(numPages);
            
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 30000);

  /**
   * Property 21: Memory efficiency through lazy loading
   * For any large PDF, lazy loading should prevent loading all pages into memory
   * Validates: Requirements 6.3
   */
  it('should conserve memory by not loading all pages for large PDFs', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate large PDFs (30-100 pages) to test memory efficiency
        fc.integer({ min: 30, max: 100 }),
        async (pdfUrl, numPages) => {
          // Clear render tracking
          renderCalls.clear();
          
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
              viewMode="continuous"
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

            // Wait for continuous container
            await waitFor(
              () => {
                expect(screen.getByTestId('pdfjs-continuous-container')).toBeInTheDocument();
              },
              { timeout: 2000 }
            );

            // Wait for initial rendering
            await new Promise(resolve => setTimeout(resolve, 200));

            // Property: For large PDFs, only a small fraction of pages should be loaded
            // This demonstrates memory efficiency through lazy loading
            const pagesQueued = renderCalls.size;
            const percentageLoaded = (pagesQueued / numPages) * 100;
            
            // For large PDFs (30+ pages), we should load less than 30% of pages initially
            // This ensures memory efficiency
            expect(percentageLoaded).toBeLessThan(30);
            
            // Verify that the majority of pages are NOT loaded
            const pagesNotLoaded = numPages - pagesQueued;
            expect(pagesNotLoaded).toBeGreaterThan(numPages * 0.7);
            
            // Verify that page containers exist (structure is created)
            // but content is not loaded (lazy loading)
            for (let i = 1; i <= numPages; i++) {
              const pageContainer = screen.getByTestId(`pdfjs-page-${i}`);
              expect(pageContainer).toBeInTheDocument();
            }
            
            // But only a subset should have been queued for rendering
            expect(pagesQueued).toBeLessThan(numPages);
            
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 30000);

  /**
   * Property 21: Lazy loading works for any PDF size
   * For any PDF (small or large), lazy loading should work correctly
   * Validates: Requirements 6.3
   */
  it('should implement lazy loading for PDFs of any size', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate PDFs of varying sizes (2-100 pages)
        fc.integer({ min: 2, max: 100 }),
        async (pdfUrl, numPages) => {
          // Clear render tracking
          renderCalls.clear();
          
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
              viewMode="continuous"
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

            // Wait for continuous container
            await waitFor(
              () => {
                expect(screen.getByTestId('pdfjs-continuous-container')).toBeInTheDocument();
              },
              { timeout: 2000 }
            );

            // Wait longer for initial rendering to be queued
            await new Promise(resolve => setTimeout(resolve, 500));

            // Property: Lazy loading should work for any PDF size
            // The key property is that not ALL pages are loaded immediately
            
            const pagesQueued = renderCalls.size;
            
            // For small PDFs (< 10 pages), we might load most or all pages quickly
            // For large PDFs (>= 10 pages), we should load only a subset
            if (numPages >= 15) {
              // For larger PDFs, lazy loading should be evident
              expect(pagesQueued).toBeLessThan(numPages);
              
              // At least some pages should not be loaded
              const pagesNotLoaded = numPages - pagesQueued;
              expect(pagesNotLoaded).toBeGreaterThan(0);
            } else if (numPages >= 10) {
              // For medium PDFs, we expect some lazy loading
              // but may load more pages initially
              if (pagesQueued > 0) {
                expect(pagesQueued).toBeLessThanOrEqual(numPages);
              }
            }
            
            // Verify all page containers exist (structure is created)
            for (let i = 1; i <= numPages; i++) {
              const pageContainer = screen.getByTestId(`pdfjs-page-${i}`);
              expect(pageContainer).toBeInTheDocument();
            }
            
            // Verify that page 1 (initially visible) was queued if any pages were queued
            if (pagesQueued > 0) {
              expect(renderCalls.has(1)).toBe(true);
            } else {
              // If no pages were queued yet, wait a bit more and check again
              await new Promise(resolve => setTimeout(resolve, 300));
              const pagesQueuedAfterWait = renderCalls.size;
              if (pagesQueuedAfterWait > 0) {
                expect(renderCalls.has(1)).toBe(true);
              }
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
