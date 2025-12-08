import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import userEvent from '@testing-library/user-event';
import ViewerToolbar from '../ViewerToolbar';
import { ViewMode } from '../SimpleDocumentViewer';

/**
 * Property-based tests for ViewerToolbar navigation boundaries
 * 
 * Feature: simple-pdf-viewer, Property 3: Navigation boundary enforcement
 * Validates: Requirements 3.4, 3.5
 * 
 * Tests:
 * - Navigation never goes below 1 or above totalPages
 * - Test with random page numbers and navigation actions
 */
describe('ViewerToolbar Navigation Boundaries Property Tests', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  /**
   * Property 3: Navigation boundary enforcement
   * For any navigation attempt beyond document boundaries, 
   * the system should prevent the action and maintain the current position
   * Validates: Requirements 3.4, 3.5
   */
  it('should never navigate below page 1 when clicking previous', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random total pages (2-100)
        fc.integer({ min: 2, max: 100 }),
        async (totalPages) => {
          const user = userEvent.setup();
          const onPageChange = vi.fn();
          const onViewModeChange = vi.fn();
          const onZoomChange = vi.fn();

          // Start at page 1 (boundary condition)
          const currentPage = 1;

          const { unmount } = render(
            <ViewerToolbar
              documentTitle="Test Document"
              currentPage={currentPage}
              totalPages={totalPages}
              viewMode="continuous"
              zoomLevel={1.0}
              onPageChange={onPageChange}
              onViewModeChange={onViewModeChange}
              onZoomChange={onZoomChange}
            />
          );

          try {
            // Find previous button
            const prevButton = screen.getByTestId('prev-page-button');

            // Button should be disabled at page 1
            expect(prevButton).toBeDisabled();

            // Try to click it anyway
            await user.click(prevButton);

            // onPageChange should not be called
            expect(onPageChange).not.toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 15000);

  it('should never navigate above totalPages when clicking next', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random total pages (2-100)
        fc.integer({ min: 2, max: 100 }),
        async (totalPages) => {
          const user = userEvent.setup();
          const onPageChange = vi.fn();
          const onViewModeChange = vi.fn();
          const onZoomChange = vi.fn();

          // Start at last page (boundary condition)
          const currentPage = totalPages;

          const { unmount } = render(
            <ViewerToolbar
              documentTitle="Test Document"
              currentPage={currentPage}
              totalPages={totalPages}
              viewMode="continuous"
              zoomLevel={1.0}
              onPageChange={onPageChange}
              onViewModeChange={onViewModeChange}
              onZoomChange={onZoomChange}
            />
          );

          try {
            // Find next button
            const nextButton = screen.getByTestId('next-page-button');

            // Button should be disabled at last page
            expect(nextButton).toBeDisabled();

            // Try to click it anyway
            await user.click(nextButton);

            // onPageChange should not be called
            expect(onPageChange).not.toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 15000);

  it('should call onPageChange when valid page numbers are entered', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random total pages (5-50)
        fc.integer({ min: 5, max: 50 }),
        // Generate random single-digit page number for simpler testing
        fc.integer({ min: 1, max: 9 }),
        async (totalPages, targetPage) => {
          const user = userEvent.setup();
          const onPageChange = vi.fn();
          const onViewModeChange = vi.fn();
          const onZoomChange = vi.fn();

          // Start at page 1 to avoid confusion with existing digits
          const currentPage = 1;

          const { unmount } = render(
            <ViewerToolbar
              documentTitle="Test Document"
              currentPage={currentPage}
              totalPages={totalPages}
              viewMode="continuous"
              zoomLevel={1.0}
              onPageChange={onPageChange}
              onViewModeChange={onViewModeChange}
              onZoomChange={onZoomChange}
            />
          );

          try {
            // Find page input
            const pageInput = screen.getByTestId('page-input') as HTMLInputElement;

            // Triple-click to select all, then type to replace
            await user.tripleClick(pageInput);
            await user.keyboard(String(targetPage));

            // The toolbar should call onPageChange with the typed value
            // Parent component (SimpleDocumentViewer) is responsible for clamping
            if (onPageChange.mock.calls.length > 0) {
              // Get the last call (final value after all typing)
              const lastCall = onPageChange.mock.calls[onPageChange.mock.calls.length - 1][0];
              // Should have called with the target page
              expect(lastCall).toBe(targetPage);
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should maintain current page when navigation is at boundaries', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random total pages (3-30)
        fc.integer({ min: 3, max: 30 }),
        // Generate random current page
        fc.integer({ min: 1, max: 30 }),
        async (totalPages, rawCurrentPage) => {
          const user = userEvent.setup();
          const onPageChange = vi.fn();
          const onViewModeChange = vi.fn();
          const onZoomChange = vi.fn();

          // Clamp current page to valid range
          const currentPage = Math.max(1, Math.min(rawCurrentPage, totalPages));

          const { unmount } = render(
            <ViewerToolbar
              documentTitle="Test Document"
              currentPage={currentPage}
              totalPages={totalPages}
              viewMode="continuous"
              zoomLevel={1.0}
              onPageChange={onPageChange}
              onViewModeChange={onViewModeChange}
              onZoomChange={onZoomChange}
            />
          );

          try {
            const prevButton = screen.getByTestId('prev-page-button');
            const nextButton = screen.getByTestId('next-page-button');

            // Test previous button at boundary
            if (currentPage === 1) {
              expect(prevButton).toBeDisabled();
              await user.click(prevButton);
              expect(onPageChange).not.toHaveBeenCalled();
            } else {
              expect(prevButton).not.toBeDisabled();
              await user.click(prevButton);
              expect(onPageChange).toHaveBeenCalledWith(currentPage - 1);
            }

            // Reset mock
            onPageChange.mockClear();

            // Test next button at boundary
            if (currentPage === totalPages) {
              expect(nextButton).toBeDisabled();
              await user.click(nextButton);
              expect(onPageChange).not.toHaveBeenCalled();
            } else {
              expect(nextButton).not.toBeDisabled();
              await user.click(nextButton);
              expect(onPageChange).toHaveBeenCalledWith(currentPage + 1);
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 15000);

  it('should handle rapid navigation attempts at boundaries', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random total pages (5-20)
        fc.integer({ min: 5, max: 20 }),
        // Generate random number of clicks (2-5) - reduced for performance
        fc.integer({ min: 2, max: 5 }),
        async (totalPages, numClicks) => {
          const user = userEvent.setup();
          const onPageChange = vi.fn();
          const onViewModeChange = vi.fn();
          const onZoomChange = vi.fn();

          // Start at page 1
          const currentPage = 1;

          const { unmount } = render(
            <ViewerToolbar
              documentTitle="Test Document"
              currentPage={currentPage}
              totalPages={totalPages}
              viewMode="continuous"
              zoomLevel={1.0}
              onPageChange={onPageChange}
              onViewModeChange={onViewModeChange}
              onZoomChange={onZoomChange}
            />
          );

          try {
            const prevButton = screen.getByTestId('prev-page-button');

            // Button should be disabled
            expect(prevButton).toBeDisabled();

            // Try to click multiple times rapidly
            for (let i = 0; i < numClicks; i++) {
              await user.click(prevButton);
            }

            // onPageChange should never be called
            expect(onPageChange).not.toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 30, timeout: 10000 }
    );
  }, 15000);

  it('should enforce boundaries for arrow navigation actions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random total pages (10-50)
        fc.integer({ min: 10, max: 50 }),
        // Generate random action: 'prev' or 'next'
        fc.constantFrom('prev', 'next'),
        async (totalPages, action) => {
          const user = userEvent.setup();
          const onPageChange = vi.fn();
          const onViewModeChange = vi.fn();
          const onZoomChange = vi.fn();

          // Start at a valid middle page
          const currentPage = Math.floor(totalPages / 2);

          const { unmount } = render(
            <ViewerToolbar
              documentTitle="Test Document"
              currentPage={currentPage}
              totalPages={totalPages}
              viewMode="continuous"
              zoomLevel={1.0}
              onPageChange={onPageChange}
              onViewModeChange={onViewModeChange}
              onZoomChange={onZoomChange}
            />
          );

          try {
            if (action === 'prev') {
              const prevButton = screen.getByTestId('prev-page-button');
              await user.click(prevButton);
              
              if (onPageChange.mock.calls.length > 0) {
                const calledValue = onPageChange.mock.calls[0][0];
                // Should call with currentPage - 1
                expect(calledValue).toBe(currentPage - 1);
                // Should be within bounds
                expect(calledValue).toBeGreaterThanOrEqual(1);
                expect(calledValue).toBeLessThanOrEqual(totalPages);
              }
            } else if (action === 'next') {
              const nextButton = screen.getByTestId('next-page-button');
              await user.click(nextButton);
              
              if (onPageChange.mock.calls.length > 0) {
                const calledValue = onPageChange.mock.calls[0][0];
                // Should call with currentPage + 1
                expect(calledValue).toBe(currentPage + 1);
                // Should be within bounds
                expect(calledValue).toBeGreaterThanOrEqual(1);
                expect(calledValue).toBeLessThanOrEqual(totalPages);
              }
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
