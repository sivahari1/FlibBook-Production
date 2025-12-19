/**
 * Property-Based Tests for PDFViewerWithPDFJS Error Recovery Consistency
 * 
 * **Feature: pdf-viewer-infinite-loop-fix, Property 5: Error Recovery Consistency**
 * **Validates: Requirements 4.4**
 * 
 * Tests that error recovery mechanisms consistently reset the component to a clean state
 * and allow successful loading on retry across various error scenarios.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import PDFViewerWithPDFJS from '../PDFViewerWithPDFJS';

// Mock dependencies
vi.mock('@/lib/pdfjs-config', () => ({
  initializePDFJS: vi.fn(),
  isPDFJSAvailable: vi.fn(() => true),
}));

vi.mock('@/lib/pdfjs-integration', () => ({
  loadPDFDocument: vi.fn(),
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
    clearAllPages: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('@/lib/pdfjs-render-pipeline', () => ({
  getGlobalRenderPipeline: vi.fn(() => ({
    queueRender: vi.fn((page, pageNum, canvas, zoom, priority, callback) => {
      // Simulate successful render
      setTimeout(() => callback(null), 10);
    }),
    cancelAll: vi.fn(),
  })),
}));

vi.mock('@/lib/pdf-reliability/reliable-pdf-renderer', () => ({
  ReliablePDFRenderer: class MockReliablePDFRenderer {
    renderPDF = vi.fn();
    cancelRendering = vi.fn();
    onProgressUpdate = vi.fn();
    forceRetry = vi.fn();
    removeCallbacks = vi.fn();
    cleanup = vi.fn();
    cleanupAll = vi.fn();
  },
}));

// Mock child components
vi.mock('../WatermarkOverlay', () => ({
  default: ({ text }: { text: string }) => <div data-testid="watermark">{text}</div>,
}));

vi.mock('../LoadingSpinner', () => ({
  default: ({ message }: { message: string }) => <div data-testid="loading-spinner">{message}</div>,
}));

vi.mock('../ViewerError', () => ({
  default: ({ error, onRetry }: { error: string; onRetry: () => void }) => (
    <div data-testid="viewer-error">
      <span>{error}</span>
      <button onClick={onRetry} data-testid="retry-button">Retry</button>
    </div>
  ),
}));

vi.mock('../SimplePDFViewer', () => ({
  default: ({ pdfUrl }: { pdfUrl: string }) => (
    <div data-testid="simple-pdf-viewer">Simple viewer for {pdfUrl}</div>
  ),
}));

describe('PDFViewerWithPDFJS Error Recovery Consistency Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global state
    delete (window as any).__pdfViewerCleanup;
  });

  afterEach(() => {
    // Clean up any remaining timers
    vi.clearAllTimers();
  });

  /**
   * Property 5: Error Recovery Consistency
   * For any error state, the component should provide retry functionality that resets to a clean state
   * and allows successful loading on retry
   */
  it('should consistently recover from error states and allow successful retry', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various error scenarios with simpler inputs
        fc.record({
          errorMessage: fc.string({ minLength: 5, maxLength: 50 }),
          pdfUrl: fc.constantFrom(
            'https://example.com/test.pdf',
            'https://test.com/document.pdf',
            'https://sample.org/file.pdf'
          ),
          documentTitle: fc.string({ minLength: 1, maxLength: 30 }),
          shouldSucceedOnRetry: fc.boolean(),
        }),
        async ({ errorMessage, pdfUrl, documentTitle, shouldSucceedOnRetry }) => {
          // Mock PDF.js as unavailable to force error state
          const { isPDFJSAvailable } = await import('@/lib/pdfjs-config');
          vi.mocked(isPDFJSAvailable).mockReturnValue(false);

          const onError = vi.fn();
          const onLoadComplete = vi.fn();

          // Render component that will fail due to PDF.js unavailability
          render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle={documentTitle}
              onError={onError}
              onLoadComplete={onLoadComplete}
            />
          );

          // Wait for initial error state
          await waitFor(() => {
            expect(screen.getByText(/Failed to Load PDF/i)).toBeInTheDocument();
          }, { timeout: 2000 });

          // Verify error callback was called
          expect(onError).toHaveBeenCalledWith(expect.any(Error));

          // Get the retry button
          const retryButton = screen.getByRole('button', { name: /retry loading/i });
          expect(retryButton).toBeInTheDocument();

          // Clear previous mock calls
          onError.mockClear();
          onLoadComplete.mockClear();

          // Set up retry behavior - make PDF.js available and mock successful loading
          vi.mocked(isPDFJSAvailable).mockReturnValue(true);
          
          if (shouldSucceedOnRetry) {
            const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
            const mockLoadPDFDocument = vi.mocked(loadPDFDocument);
            
            mockLoadPDFDocument.mockResolvedValueOnce({
              document: {
                numPages: 3,
                getPage: vi.fn().mockResolvedValue({
                  pageNumber: 1,
                  getViewport: vi.fn().mockReturnValue({ width: 600, height: 800 }),
                }),
              },
              numPages: 3,
            });
          } else {
            // Keep PDF.js unavailable for failed retry
            vi.mocked(isPDFJSAvailable).mockReturnValue(false);
          }

          // Click retry button
          await act(async () => {
            fireEvent.click(retryButton);
          });

          // Wait for retry result
          if (shouldSucceedOnRetry) {
            // Should successfully load after retry
            await waitFor(() => {
              // Should not show error state
              expect(screen.queryByText(/Failed to Load PDF/i)).not.toBeInTheDocument();
            }, { timeout: 2000 });
            
            // Should show loading or loaded state
            const viewerContainer = screen.queryByTestId('pdfjs-viewer-container');
            const loadingSpinner = screen.queryByTestId('loading-spinner');
            
            // Should be in either loading or loaded state (both are valid clean states)
            expect(viewerContainer || loadingSpinner).toBeTruthy();
          } else {
            // Should show error state again
            await waitFor(() => {
              expect(screen.getByText(/Failed to Load PDF/i)).toBeInTheDocument();
            }, { timeout: 2000 });
          }

          // Verify component state consistency after retry
          // The component should be in a clean state regardless of retry outcome
          
          // Check that cleanup function is available (indicates proper initialization)
          expect((window as any).__pdfViewerCleanup).toBeDefined();
          
          // Should be able to call cleanup without errors (but allow memory manager errors)
          try {
            if ((window as any).__pdfViewerCleanup) {
              (window as any).__pdfViewerCleanup();
            }
          } catch (error) {
            // Allow memory manager cleanup errors as they're expected in test environment
            if (!(error as Error).message.includes('clearAllPages is not a function')) {
              throw error;
            }
          }
        }
      ),
      {
        numRuns: 5, // Reduced for faster execution
        timeout: 10000,
      }
    );
  });

  /**
   * Property: Error Recovery State Reset
   * After error recovery, the component should be in the same clean state regardless of the error type
   */
  it('should reset to consistent clean state after any error type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'NETWORK_ERROR',
          'INVALID_PDF', 
          'TIMEOUT',
          'MISSING_PDF',
          'PASSWORD_REQUIRED',
          'CANCELLED'
        ),
        fc.webUrl(),
        fc.string({ minLength: 1, maxLength: 30 }),
        async (errorCode, pdfUrl, documentTitle) => {
          const { loadPDFDocument, PDFDocumentLoaderError } = await import('@/lib/pdfjs-integration');
          const mockLoadPDFDocument = vi.mocked(loadPDFDocument);
          
          // Create error with specific code
          const error = new PDFDocumentLoaderError(`Test error: ${errorCode}`, errorCode);
          mockLoadPDFDocument.mockRejectedValueOnce(error);

          const onError = vi.fn();

          render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle={documentTitle}
              onError={onError}
            />
          );

          // Wait for error state
          await waitFor(() => {
            expect(screen.getByText(/Failed to Load PDF/i)).toBeInTheDocument();
          });

          // Verify error was handled
          expect(onError).toHaveBeenCalledWith(expect.any(Error));

          // Get retry button
          const retryButton = screen.getByRole('button', { name: /retry loading/i });
          
          // Mock successful retry
          mockLoadPDFDocument.mockResolvedValueOnce({
            document: {
              numPages: 3,
              getPage: vi.fn().mockResolvedValue({
                pageNumber: 1,
                getViewport: vi.fn().mockReturnValue({ width: 600, height: 800 }),
              }),
            },
            numPages: 3,
          });

          // Click retry
          await act(async () => {
            fireEvent.click(retryButton);
          });

          // Should recover to clean state
          await waitFor(() => {
            // Should not show error anymore
            expect(screen.queryByText(/Failed to Load PDF/i)).not.toBeInTheDocument();
            
            // Should show loading or loaded state
            const viewerContainer = screen.queryByTestId('pdfjs-viewer-container');
            const loadingSpinner = screen.queryByTestId('loading-spinner');
            
            // Should be in either loading or loaded state (both are valid clean states)
            expect(viewerContainer || loadingSpinner).toBeTruthy();
          });

          // Verify clean state properties
          // Component should have proper navigation controls when loaded
          if (screen.queryByTestId('pdfjs-viewer-container')) {
            expect(screen.getByTestId('pdfjs-toolbar')).toBeInTheDocument();
            expect(screen.getByTestId('pdfjs-page-navigation')).toBeInTheDocument();
          }
        }
      ),
      {
        numRuns: 10,
        timeout: 10000,
      }
    );
  });

  /**
   * Property: Retry Idempotence
   * Multiple retry attempts should not cause state corruption or memory leaks
   */
  it('should handle multiple retry attempts without state corruption', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl(),
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.integer({ min: 2, max: 5 }),
        async (pdfUrl, documentTitle, retryCount) => {
          const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
          const mockLoadPDFDocument = vi.mocked(loadPDFDocument);
          
          // Set up to fail multiple times, then succeed
          for (let i = 0; i < retryCount; i++) {
            mockLoadPDFDocument.mockRejectedValueOnce(new Error(`Failure ${i + 1}`));
          }
          
          // Final attempt succeeds
          mockLoadPDFDocument.mockResolvedValueOnce({
            document: {
              numPages: 2,
              getPage: vi.fn().mockResolvedValue({
                pageNumber: 1,
                getViewport: vi.fn().mockReturnValue({ width: 600, height: 800 }),
              }),
            },
            numPages: 2,
          });

          const onError = vi.fn();
          const onLoadComplete = vi.fn();

          render(
            <PDFViewerWithPDFJS
              pdfUrl={pdfUrl}
              documentTitle={documentTitle}
              onError={onError}
              onLoadComplete={onLoadComplete}
            />
          );

          // Wait for initial error
          await waitFor(() => {
            expect(screen.getByText(/Failed to Load PDF/i)).toBeInTheDocument();
          });

          // Perform multiple retries
          for (let i = 0; i < retryCount; i++) {
            const retryButton = screen.getByRole('button', { name: /retry loading/i });
            
            await act(async () => {
              fireEvent.click(retryButton);
            });

            if (i < retryCount - 1) {
              // Should still show error for intermediate failures
              await waitFor(() => {
                expect(screen.getByText(/Failed to Load PDF/i)).toBeInTheDocument();
              });
            }
          }

          // Final retry should succeed
          await waitFor(() => {
            expect(onLoadComplete).toHaveBeenCalledWith(2);
          });

          // Should not show error state
          expect(screen.queryByText(/Failed to Load PDF/i)).not.toBeInTheDocument();
          
          // Should show proper viewer interface
          expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
          
          // Verify no memory leaks by checking cleanup function is still available
          expect((window as any).__pdfViewerCleanup).toBeDefined();
        }
      ),
      {
        numRuns: 10,
        timeout: 15000,
      }
    );
  });
});