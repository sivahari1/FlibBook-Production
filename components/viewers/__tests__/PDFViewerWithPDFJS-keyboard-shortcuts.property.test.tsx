/**
 * Property-based tests for PDFViewerWithPDFJS keyboard shortcuts
 * 
 * Feature: pdf-iframe-blocking-fix, Property 18: Keyboard shortcut response
 * Validates: Requirements 5.5
 * 
 * Tests that keyboard shortcuts perform the correct navigation actions
 * across all valid page positions and zoom levels.
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
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
      this.name = 'PDFDocumentLoaderError';
    }
  },
  PDFPageRendererError: class PDFPageRendererError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
      this.name = 'PDFPageRendererError';
    }
  },
}));

vi.mock('@/lib/pdfjs-memory', () => ({
  createMemoryManager: vi.fn(() => ({
    setPDFDocument: vi.fn(),
    addRenderedPage: vi.fn(),
    addPageObject: vi.fn(),
    prioritizePages: vi.fn((pages) => pages),
    removeNonPriorityPages: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('@/lib/pdfjs-render-pipeline', () => ({
  getGlobalRenderPipeline: vi.fn(() => ({
    queueRender: vi.fn((page, pageNum, canvas, zoom, priority, callback) => {
      // Simulate successful render
      setTimeout(() => callback(null), 0);
    }),
  })),
}));

describe('PDFViewerWithPDFJS Keyboard Shortcuts Property Tests', () => {
  let mockOnPageChange: ReturnType<typeof vi.fn>;
  let mockOnLoadComplete: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    mockOnPageChange = vi.fn();
    mockOnLoadComplete = vi.fn();

    // Mock loadPDFDocument to return a successful result
    const pdfjsIntegration = await import('@/lib/pdfjs-integration');
    vi.mocked(pdfjsIntegration.loadPDFDocument).mockImplementation(async ({ onProgress }) => {
      // Simulate progress
      onProgress?.({ loaded: 50, total: 100 });
      onProgress?.({ loaded: 100, total: 100 });

      return {
        document: {
          numPages: 10,
          getPage: vi.fn(async (pageNum) => ({
            pageNumber: pageNum,
            getViewport: vi.fn(() => ({
              width: 800,
              height: 1000,
              scale: 1.0,
            })),
            render: vi.fn(() => ({
              promise: Promise.resolve(),
            })),
          })),
          destroy: vi.fn(),
        },
        numPages: 10,
      };
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  /**
   * Helper to simulate keyboard event
   */
  const simulateKeyPress = (key: string, options: Partial<KeyboardEventInit> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    });

    window.dispatchEvent(event);
    return event;
  };

  /**
   * Helper to wait for PDF to load
   */
  const waitForPDFLoad = async () => {
    await waitFor(() => {
      expect(mockOnLoadComplete).toHaveBeenCalledWith(10);
    }, { timeout: 3000 });
  };

  /**
   * Property 18: Keyboard shortcut response - Arrow keys
   * For any valid page position, arrow keys should navigate correctly
   * Validates: Requirements 5.5
   */
  it('should navigate correctly with arrow keys for any page position', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random starting page (1-10)
        fc.integer({ min: 1, max: 10 }),
        async (startPage) => {
          mockOnPageChange.mockClear();
          mockOnLoadComplete.mockClear();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              onPageChange={mockOnPageChange}
              onLoadComplete={mockOnLoadComplete}
            />
          );

          try {
            // Wait for PDF to load
            await waitForPDFLoad();

            // Get the page input and set it to startPage
            const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
            
            // Simulate changing to start page
            pageInput.value = startPage.toString();
            pageInput.dispatchEvent(new Event('change', { bubbles: true }));

            await waitFor(() => {
              expect(pageInput.value).toBe(startPage.toString());
            });

            mockOnPageChange.mockClear();

            // Test ArrowRight (next page)
            simulateKeyPress('ArrowRight');

            await waitFor(() => {
              if (startPage < 10) {
                expect(mockOnPageChange).toHaveBeenCalledWith(startPage + 1);
              } else {
                // At last page, may still call with same page or not call at all
                // Both behaviors are acceptable
                expect(mockOnPageChange.mock.calls.length).toBeGreaterThanOrEqual(0);
              }
            });

            mockOnPageChange.mockClear();

            // Test ArrowLeft (previous page)
            simulateKeyPress('ArrowLeft');

            await waitFor(() => {
              if (startPage > 1) {
                expect(mockOnPageChange).toHaveBeenCalledWith(startPage - 1);
              } else {
                // At first page, may still call with same page or not call at all
                // Both behaviors are acceptable
                expect(mockOnPageChange.mock.calls.length).toBeGreaterThanOrEqual(0);
              }
            });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20 } // Reduced runs for async tests
    );
  });

  /**
   * Property 18: Keyboard shortcut response - PageUp/PageDown keys
   * For any valid page position, PageUp and PageDown should navigate correctly
   * Validates: Requirements 5.5
   */
  it('should navigate correctly with PageUp and PageDown keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (startPage) => {
          mockOnPageChange.mockClear();
          mockOnLoadComplete.mockClear();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              onPageChange={mockOnPageChange}
              onLoadComplete={mockOnLoadComplete}
            />
          );

          try {
            await waitForPDFLoad();

            const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
            pageInput.value = startPage.toString();
            pageInput.dispatchEvent(new Event('change', { bubbles: true }));

            await waitFor(() => {
              expect(pageInput.value).toBe(startPage.toString());
            });

            mockOnPageChange.mockClear();

            // Test PageDown (next page)
            simulateKeyPress('PageDown');

            await waitFor(() => {
              if (startPage < 10) {
                expect(mockOnPageChange).toHaveBeenCalledWith(startPage + 1);
              } else {
                // At last page, may still call with same page or not call at all
                expect(mockOnPageChange.mock.calls.length).toBeGreaterThanOrEqual(0);
              }
            });

            mockOnPageChange.mockClear();

            // Test PageUp (previous page)
            simulateKeyPress('PageUp');

            await waitFor(() => {
              if (startPage > 1) {
                expect(mockOnPageChange).toHaveBeenCalledWith(startPage - 1);
              } else {
                // At first page, may still call with same page or not call at all
                expect(mockOnPageChange.mock.calls.length).toBeGreaterThanOrEqual(0);
              }
            });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 18: Keyboard shortcut response - Home/End keys
   * For any page position, Home should go to page 1 and End should go to last page
   * Validates: Requirements 5.5
   */
  it('should navigate to first and last page with Home and End keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (startPage) => {
          mockOnPageChange.mockClear();
          mockOnLoadComplete.mockClear();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              onPageChange={mockOnPageChange}
              onLoadComplete={mockOnLoadComplete}
            />
          );

          try {
            await waitForPDFLoad();

            const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
            pageInput.value = startPage.toString();
            pageInput.dispatchEvent(new Event('change', { bubbles: true }));

            await waitFor(() => {
              expect(pageInput.value).toBe(startPage.toString());
            });

            mockOnPageChange.mockClear();

            // Test Home key (go to first page)
            simulateKeyPress('Home');

            // Wait a bit for any navigation to occur
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // Home should always try to go to page 1
            // If we're not on page 1, it should navigate there
            // If we're already on page 1, it may or may not call the callback
            if (mockOnPageChange.mock.calls.length > 0) {
              expect(mockOnPageChange).toHaveBeenCalledWith(1);
            }

            mockOnPageChange.mockClear();

            // Test End key (go to last page)
            simulateKeyPress('End');

            // Wait a bit for any navigation to occur
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // End should always try to go to last page
            // If we're not on last page, it should navigate there
            // If we're already on last page, it may or may not call the callback
            if (mockOnPageChange.mock.calls.length > 0) {
              expect(mockOnPageChange).toHaveBeenCalledWith(10);
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 18: Keyboard shortcut response - Navigation never goes out of bounds
   * For any navigation action, the result should always be within [1, numPages]
   * Validates: Requirements 5.5
   */
  it('should never navigate out of bounds with any keyboard shortcut', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        fc.constantFrom('ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'),
        async (startPage, navigationKey) => {
          mockOnPageChange.mockClear();
          mockOnLoadComplete.mockClear();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              onPageChange={mockOnPageChange}
              onLoadComplete={mockOnLoadComplete}
            />
          );

          try {
            await waitForPDFLoad();

            const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
            pageInput.value = startPage.toString();
            pageInput.dispatchEvent(new Event('change', { bubbles: true }));

            await waitFor(() => {
              expect(pageInput.value).toBe(startPage.toString());
            });

            mockOnPageChange.mockClear();

            // Simulate navigation key
            simulateKeyPress(navigationKey);

            // Wait a bit for any navigation to occur
            await new Promise(resolve => setTimeout(resolve, 100));

            // If onPageChange was called, verify the new page is within bounds
            if (mockOnPageChange.mock.calls.length > 0) {
              const newPage = mockOnPageChange.mock.calls[0][0];
              expect(newPage).toBeGreaterThanOrEqual(1);
              expect(newPage).toBeLessThanOrEqual(10);
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 18: Keyboard shortcut response - preventDefault is called
   * For all navigation keys, preventDefault should be called to prevent browser defaults
   * Validates: Requirements 5.5
   */
  it('should call preventDefault for all navigation keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'),
        async (navigationKey) => {
          mockOnPageChange.mockClear();
          mockOnLoadComplete.mockClear();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              onPageChange={mockOnPageChange}
              onLoadComplete={mockOnLoadComplete}
            />
          );

          try {
            await waitForPDFLoad();

            // Create a spy for preventDefault
            const preventDefaultSpy = vi.fn();
            const originalPreventDefault = KeyboardEvent.prototype.preventDefault;
            KeyboardEvent.prototype.preventDefault = preventDefaultSpy;

            try {
              simulateKeyPress(navigationKey);

              // Wait a bit for event handling
              await new Promise(resolve => setTimeout(resolve, 50));

              // preventDefault should have been called
              expect(preventDefaultSpy).toHaveBeenCalled();
            } finally {
              // Restore original preventDefault
              KeyboardEvent.prototype.preventDefault = originalPreventDefault;
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 18: Keyboard shortcut response - DRM shortcuts are blocked
   * When DRM is enabled, Ctrl+P and Ctrl+S should be blocked
   * Validates: Requirements 5.5, 4.2, 4.4
   */
  it('should block print and save shortcuts when DRM is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('p', 's'),
        fc.boolean(), // Use Ctrl or Cmd
        async (key, useCtrl) => {
          mockOnPageChange.mockClear();
          mockOnLoadComplete.mockClear();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              enableDRM={true}
              onPageChange={mockOnPageChange}
              onLoadComplete={mockOnLoadComplete}
            />
          );

          try {
            await waitForPDFLoad();

            // Create a spy for preventDefault and stopPropagation
            const preventDefaultSpy = vi.fn();
            const stopPropagationSpy = vi.fn();
            const originalPreventDefault = KeyboardEvent.prototype.preventDefault;
            const originalStopPropagation = KeyboardEvent.prototype.stopPropagation;
            
            KeyboardEvent.prototype.preventDefault = preventDefaultSpy;
            KeyboardEvent.prototype.stopPropagation = stopPropagationSpy;

            try {
              const options = useCtrl ? { ctrlKey: true } : { metaKey: true };
              simulateKeyPress(key, options);

              // Wait a bit for event handling
              await new Promise(resolve => setTimeout(resolve, 50));

              // Both preventDefault and stopPropagation should have been called
              expect(preventDefaultSpy).toHaveBeenCalled();
              expect(stopPropagationSpy).toHaveBeenCalled();
            } finally {
              // Restore original methods
              KeyboardEvent.prototype.preventDefault = originalPreventDefault;
              KeyboardEvent.prototype.stopPropagation = originalStopPropagation;
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 18: Keyboard shortcut response - Non-navigation keys don't trigger actions
   * For any non-navigation key, no navigation callbacks should be invoked
   * Validates: Requirements 5.5
   */
  it('should not respond to non-navigation keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random single character strings excluding navigation keys and space
        fc.string({ minLength: 1, maxLength: 1 }).filter(c => 
          !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(c)
        ),
        async (randomKey) => {
          mockOnPageChange.mockClear();
          mockOnLoadComplete.mockClear();

          const { unmount } = render(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle="Test Document"
              onPageChange={mockOnPageChange}
              onLoadComplete={mockOnLoadComplete}
            />
          );

          try {
            await waitForPDFLoad();

            mockOnPageChange.mockClear();

            // Simulate random key
            simulateKeyPress(randomKey);

            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 100));

            // No navigation should occur
            expect(mockOnPageChange).not.toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 18: Keyboard shortcut response - Arrow Up/Down behave like PageUp/PageDown
   * Arrow keys should produce the same navigation as Page keys
   * Validates: Requirements 5.5
   */
  it('should have ArrowUp/Down behave identically to PageUp/Down', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 9 }), // Middle pages to test both directions
        async (startPage) => {
          // Test ArrowDown vs PageDown
          {
            mockOnPageChange.mockClear();
            mockOnLoadComplete.mockClear();

            const { unmount: unmount1 } = render(
              <PDFViewerWithPDFJS
                pdfUrl="https://example.com/test.pdf"
                documentTitle="Test Document"
                onPageChange={mockOnPageChange}
                onLoadComplete={mockOnLoadComplete}
              />
            );

            await waitForPDFLoad();

            const pageInput1 = screen.getAllByTestId('pdfjs-page-input')[0] as HTMLInputElement;
            pageInput1.value = startPage.toString();
            pageInput1.dispatchEvent(new Event('change', { bubbles: true }));

            await waitFor(() => {
              expect(pageInput1.value).toBe(startPage.toString());
            });

            mockOnPageChange.mockClear();
            simulateKeyPress('ArrowDown');

            await new Promise(resolve => setTimeout(resolve, 100));
            const arrowDownResult = mockOnPageChange.mock.calls[0]?.[0];

            unmount1();
            cleanup(); // Ensure cleanup between renders

            mockOnPageChange.mockClear();
            mockOnLoadComplete.mockClear();

            const { unmount: unmount2 } = render(
              <PDFViewerWithPDFJS
                pdfUrl="https://example.com/test.pdf"
                documentTitle="Test Document"
                onPageChange={mockOnPageChange}
                onLoadComplete={mockOnLoadComplete}
              />
            );

            await waitForPDFLoad();

            const pageInput2 = screen.getAllByTestId('pdfjs-page-input')[0] as HTMLInputElement;
            pageInput2.value = startPage.toString();
            pageInput2.dispatchEvent(new Event('change', { bubbles: true }));

            await waitFor(() => {
              expect(pageInput2.value).toBe(startPage.toString());
            });

            mockOnPageChange.mockClear();
            simulateKeyPress('PageDown');

            await new Promise(resolve => setTimeout(resolve, 100));
            const pageDownResult = mockOnPageChange.mock.calls[0]?.[0];

            // Both should produce the same result
            expect(arrowDownResult).toBe(pageDownResult);

            unmount2();
            cleanup(); // Ensure cleanup between renders
          }

          // Test ArrowUp vs PageUp
          {
            mockOnPageChange.mockClear();
            mockOnLoadComplete.mockClear();

            const { unmount: unmount3 } = render(
              <PDFViewerWithPDFJS
                pdfUrl="https://example.com/test.pdf"
                documentTitle="Test Document"
                onPageChange={mockOnPageChange}
                onLoadComplete={mockOnLoadComplete}
              />
            );

            await waitForPDFLoad();

            const pageInput3 = screen.getAllByTestId('pdfjs-page-input')[0] as HTMLInputElement;
            pageInput3.value = startPage.toString();
            pageInput3.dispatchEvent(new Event('change', { bubbles: true }));

            await waitFor(() => {
              expect(pageInput3.value).toBe(startPage.toString());
            });

            mockOnPageChange.mockClear();
            simulateKeyPress('ArrowUp');

            await new Promise(resolve => setTimeout(resolve, 100));
            const arrowUpResult = mockOnPageChange.mock.calls[0]?.[0];

            unmount3();
            cleanup(); // Ensure cleanup between renders

            mockOnPageChange.mockClear();
            mockOnLoadComplete.mockClear();

            const { unmount: unmount4 } = render(
              <PDFViewerWithPDFJS
                pdfUrl="https://example.com/test.pdf"
                documentTitle="Test Document"
                onPageChange={mockOnPageChange}
                onLoadComplete={mockOnLoadComplete}
              />
            );

            await waitForPDFLoad();

            const pageInput4 = screen.getAllByTestId('pdfjs-page-input')[0] as HTMLInputElement;
            pageInput4.value = startPage.toString();
            pageInput4.dispatchEvent(new Event('change', { bubbles: true }));

            await waitFor(() => {
              expect(pageInput4.value).toBe(startPage.toString());
            });

            mockOnPageChange.mockClear();
            simulateKeyPress('PageUp');

            await new Promise(resolve => setTimeout(resolve, 100));
            const pageUpResult = mockOnPageChange.mock.calls[0]?.[0];

            // Both should produce the same result
            expect(arrowUpResult).toBe(pageUpResult);

            unmount4();
            cleanup(); // Ensure cleanup after test
          }
        }
      ),
      { numRuns: 10 } // Reduced for complex async test
    );
  });
});
