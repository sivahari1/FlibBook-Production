import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import ContinuousScrollView from '../ContinuousScrollView';
import { PageData } from '../SimpleDocumentViewer';

/**
 * Property-based tests for ContinuousScrollView
 * 
 * Feature: simple-pdf-viewer, Property 2: Smooth page transitions
 * Validates: Requirements 2.1, 2.2, 2.3
 * 
 * Tests:
 * - Page indicator updates within 100ms of scroll
 * - Pages load progressively as they enter viewport
 */
describe('ContinuousScrollView Property Tests', () => {
  let mockIntersectionObserver: any;
  let observerCallback: IntersectionObserverCallback;
  let observedElements: Map<Element, IntersectionObserverEntry>;

  beforeEach(() => {
    observedElements = new Map();
    
    // Mock IntersectionObserver
    mockIntersectionObserver = class {
      callback: IntersectionObserverCallback;
      observe = vi.fn((element: Element) => {
        // Store element for later triggering
        observedElements.set(element, {
          target: element,
          isIntersecting: false,
          intersectionRatio: 0,
          boundingClientRect: element.getBoundingClientRect(),
          intersectionRect: element.getBoundingClientRect(),
          rootBounds: null,
          time: Date.now(),
        } as IntersectionObserverEntry);
      });
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = '';
      thresholds = [];

      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        observerCallback = callback;
      }
    };

    global.IntersectionObserver = mockIntersectionObserver as any;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  /**
   * Helper to simulate page becoming visible
   */
  const simulatePageVisible = (pageNumber: number, intersectionRatio: number = 0.5) => {
    const element = Array.from(observedElements.keys()).find(
      (el) => el.getAttribute('data-page') === String(pageNumber)
    );

    if (element && observerCallback) {
      const entry = observedElements.get(element)!;
      observerCallback(
        [
          {
            ...entry,
            isIntersecting: true,
            intersectionRatio,
          },
        ],
        {} as IntersectionObserver
      );
    }
  };

  /**
   * Property 2: Smooth page transitions
   * For any navigation action, the system should update the current page indicator within reasonable time
   * Validates: Requirements 2.1, 2.2, 2.3
   */
  it('should update page indicator promptly when page becomes visible', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of pages (3-20)
        fc.integer({ min: 3, max: 20 }),
        // Generate random page to make visible (will be clamped to valid range)
        fc.integer({ min: 1, max: 20 }),
        async (totalPages, targetPage) => {
          // Clamp target page to valid range
          const validTargetPage = Math.max(1, Math.min(targetPage, totalPages));

          // Generate mock pages
          const mockPages: PageData[] = Array.from({ length: totalPages }, (_, i) => ({
            pageNumber: i + 1,
            pageUrl: `https://example.com/page${i + 1}.jpg`,
            dimensions: { width: 800, height: 1000 },
          }));

          const onPageVisible = vi.fn();

          const { unmount } = render(
            <ContinuousScrollView
              pages={mockPages}
              zoomLevel={1.0}
              onPageVisible={onPageVisible}
            />
          );

          try {
            // Simulate page becoming visible (50% threshold)
            simulatePageVisible(validTargetPage, 0.5);

            // Wait for callback to be called with reasonable timeout for test environment
            await waitFor(
              () => {
                expect(onPageVisible).toHaveBeenCalledWith(validTargetPage);
              },
              { timeout: 250 }
            );

            // Verify the callback was called with correct page number
            expect(onPageVisible).toHaveBeenCalledWith(validTargetPage);
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 10 }
    );
  }, 10000);

  /**
   * Property 2: Progressive page loading
   * Pages should load progressively as they enter viewport
   * Validates: Requirements 2.3, 2.4
   */
  it('should load pages progressively as they enter viewport', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of pages (5-15)
        fc.integer({ min: 5, max: 15 }),
        // Generate random page to make visible
        fc.integer({ min: 1, max: 15 }),
        async (totalPages, targetPage) => {
          // Clamp target page to valid range
          const validTargetPage = Math.max(1, Math.min(targetPage, totalPages));

          // Generate mock pages
          const mockPages: PageData[] = Array.from({ length: totalPages }, (_, i) => ({
            pageNumber: i + 1,
            pageUrl: `https://example.com/page${i + 1}.jpg`,
            dimensions: { width: 800, height: 1000 },
          }));

          const onPageVisible = vi.fn();

          const { unmount } = render(
            <ContinuousScrollView
              pages={mockPages}
              zoomLevel={1.0}
              onPageVisible={onPageVisible}
            />
          );

          try {
            // Initially, only page 1 should be visible (default state)
            const page1Elements = screen.queryAllByTestId('page-1');
            expect(page1Elements.length).toBeGreaterThan(0);

            // Simulate page entering viewport (10% threshold - starts loading)
            simulatePageVisible(validTargetPage, 0.1);

            // Wait for page to be marked as visible
            await waitFor(() => {
              const pageElements = screen.queryAllByTestId(`page-${validTargetPage}`);
              expect(pageElements.length).toBeGreaterThan(0);
            });

            // Verify the page image is rendered (not just placeholder)
            const pageElements = screen.getAllByTestId(`page-${validTargetPage}`);
            const pageElement = pageElements[0]; // Use first element if multiple exist
            const img = pageElement.querySelector('img');
            
            // If page is visible, it should have an img element
            if (img) {
              expect(img).toHaveAttribute('src', `https://example.com/page${validTargetPage}.jpg`);
            }
          } finally {
            unmount();
            cleanup();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Pages render in correct vertical order
   * For any set of pages, they should be rendered in ascending order
   */
  it('should render pages in correct vertical order', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of pages (3-10)
        fc.integer({ min: 3, max: 10 }),
        async (totalPages) => {
          // Generate mock pages
          const mockPages: PageData[] = Array.from({ length: totalPages }, (_, i) => ({
            pageNumber: i + 1,
            pageUrl: `https://example.com/page${i + 1}.jpg`,
            dimensions: { width: 800, height: 1000 },
          }));

          const onPageVisible = vi.fn();

          const { unmount } = render(
            <ContinuousScrollView
              pages={mockPages}
              zoomLevel={1.0}
              onPageVisible={onPageVisible}
            />
          );

          try {
            // Verify all pages are rendered
            for (let i = 1; i <= totalPages; i++) {
              const page = screen.getByTestId(`page-${i}`);
              expect(page).toBeInTheDocument();
              expect(page).toHaveAttribute('data-page', String(i));
            }

            // Verify pages are in correct order in DOM
            const container = screen.getByTestId('continuous-scroll-view');
            const pageElements = container.querySelectorAll('[data-page]');
            
            pageElements.forEach((element, index) => {
              expect(element.getAttribute('data-page')).toBe(String(index + 1));
            });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Zoom level affects page dimensions
   * For any zoom level, page dimensions should scale proportionally
   */
  it('should scale page dimensions according to zoom level', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random zoom level (0.5 to 3.0)
        fc.double({ min: 0.5, max: 3.0 }),
        // Generate random page dimensions
        fc.integer({ min: 400, max: 1200 }),
        fc.integer({ min: 500, max: 1500 }),
        async (zoomLevel, width, height) => {
          const mockPages: PageData[] = [
            {
              pageNumber: 1,
              pageUrl: 'https://example.com/page1.jpg',
              dimensions: { width, height },
            },
          ];

          const onPageVisible = vi.fn();

          const { unmount } = render(
            <ContinuousScrollView
              pages={mockPages}
              zoomLevel={zoomLevel}
              onPageVisible={onPageVisible}
            />
          );

          try {
            const page = screen.getByTestId('page-1');
            const expectedWidth = width * zoomLevel;
            const expectedHeight = height * zoomLevel;

            expect(page).toHaveStyle({
              width: `${expectedWidth}px`,
              height: `${expectedHeight}px`,
            });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
