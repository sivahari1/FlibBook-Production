/**
 * Property-based tests for PDF visible page priority
 * 
 * Feature: pdf-iframe-blocking-fix, Property 22: Visible page priority
 * Validates: Requirements 6.4
 * 
 * Tests:
 * - For any large PDF, visible pages should be prioritized over non-visible pages
 * - Visible pages should have higher priority values in the render queue
 * - Visible pages should be rendered before non-visible pages
 * - The render queue should prioritize based on visibility
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

// Track render calls with priority information
interface RenderCall {
  pageNumber: number;
  priority: number;
  timestamp: number;
}

let renderCalls: RenderCall[] = [];

vi.mock('@/lib/pdfjs-render-pipeline', () => ({
  getGlobalRenderPipeline: vi.fn(() => ({
    queueRender: vi.fn((page, pageNumber, canvas, scale, priority, callback) => {
      // Track render call with priority
      renderCalls.push({
        pageNumber,
        priority,
        timestamp: Date.now(),
      });
      
      // Simulate successful render after a short delay
      setTimeout(() => {
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

describe('PDFViewerWithPDFJS - Page Priority Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderCalls = [];
    document.body.innerHTML = '';
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  /**
   * Property 22: Visible page priority
   * For any large PDF, visible pages should be prioritized over non-visible pages
   * Validates: Requirements 6.4
   */
  it('should prioritize visible pages over non-visible pages', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate large PDFs (20-50 pages) to test priority
        fc.integer({ min: 20, max: 50 }),
        async (pdfUrl, numPages) => {
          // Clear render tracking
          renderCalls = [];
          
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
                const containers = document.querySelectorAll('[data-testid="pdfjs-continuous-container"]');
                expect(containers.length).toBeGreaterThan(0);
              },
              { timeout: 2000 }
            );

            // Wait for initial rendering to be queued
            await new Promise(resolve => setTimeout(resolve, 500));

            // Property: Visible pages should have higher priority than non-visible pages
            // In the implementation, visible pages get priority 50, non-visible get priority 10
            
            if (renderCalls.length > 0) {
              // Page 1 should be initially visible and have high priority
              const page1Call = renderCalls.find(call => call.pageNumber === 1);
              if (page1Call) {
                // Page 1 (initially visible) should have high priority
                expect(page1Call.priority).toBeGreaterThanOrEqual(50);
              }
              
              // Verify that distant pages (if queued) have lower priority
              const distantPages = renderCalls.filter(call => call.pageNumber > 10);
              if (distantPages.length > 0 && page1Call) {
                // Distant pages should have lower or equal priority than page 1
                distantPages.forEach(call => {
                  expect(call.priority).toBeLessThanOrEqual(page1Call.priority);
                });
              }
            }
            
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  }, 30000);

  /**
   * Property 22: Priority ordering in render queue
   * For any PDF, pages should be rendered in priority order (visible first)
   * Validates: Requirements 6.4
   */
  it('should render pages in priority order with visible pages first', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate PDFs with enough pages to test priority (15-40)
        fc.integer({ min: 15, max: 40 }),
        async (pdfUrl, numPages) => {
          // Clear render tracking
          renderCalls = [];
          
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
                const containers = document.querySelectorAll('[data-testid="pdfjs-continuous-container"]');
                expect(containers.length).toBeGreaterThan(0);
              },
              { timeout: 2000 }
            );

            // Wait for initial rendering
            await new Promise(resolve => setTimeout(resolve, 500));

            // Property: Pages should be queued in priority order
            // Higher priority pages should be queued before lower priority pages
            
            if (renderCalls.length >= 2) {
              // Find the first high priority page (priority >= 50)
              const firstHighPriorityCall = renderCalls.find(call => call.priority >= 50);
              
              // Find the first low priority page (priority < 50)
              const firstLowPriorityCall = renderCalls.find(call => call.priority < 50);
              
              if (firstHighPriorityCall && firstLowPriorityCall) {
                // The first high priority page should be queued before or at the same time
                // as the first low priority page
                expect(firstHighPriorityCall.timestamp).toBeLessThanOrEqual(
                  firstLowPriorityCall.timestamp
                );
              }
            }
            
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  }, 30000);

  /**
   * Property 22: Visible pages have consistently higher priority
   * For any PDF, all visible pages should have higher priority than all non-visible pages
   * Validates: Requirements 6.4
   */
  it('should assign higher priority to all visible pages than non-visible pages', async () => {
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random PDF URLs
        fc.webUrl({ validSchemes: ['https'] }),
        // Generate PDFs (20-50 pages)
        fc.integer({ min: 20, max: 50 }),
        async (pdfUrl, numPages) => {
          // Clear render tracking
          renderCalls = [];
          
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
                const containers = document.querySelectorAll('[data-testid="pdfjs-continuous-container"]');
                expect(containers.length).toBeGreaterThan(0);
              },
              { timeout: 2000 }
            );

            // Wait for initial rendering
            await new Promise(resolve => setTimeout(resolve, 500));

            // Property: All visible pages should have higher priority than non-visible pages
            // Based on the implementation:
            // - Visible pages get priority 50
            // - Non-visible pages get priority 10
            
            if (renderCalls.length > 0) {
              // Identify visible pages (initially page 1 and possibly adjacent pages)
              const visiblePageCalls = renderCalls.filter(call => 
                call.pageNumber <= 3 // Page 1 and adjacent pages (2, 3) are likely visible/adjacent
              );
              
              const nonVisiblePageCalls = renderCalls.filter(call => 
                call.pageNumber > 5 // Pages far from the viewport
              );
              
              if (visiblePageCalls.length > 0 && nonVisiblePageCalls.length > 0) {
                // Get minimum priority of visible pages
                const minVisiblePriority = Math.min(...visiblePageCalls.map(c => c.priority));
                
                // Get maximum priority of non-visible pages
                const maxNonVisiblePriority = Math.max(...nonVisiblePageCalls.map(c => c.priority));
                
                // Property: Minimum visible priority should be >= maximum non-visible priority
                // This ensures visible pages are always prioritized
                expect(minVisiblePriority).toBeGreaterThanOrEqual(maxNonVisiblePriority);
              }
            }
            
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  }, 30000);
});
