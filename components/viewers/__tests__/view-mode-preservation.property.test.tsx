import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import SimpleDocumentViewer, { PageData, ViewMode } from '../SimpleDocumentViewer';

/**
 * Property-based tests for view mode preservation
 * 
 * Feature: simple-pdf-viewer, Property 6: View mode preservation
 * Validates: Requirements 6.4
 * 
 * Tests:
 * - Current page is maintained when switching modes
 * - Test with random page positions
 */
describe('View Mode Preservation Property Tests', () => {
  let mockIntersectionObserver: any;
  let observerCallback: IntersectionObserverCallback;
  let observedElements: Map<Element, IntersectionObserverEntry>;

  beforeEach(() => {
    observedElements = new Map();
    
    // Mock IntersectionObserver
    mockIntersectionObserver = class {
      callback: IntersectionObserverCallback;
      observe = vi.fn((element: Element) => {
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

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  /**
   * Helper to simulate page becoming visible in continuous mode
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
   * Property 6: View mode preservation
   * For any view mode switch, the system should maintain the current page position
   * Validates: Requirements 6.4
   */
  it('should preserve current page when switching between view modes', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate smaller range for faster execution (3-8 pages)
        fc.integer({ min: 3, max: 8 }),
        // Generate random starting page
        fc.integer({ min: 1, max: 8 }),
        // Generate random starting view mode
        fc.constantFrom('continuous' as ViewMode, 'paged' as ViewMode),
        async (totalPages, startingPage, startingViewMode) => {
          // Clamp starting page to valid range
          const validStartingPage = Math.max(1, Math.min(startingPage, totalPages));

          // Generate mock pages (smaller set for performance)
          const mockPages: PageData[] = Array.from({ length: totalPages }, (_, i) => ({
            pageNumber: i + 1,
            pageUrl: `https://example.com/page${i + 1}.jpg`,
            dimensions: { width: 800, height: 1000 },
          }));

          // Mock localStorage to return starting preferences
          const mockLocalStorage = window.localStorage as any;
          mockLocalStorage.getItem.mockReturnValue(
            JSON.stringify({
              viewMode: startingViewMode,
              defaultZoom: 1.0,
              rememberPosition: true,
            })
          );

          const { unmount } = render(
            <SimpleDocumentViewer
              documentId="test-doc"
              documentTitle="Test Document"
              pages={mockPages}
            />
          );

          try {
            // Navigate to the starting page first
            const pageInput = screen.getByTestId('page-input');
            fireEvent.change(pageInput, { target: { value: validStartingPage.toString() } });

            // Verify we're on the correct starting page
            expect(pageInput).toHaveValue(validStartingPage);

            // Get the view mode toggle button
            const viewModeToggle = screen.getByTestId('view-mode-toggle');

            // Switch view mode
            fireEvent.click(viewModeToggle);

            // Verify the page is preserved after mode switch
            const pageInputAfterSwitch = screen.getByTestId('page-input');
            expect(pageInputAfterSwitch).toHaveValue(validStartingPage);

            // Verify localStorage was called to save preferences
            expect(mockLocalStorage.setItem).toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20, timeout: 10000 } // Reduced runs and increased timeout
    );
  }, 15000); // Increased test timeout

  /**
   * Property: View mode toggle updates UI correctly
   * For any view mode switch, the UI should reflect the new mode
   */
  it('should update UI to reflect current view mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of pages (3-10)
        fc.integer({ min: 3, max: 10 }),
        // Generate random starting view mode
        fc.constantFrom('continuous' as ViewMode, 'paged' as ViewMode),
        async (totalPages, startingViewMode) => {
          // Generate mock pages
          const mockPages: PageData[] = Array.from({ length: totalPages }, (_, i) => ({
            pageNumber: i + 1,
            pageUrl: `https://example.com/page${i + 1}.jpg`,
            dimensions: { width: 800, height: 1000 },
          }));

          // Mock localStorage to return starting preferences
          const mockLocalStorage = window.localStorage as any;
          mockLocalStorage.getItem.mockReturnValue(
            JSON.stringify({
              viewMode: startingViewMode,
              defaultZoom: 1.0,
              rememberPosition: true,
            })
          );

          const { unmount } = render(
            <SimpleDocumentViewer
              documentId="test-doc"
              documentTitle="Test Document"
              pages={mockPages}
            />
          );

          try {
            // Verify initial view mode is displayed correctly
            if (startingViewMode === 'continuous') {
              expect(screen.getByTestId('continuous-scroll-view')).toBeInTheDocument();
              expect(screen.queryByTestId('paged-view')).not.toBeInTheDocument();
            } else {
              expect(screen.getByTestId('paged-view')).toBeInTheDocument();
              expect(screen.queryByTestId('continuous-scroll-view')).not.toBeInTheDocument();
            }

            // Get the view mode toggle button
            const viewModeToggle = screen.getByTestId('view-mode-toggle');

            // Switch view mode
            fireEvent.click(viewModeToggle);

            // Verify UI updated to show the new mode
            if (startingViewMode === 'continuous') {
              // Should now show paged view
              expect(screen.getByTestId('paged-view')).toBeInTheDocument();
              expect(screen.queryByTestId('continuous-scroll-view')).not.toBeInTheDocument();
            } else {
              // Should now show continuous view
              expect(screen.getByTestId('continuous-scroll-view')).toBeInTheDocument();
              expect(screen.queryByTestId('paged-view')).not.toBeInTheDocument();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: View mode preferences are persisted
   * For any view mode change, the preference should be saved to localStorage
   */
  it('should persist view mode preferences to localStorage', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random starting view mode
        fc.constantFrom('continuous' as ViewMode, 'paged' as ViewMode),
        async (startingViewMode) => {
          const mockPages: PageData[] = [
            {
              pageNumber: 1,
              pageUrl: 'https://example.com/page1.jpg',
              dimensions: { width: 800, height: 1000 },
            },
          ];

          // Mock localStorage
          const mockLocalStorage = window.localStorage as any;
          mockLocalStorage.getItem.mockReturnValue(
            JSON.stringify({
              viewMode: startingViewMode,
              defaultZoom: 1.0,
              rememberPosition: true,
            })
          );

          const { unmount } = render(
            <SimpleDocumentViewer
              documentId="test-doc"
              documentTitle="Test Document"
              pages={mockPages}
            />
          );

          try {
            // Clear previous setItem calls
            mockLocalStorage.setItem.mockClear();

            // Get the view mode toggle button and click it
            const viewModeToggle = screen.getByTestId('view-mode-toggle');
            fireEvent.click(viewModeToggle);

            // Verify localStorage.setItem was called with the new view mode
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
              'document-viewer-preferences',
              expect.stringContaining(
                startingViewMode === 'continuous' ? 'paged' : 'continuous'
              )
            );

            // Verify the saved preferences contain the correct view mode
            const lastCall = mockLocalStorage.setItem.mock.calls[mockLocalStorage.setItem.mock.calls.length - 1];
            const savedPrefs = JSON.parse(lastCall[1]);
            expect(savedPrefs.viewMode).toBe(
              startingViewMode === 'continuous' ? 'paged' : 'continuous'
            );
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Multiple view mode switches preserve page position
   * For any sequence of view mode switches, the current page should remain consistent
   */
  it('should preserve page position through multiple view mode switches', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate smaller range for faster execution (3-6 pages)
        fc.integer({ min: 3, max: 6 }),
        // Generate random target page
        fc.integer({ min: 1, max: 6 }),
        // Generate smaller number of switches (2-4)
        fc.integer({ min: 2, max: 4 }),
        async (totalPages, targetPage, numSwitches) => {
          // Clamp target page to valid range
          const validTargetPage = Math.max(1, Math.min(targetPage, totalPages));

          // Generate mock pages
          const mockPages: PageData[] = Array.from({ length: totalPages }, (_, i) => ({
            pageNumber: i + 1,
            pageUrl: `https://example.com/page${i + 1}.jpg`,
            dimensions: { width: 800, height: 1000 },
          }));

          const { unmount } = render(
            <SimpleDocumentViewer
              documentId="test-doc"
              documentTitle="Test Document"
              pages={mockPages}
            />
          );

          try {
            // Navigate to target page
            const pageInput = screen.getByTestId('page-input');
            fireEvent.change(pageInput, { target: { value: validTargetPage.toString() } });

            // Verify we're on the target page
            expect(pageInput).toHaveValue(validTargetPage);

            // Get the view mode toggle button
            const viewModeToggle = screen.getByTestId('view-mode-toggle');

            // Perform multiple view mode switches
            for (let i = 0; i < numSwitches; i++) {
              fireEvent.click(viewModeToggle);

              // Verify page is preserved after each switch
              const currentPageInput = screen.getByTestId('page-input');
              expect(currentPageInput).toHaveValue(validTargetPage);
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 15, timeout: 8000 } // Reduced runs and added timeout
    );
  }, 12000); // Increased test timeout
});