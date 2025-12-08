import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import userEvent from '@testing-library/user-event';
import SimpleDocumentViewer from '../SimpleDocumentViewer';
import { PageData } from '../SimpleDocumentViewer';

/**
 * Property-based tests for zoom bounds
 * 
 * Feature: simple-pdf-viewer, Property 7: Zoom level bounds
 * Validates: Requirements 7.2, 7.3, 7.5
 * 
 * Tests:
 * - Zoom level always stays between 0.5 and 3.0
 * - Current page remains visible after zoom
 */
describe('Zoom Bounds Property Tests', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // Helper to create mock pages
  const createMockPages = (count: number): PageData[] => {
    return Array.from({ length: count }, (_, i) => ({
      pageNumber: i + 1,
      pageUrl: `https://example.com/page-${i + 1}.jpg`,
      dimensions: { width: 800, height: 1000 },
    }));
  };

  /**
   * Property 7: Zoom level bounds
   * For any zoom operation, the resulting zoom level should be between 0.5x and 3.0x
   * Validates: Requirements 7.2, 7.3, 7.5
   */
  it('should never allow zoom level below 0.5x when zooming out', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of pages (2-5) - reduced for performance
        fc.integer({ min: 2, max: 5 }),
        // Generate random number of zoom out clicks (1-8)
        fc.integer({ min: 1, max: 8 }),
        async (pageCount, zoomOutClicks) => {
          const user = userEvent.setup();
          const pages = createMockPages(pageCount);

          const { unmount } = render(
            <SimpleDocumentViewer
              documentId="test-doc"
              documentTitle="Test Document"
              pages={pages}
            />
          );

          try {
            // Find zoom out button
            const zoomOutButton = screen.getByTestId('zoom-out-button');
            const zoomLevelDisplay = screen.getByTestId('zoom-level');

            // Click zoom out multiple times
            for (let i = 0; i < zoomOutClicks; i++) {
              await user.click(zoomOutButton);
            }

            // Get displayed zoom level
            const displayedZoom = parseInt(zoomLevelDisplay.textContent || '100');
            
            // Zoom level should never be below 50% (0.5x)
            expect(displayedZoom).toBeGreaterThanOrEqual(50);
            
            // If we're at minimum zoom, button should be disabled
            if (displayedZoom === 50) {
              expect(zoomOutButton).toBeDisabled();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 30, timeout: 10000 }
    );
  }, 20000);

  it('should never allow zoom level above 3.0x when zooming in', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of pages (2-5) - reduced for performance
        fc.integer({ min: 2, max: 5 }),
        // Generate random number of zoom in clicks (1-12)
        fc.integer({ min: 1, max: 12 }),
        async (pageCount, zoomInClicks) => {
          const user = userEvent.setup();
          const pages = createMockPages(pageCount);

          const { unmount } = render(
            <SimpleDocumentViewer
              documentId="test-doc"
              documentTitle="Test Document"
              pages={pages}
            />
          );

          try {
            // Find zoom in button
            const zoomInButton = screen.getByTestId('zoom-in-button');
            const zoomLevelDisplay = screen.getByTestId('zoom-level');

            // Click zoom in multiple times
            for (let i = 0; i < zoomInClicks; i++) {
              await user.click(zoomInButton);
            }

            // Get displayed zoom level
            const displayedZoom = parseInt(zoomLevelDisplay.textContent || '100');
            
            // Zoom level should never be above 300% (3.0x)
            expect(displayedZoom).toBeLessThanOrEqual(300);
            
            // If we're at maximum zoom, button should be disabled
            if (displayedZoom === 300) {
              expect(zoomInButton).toBeDisabled();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 30, timeout: 10000 }
    );
  }, 20000);

  it('should maintain zoom bounds with random zoom operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of pages (2-5) - reduced for performance
        fc.integer({ min: 2, max: 5 }),
        // Generate random sequence of zoom operations
        fc.array(fc.constantFrom('in', 'out'), { minLength: 3, maxLength: 10 }),
        async (pageCount, zoomOperations) => {
          const user = userEvent.setup();
          const pages = createMockPages(pageCount);

          const { unmount } = render(
            <SimpleDocumentViewer
              documentId="test-doc"
              documentTitle="Test Document"
              pages={pages}
            />
          );

          try {
            const zoomInButton = screen.getByTestId('zoom-in-button');
            const zoomOutButton = screen.getByTestId('zoom-out-button');
            const zoomLevelDisplay = screen.getByTestId('zoom-level');

            // Perform random zoom operations
            for (const operation of zoomOperations) {
              if (operation === 'in') {
                await user.click(zoomInButton);
              } else {
                await user.click(zoomOutButton);
              }
            }

            // Get final zoom level
            const finalZoom = parseInt(zoomLevelDisplay.textContent || '100');
            
            // Zoom level should always be within bounds
            expect(finalZoom).toBeGreaterThanOrEqual(50);
            expect(finalZoom).toBeLessThanOrEqual(300);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 30, timeout: 10000 }
    );
  }, 20000);

  it('should maintain current page visibility after zoom operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of pages (3-10) - reduced for performance
        fc.integer({ min: 3, max: 10 }),
        // Generate random current page
        fc.integer({ min: 1, max: 10 }),
        // Generate random zoom operation
        fc.constantFrom('in', 'out'),
        async (pageCount, rawCurrentPage, zoomOperation) => {
          const user = userEvent.setup();
          const pages = createMockPages(pageCount);
          
          // Clamp current page to valid range
          const currentPage = Math.max(1, Math.min(rawCurrentPage, pageCount));

          const { unmount } = render(
            <SimpleDocumentViewer
              documentId="test-doc"
              documentTitle="Test Document"
              pages={pages}
            />
          );

          try {
            // Navigate to the target page first
            const pageInput = screen.getByTestId('page-input') as HTMLInputElement;
            await user.clear(pageInput);
            await user.type(pageInput, String(currentPage));
            await user.keyboard('{Enter}');

            // Get current page before zoom
            const pageBeforeZoom = parseInt(pageInput.value);

            // Perform zoom operation
            if (zoomOperation === 'in') {
              const zoomInButton = screen.getByTestId('zoom-in-button');
              await user.click(zoomInButton);
            } else {
              const zoomOutButton = screen.getByTestId('zoom-out-button');
              await user.click(zoomOutButton);
            }

            // Get current page after zoom
            const pageAfterZoom = parseInt(pageInput.value);

            // Current page should remain the same after zoom
            expect(pageAfterZoom).toBe(pageBeforeZoom);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 15000);

  it('should enforce zoom bounds with rapid zoom operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of pages (2-5) - reduced for performance
        fc.integer({ min: 2, max: 5 }),
        // Generate random number of rapid clicks (3-8)
        fc.integer({ min: 3, max: 8 }),
        // Generate random operation type
        fc.constantFrom('in', 'out'),
        async (pageCount, rapidClicks, operation) => {
          const user = userEvent.setup();
          const pages = createMockPages(pageCount);

          const { unmount } = render(
            <SimpleDocumentViewer
              documentId="test-doc"
              documentTitle="Test Document"
              pages={pages}
            />
          );

          try {
            const zoomInButton = screen.getByTestId('zoom-in-button');
            const zoomOutButton = screen.getByTestId('zoom-out-button');
            const zoomLevelDisplay = screen.getByTestId('zoom-level');

            // Perform rapid clicks
            const button = operation === 'in' ? zoomInButton : zoomOutButton;
            for (let i = 0; i < rapidClicks; i++) {
              await user.click(button);
            }

            // Get final zoom level
            const finalZoom = parseInt(zoomLevelDisplay.textContent || '100');
            
            // Zoom level should always be within bounds
            expect(finalZoom).toBeGreaterThanOrEqual(50);
            expect(finalZoom).toBeLessThanOrEqual(300);

            // Button should be disabled at boundaries
            if (finalZoom === 50) {
              expect(zoomOutButton).toBeDisabled();
            }
            if (finalZoom === 300) {
              expect(zoomInButton).toBeDisabled();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  }, 20000);

  it('should handle zoom with different starting zoom levels', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of pages (2-5) - reduced for performance
        fc.integer({ min: 2, max: 5 }),
        // Generate random starting zoom level (0.5 to 3.0 in 0.25 increments)
        fc.integer({ min: 2, max: 12 }).map(n => n * 0.25),
        // Generate random zoom operation
        fc.constantFrom('in', 'out'),
        async (pageCount, startingZoom, operation) => {
          const pages = createMockPages(pageCount);

          // Set initial zoom in localStorage
          localStorage.setItem('document-viewer-preferences', JSON.stringify({
            viewMode: 'continuous',
            defaultZoom: startingZoom,
            rememberPosition: true,
          }));

          const user = userEvent.setup();

          const { unmount } = render(
            <SimpleDocumentViewer
              documentId="test-doc"
              documentTitle="Test Document"
              pages={pages}
            />
          );

          try {
            const zoomInButton = screen.getByTestId('zoom-in-button');
            const zoomOutButton = screen.getByTestId('zoom-out-button');
            const zoomLevelDisplay = screen.getByTestId('zoom-level');

            // Perform zoom operation
            if (operation === 'in') {
              await user.click(zoomInButton);
            } else {
              await user.click(zoomOutButton);
            }

            // Get final zoom level
            const finalZoom = parseInt(zoomLevelDisplay.textContent || '100');
            
            // Zoom level should always be within bounds
            expect(finalZoom).toBeGreaterThanOrEqual(50);
            expect(finalZoom).toBeLessThanOrEqual(300);
          } finally {
            unmount();
            localStorage.clear();
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  }, 20000);
});
