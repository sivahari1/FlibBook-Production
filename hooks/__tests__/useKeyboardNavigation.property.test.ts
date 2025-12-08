import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { useKeyboardNavigation } from '../useKeyboardNavigation';

/**
 * Property-based tests for useKeyboardNavigation hook
 * 
 * Feature: simple-pdf-viewer, Property 5: Keyboard shortcut consistency
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 * 
 * Tests:
 * - All keyboard shortcuts perform correct actions
 * - preventDefault() is called appropriately
 */
describe('useKeyboardNavigation Property Tests', () => {
  let onPageChange: ReturnType<typeof vi.fn>;
  let onZoomChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onPageChange = vi.fn();
    onZoomChange = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper to simulate keyboard event
   */
  const simulateKeyPress = (key: string, options: Partial<KeyboardEvent> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    });
    
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);
    
    return { event, preventDefaultSpy };
  };

  /**
   * Property 5: Keyboard shortcut consistency - Navigation keys
   * For any valid page position and navigation action, the system should navigate correctly
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
   */
  it('should navigate correctly for any valid page position with arrow keys', () => {
    fc.assert(
      fc.property(
        // Generate random current page (1-100)
        fc.integer({ min: 1, max: 100 }),
        // Generate random total pages (must be >= current page)
        fc.integer({ min: 1, max: 100 }),
        (currentPage, totalPages) => {
          // Ensure totalPages >= currentPage
          const validTotalPages = Math.max(currentPage, totalPages);
          
          onPageChange.mockClear();
          
          const { unmount } = renderHook(() =>
            useKeyboardNavigation({
              currentPage,
              totalPages: validTotalPages,
              onPageChange,
              onZoomChange,
              zoomLevel: 1.0,
            })
          );

          try {
            // Test ArrowDown
            simulateKeyPress('ArrowDown');
            if (currentPage < validTotalPages) {
              expect(onPageChange).toHaveBeenCalledWith(currentPage + 1);
            } else {
              expect(onPageChange).not.toHaveBeenCalled();
            }

            onPageChange.mockClear();

            // Test ArrowUp
            simulateKeyPress('ArrowUp');
            if (currentPage > 1) {
              expect(onPageChange).toHaveBeenCalledWith(currentPage - 1);
            } else {
              expect(onPageChange).not.toHaveBeenCalled();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Keyboard shortcut consistency - Page Up/Down keys
   * For any valid page position, PageUp and PageDown should behave identically to arrow keys
   * Validates: Requirements 5.3, 5.4
   */
  it('should navigate correctly with PageUp and PageDown keys', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (currentPage, totalPages) => {
          const validTotalPages = Math.max(currentPage, totalPages);
          
          onPageChange.mockClear();
          
          const { unmount } = renderHook(() =>
            useKeyboardNavigation({
              currentPage,
              totalPages: validTotalPages,
              onPageChange,
              onZoomChange,
              zoomLevel: 1.0,
            })
          );

          try {
            // Test PageDown
            simulateKeyPress('PageDown');
            if (currentPage < validTotalPages) {
              expect(onPageChange).toHaveBeenCalledWith(currentPage + 1);
            } else {
              expect(onPageChange).not.toHaveBeenCalled();
            }

            onPageChange.mockClear();

            // Test PageUp
            simulateKeyPress('PageUp');
            if (currentPage > 1) {
              expect(onPageChange).toHaveBeenCalledWith(currentPage - 1);
            } else {
              expect(onPageChange).not.toHaveBeenCalled();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Keyboard shortcut consistency - Home/End keys
   * For any page position, Home should go to page 1 and End should go to last page
   * Validates: Requirements 5.5, 5.6
   */
  it('should navigate to first and last page with Home and End keys', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (currentPage, totalPages) => {
          const validTotalPages = Math.max(currentPage, totalPages);
          
          onPageChange.mockClear();
          
          renderHook(() =>
            useKeyboardNavigation({
              currentPage,
              totalPages: validTotalPages,
              onPageChange,
              onZoomChange,
              zoomLevel: 1.0,
            })
          );

          // Test Home key
          simulateKeyPress('Home');
          expect(onPageChange).toHaveBeenCalledWith(1);

          onPageChange.mockClear();

          // Test End key
          simulateKeyPress('End');
          expect(onPageChange).toHaveBeenCalledWith(validTotalPages);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Zoom level bounds enforcement
   * For any zoom level, zoom operations should always stay within bounds [0.5, 3.0]
   * Validates: Requirements 7.2, 7.3, 7.5
   */
  it('should enforce zoom level bounds for any starting zoom level', () => {
    fc.assert(
      fc.property(
        // Generate random zoom level (0.5 to 3.0), excluding NaN and Infinity
        fc.double({ min: 0.5, max: 3.0, noNaN: true }),
        (zoomLevel) => {
          onZoomChange.mockClear();
          
          const { unmount } = renderHook(() =>
            useKeyboardNavigation({
              currentPage: 5,
              totalPages: 10,
              onPageChange,
              onZoomChange,
              zoomLevel,
            })
          );

          try {
            // Test zoom in
            simulateKeyPress('+', { ctrlKey: true });
            const expectedZoomIn = Math.min(zoomLevel + 0.25, 3.0);
            expect(onZoomChange).toHaveBeenCalledWith(expectedZoomIn);
            
            // Verify zoom in result is within bounds
            expect(expectedZoomIn).toBeGreaterThanOrEqual(0.5);
            expect(expectedZoomIn).toBeLessThanOrEqual(3.0);

            onZoomChange.mockClear();

            // Test zoom out
            simulateKeyPress('-', { ctrlKey: true });
            const expectedZoomOut = Math.max(zoomLevel - 0.25, 0.5);
            expect(onZoomChange).toHaveBeenCalledWith(expectedZoomOut);
            
            // Verify zoom out result is within bounds
            expect(expectedZoomOut).toBeGreaterThanOrEqual(0.5);
            expect(expectedZoomOut).toBeLessThanOrEqual(3.0);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: preventDefault is called for navigation keys
   * For any navigation key, preventDefault should be called to prevent browser defaults
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
   */
  it('should call preventDefault for all navigation keys', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (navigationKey, currentPage, totalPages) => {
          const validTotalPages = Math.max(currentPage, totalPages);
          
          renderHook(() =>
            useKeyboardNavigation({
              currentPage,
              totalPages: validTotalPages,
              onPageChange,
              onZoomChange,
              zoomLevel: 1.0,
            })
          );

          const { preventDefaultSpy } = simulateKeyPress(navigationKey);
          
          // preventDefault should always be called for navigation keys
          expect(preventDefaultSpy).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: preventDefault is called for zoom shortcuts
   * For zoom shortcuts (Ctrl/Cmd + Plus/Minus), preventDefault should be called
   * Validates: Requirements 7.1, 7.2, 7.3
   */
  it('should call preventDefault for zoom shortcuts', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('+', '=', '-'),
        fc.boolean(), // ctrlKey or metaKey
        fc.double({ min: 0.5, max: 3.0 }),
        (key, useCtrl, zoomLevel) => {
          renderHook(() =>
            useKeyboardNavigation({
              currentPage: 5,
              totalPages: 10,
              onPageChange,
              onZoomChange,
              zoomLevel,
            })
          );

          const options = useCtrl ? { ctrlKey: true } : { metaKey: true };
          const { preventDefaultSpy } = simulateKeyPress(key, options);
          
          // preventDefault should always be called for zoom shortcuts
          expect(preventDefaultSpy).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Non-navigation keys don't trigger actions
   * For any non-navigation key, no callbacks should be invoked
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
   */
  it('should not respond to non-navigation keys', () => {
    fc.assert(
      fc.property(
        // Generate random single character strings excluding navigation keys
        fc.string({ minLength: 1, maxLength: 1 }).filter(c => 
          !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', '+', '=', '-'].includes(c)
        ),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (randomKey, currentPage, totalPages) => {
          const validTotalPages = Math.max(currentPage, totalPages);
          
          onPageChange.mockClear();
          onZoomChange.mockClear();
          
          const { unmount } = renderHook(() =>
            useKeyboardNavigation({
              currentPage,
              totalPages: validTotalPages,
              onPageChange,
              onZoomChange,
              zoomLevel: 1.0,
            })
          );

          try {
            const { preventDefaultSpy } = simulateKeyPress(randomKey);
            
            // No callbacks should be invoked for non-navigation keys
            expect(onPageChange).not.toHaveBeenCalled();
            expect(onZoomChange).not.toHaveBeenCalled();
            
            // preventDefault should not be called for non-navigation keys
            expect(preventDefaultSpy).not.toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Navigation never goes out of bounds
   * For any page navigation action, the result should always be within [1, totalPages]
   * Validates: Requirements 3.4, 3.5, 5.1, 5.2, 5.3, 5.4
   */
  it('should never navigate out of bounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.constantFrom('ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'),
        (currentPage, totalPages, navigationKey) => {
          const validTotalPages = Math.max(currentPage, totalPages);
          
          onPageChange.mockClear();
          
          const { unmount } = renderHook(() =>
            useKeyboardNavigation({
              currentPage,
              totalPages: validTotalPages,
              onPageChange,
              onZoomChange,
              zoomLevel: 1.0,
            })
          );

          try {
            simulateKeyPress(navigationKey);
            
            // If onPageChange was called, verify the new page is within bounds
            if (onPageChange.mock.calls.length > 0) {
              const newPage = onPageChange.mock.calls[0][0];
              expect(newPage).toBeGreaterThanOrEqual(1);
              expect(newPage).toBeLessThanOrEqual(validTotalPages);
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Zoom increments are consistent
   * For any zoom level, zoom in/out should change by exactly 0.25 (within bounds)
   * Validates: Requirements 7.2, 7.3
   */
  it('should change zoom by exactly 0.25 when within bounds', () => {
    fc.assert(
      fc.property(
        // Generate zoom level that allows both zoom in and out
        fc.double({ min: 0.75, max: 2.75, noNaN: true }),
        (zoomLevel) => {
          onZoomChange.mockClear();
          
          const { unmount } = renderHook(() =>
            useKeyboardNavigation({
              currentPage: 5,
              totalPages: 10,
              onPageChange,
              onZoomChange,
              zoomLevel,
            })
          );

          try {
            // Test zoom in (should be exactly +0.25 since we're within bounds)
            simulateKeyPress('+', { ctrlKey: true });
            expect(onZoomChange).toHaveBeenCalledWith(zoomLevel + 0.25);

            onZoomChange.mockClear();

            // Test zoom out (should be exactly -0.25 since we're within bounds)
            simulateKeyPress('-', { ctrlKey: true });
            expect(onZoomChange).toHaveBeenCalledWith(zoomLevel - 0.25);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Ctrl and Cmd keys work equivalently for zoom
   * For any zoom operation, Ctrl and Cmd (Meta) should produce identical results
   * Validates: Requirements 7.1, 7.2, 7.3
   */
  it('should handle Ctrl and Cmd keys equivalently for zoom', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('+', '=', '-'),
        fc.double({ min: 0.5, max: 3.0, noNaN: true }),
        (key, zoomLevel) => {
          onZoomChange.mockClear();
          
          // Test with Ctrl key
          const { unmount: unmount1 } = renderHook(() =>
            useKeyboardNavigation({
              currentPage: 5,
              totalPages: 10,
              onPageChange,
              onZoomChange,
              zoomLevel,
            })
          );

          simulateKeyPress(key, { ctrlKey: true });
          const ctrlResult = onZoomChange.mock.calls[0]?.[0];
          unmount1();

          onZoomChange.mockClear();

          // Test with Meta key (Cmd on Mac)
          const { unmount: unmount2 } = renderHook(() =>
            useKeyboardNavigation({
              currentPage: 5,
              totalPages: 10,
              onPageChange,
              onZoomChange,
              zoomLevel,
            })
          );

          simulateKeyPress(key, { metaKey: true });
          const metaResult = onZoomChange.mock.calls[0]?.[0];
          unmount2();

          // Both should produce the same result
          expect(ctrlResult).toBe(metaResult);
        }
      ),
      { numRuns: 100 }
    );
  });
});
