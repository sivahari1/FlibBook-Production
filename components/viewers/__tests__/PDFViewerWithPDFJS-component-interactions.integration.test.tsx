/**
 * PDFViewerWithPDFJS Component Interactions Integration Tests
 * 
 * Tests interactions between PDFViewerWithPDFJS and parent components,
 * fallback to SimplePDFViewer scenarios, and memory manager integration.
 * 
 * Task 9.1: Write integration tests for component interactions
 * Requirements: 2.5
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PDFViewerWithPDFJS from '../PDFViewerWithPDFJS';
import SimplePDFViewer from '../SimplePDFViewer';
import type { PDFDocument, PDFPage } from '@/lib/types/pdfjs';

// Mock modules
vi.mock('@/lib/pdfjs-config', () => ({
  initializePDFJS: vi.fn(),
  isPDFJSAvailable: vi.fn(() => true),
}));

vi.mock('@/lib/pdfjs-integration');
vi.mock('@/lib/pdfjs-memory');
vi.mock('@/lib/pdfjs-render-pipeline');
vi.mock('@/lib/pdf-reliability/reliable-pdf-renderer');
vi.mock('@/lib/memory-management', () => ({
  memoryManager: {
    getInstance: vi.fn(),
  },
  MemoryManager: vi.fn(),
}));

// Mock child components
vi.mock('../WatermarkOverlay', () => ({
  default: ({ text, opacity }: { text: string; opacity: number }) => (
    <div data-testid="watermark" data-text={text} data-opacity={opacity}>
      {text}
    </div>
  ),
}));

vi.mock('../LoadingSpinner', () => ({
  default: ({ message }: { message: string }) => (
    <div data-testid="loading-spinner">{message}</div>
  ),
}));

vi.mock('../ViewerError', () => ({
  default: ({ error, onRetry }: { error: string; onRetry?: () => void }) => (
    <div data-testid="viewer-error">
      <span>{error}</span>
      {onRetry && (
        <button data-testid="retry-button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  ),
}));

/**
 * Helper to create mock PDF document
 */
function createMockPDFDocument(numPages: number = 5): PDFDocument {
  const pages = new Map<number, PDFPage>();
  
  for (let i = 1; i <= numPages; i++) {
    const mockPage: PDFPage = {
      pageNumber: i,
      getViewport: vi.fn((params: { scale: number }) => ({
        width: 800 * params.scale,
        height: 600 * params.scale,
        scale: params.scale,
        rotation: 0,
      })),
      render: vi.fn(() => ({
        promise: Promise.resolve(),
        cancel: vi.fn(),
      })),
      cleanup: vi.fn(),
    } as any;
    
    pages.set(i, mockPage);
  }
  
  return {
    numPages,
    getPage: vi.fn((pageNum: number) => Promise.resolve(pages.get(pageNum)!)),
    destroy: vi.fn(),
    fingerprints: ['test-fingerprint'],
  } as any;
}

/**
 * Mock parent component that uses PDFViewerWithPDFJS
 */
const MockParentComponent: React.FC<{
  pdfUrl: string;
  onLoadComplete?: (numPages: number) => void;
  onError?: (error: Error) => void;
  onPageChange?: (page: number) => void;
  enableFallback?: boolean;
}> = ({ pdfUrl, onLoadComplete, onError, onPageChange, enableFallback = false }) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(0);
  const [hasError, setHasError] = React.useState(false);
  const [useFallback, setUseFallback] = React.useState(enableFallback);

  const handleLoadComplete = React.useCallback((numPages: number) => {
    setTotalPages(numPages);
    onLoadComplete?.(numPages);
  }, [onLoadComplete]);

  const handleError = React.useCallback((error: Error) => {
    setHasError(true);
    if (enableFallback) {
      setUseFallback(true);
    }
    onError?.(error);
  }, [onError, enableFallback]);

  const handlePageChange = React.useCallback((page: number) => {
    setCurrentPage(page);
    onPageChange?.(page);
  }, [onPageChange]);

  return (
    <div data-testid="parent-component">
      <div data-testid="parent-controls">
        <span data-testid="page-info">
          Page {currentPage} of {totalPages}
        </span>
        {hasError && <span data-testid="error-indicator">Error occurred</span>}
        {useFallback && <span data-testid="fallback-indicator">Using fallback</span>}
      </div>
      
      {useFallback ? (
        <SimplePDFViewer
          pdfUrl={pdfUrl}
          documentTitle="Test Document"
          onError={handleError}
        />
      ) : (
        <PDFViewerWithPDFJS
          pdfUrl={pdfUrl}
          documentTitle="Test Document"
          onLoadComplete={handleLoadComplete}
          onError={handleError}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

describe('PDFViewerWithPDFJS Component Interactions Integration Tests', () => {
  let mockDocument: PDFDocument;
  let mockMemoryManager: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDocument = createMockPDFDocument(5);

    // Mock memory manager
    mockMemoryManager = {
      setPDFDocument: vi.fn(),
      addRenderedPage: vi.fn(),
      addPageObject: vi.fn(),
      prioritizePages: vi.fn(() => [1]),
      removeNonPriorityPages: vi.fn(),
      destroy: vi.fn(),
      getStatistics: vi.fn(() => ({
        memoryInfo: { percentage: 0.5 },
        cacheSize: 10,
        cacheHitRatio: 0.8,
      })),
    };

    const { memoryManager: mockMemoryManagerModule } = await import('@/lib/memory-management');
    vi.mocked(mockMemoryManagerModule.getInstance).mockReturnValue(mockMemoryManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test 1: Parent Component Communication
   * Tests interactions between PDFViewerWithPDFJS and parent components
   * Requirements: 2.5
   */
  describe('Parent Component Communication', () => {
    it('should communicate loading state changes to parent', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');

      // Mock successful PDF loading
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });

      vi.mocked(createMemoryManager).mockReturnValue(mockMemoryManager);

      vi.mocked(getGlobalRenderPipeline).mockReturnValue({
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      } as any);

      const onLoadComplete = vi.fn();
      const onError = vi.fn();
      const onPageChange = vi.fn();

      render(
        <MockParentComponent
          pdfUrl="https://example.com/test.pdf"
          onLoadComplete={onLoadComplete}
          onError={onError}
          onPageChange={onPageChange}
        />
      );

      // Should show loading initially
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Wait for PDF to load
      await waitFor(() => {
        expect(onLoadComplete).toHaveBeenCalledWith(5);
      });

      // Parent should display updated page info
      await waitFor(() => {
        expect(screen.getByTestId('page-info')).toHaveTextContent('Page 1 of 5');
      });

      // Should not show error indicator
      expect(screen.queryByTestId('error-indicator')).not.toBeInTheDocument();
    });

    it('should propagate page changes to parent component', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');

      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });

      vi.mocked(createMemoryManager).mockReturnValue(mockMemoryManager);

      const mockPipeline = {
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      };
      vi.mocked(getGlobalRenderPipeline).mockReturnValue(mockPipeline as any);

      const onPageChange = vi.fn();

      const { container } = render(
        <MockParentComponent
          pdfUrl="https://example.com/test.pdf"
          onPageChange={onPageChange}
        />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('page-info')).toHaveTextContent('Page 1 of 5');
      });

      // Simulate page navigation
      fireEvent.keyDown(container, { key: 'ArrowRight' });

      // Wait for page change
      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(2);
      });

      // Parent should update page display
      await waitFor(() => {
        expect(screen.getByTestId('page-info')).toHaveTextContent('Page 2 of 5');
      });
    });

    it('should handle error propagation to parent component', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');

      // Mock PDF loading failure
      const testError = new Error('Failed to load PDF');
      vi.mocked(loadPDFDocument).mockRejectedValue(testError);

      const onError = vi.fn();

      render(
        <MockParentComponent
          pdfUrl="https://example.com/invalid.pdf"
          onError={onError}
        />
      );

      // Wait for error to propagate
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(testError);
      });

      // Parent should show error indicator
      expect(screen.getByTestId('error-indicator')).toBeInTheDocument();
    });

    it('should handle dynamic prop changes from parent', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');

      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });

      vi.mocked(createMemoryManager).mockReturnValue(mockMemoryManager);

      const { rerender } = render(
        <MockParentComponent pdfUrl="https://example.com/doc1.pdf" />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(loadPDFDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            source: 'https://example.com/doc1.pdf',
          })
        );
      });

      // Change PDF URL
      rerender(
        <MockParentComponent pdfUrl="https://example.com/doc2.pdf" />
      );

      // Should load new document
      await waitFor(() => {
        expect(loadPDFDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            source: 'https://example.com/doc2.pdf',
          })
        );
      });
    });
  });

  /**
   * Test 2: SimplePDFViewer Fallback Scenarios
   * Tests fallback to SimplePDFViewer when PDFViewerWithPDFJS fails
   * Requirements: 2.5
   */
  describe('SimplePDFViewer Fallback Scenarios', () => {
    it('should fallback to SimplePDFViewer on ReliablePDFRenderer failure', async () => {
      const { ReliablePDFRenderer } = await import('@/lib/pdf-reliability/reliable-pdf-renderer');

      // Mock ReliablePDFRenderer failure
      const mockRenderer = {
        renderPDF: vi.fn().mockRejectedValue(new Error('Reliable renderer failed')),
        cancelRendering: vi.fn(),
        onProgressUpdate: vi.fn(),
      };
      vi.mocked(ReliablePDFRenderer).mockImplementation(() => mockRenderer as any);

      render(
        <MockParentComponent
          pdfUrl="https://example.com/test.pdf"
          enableFallback={true}
        />
      );

      // Wait for fallback to trigger
      await waitFor(() => {
        expect(screen.getByTestId('fallback-indicator')).toBeInTheDocument();
      });

      // Should render SimplePDFViewer
      // Note: We can't directly test SimplePDFViewer rendering due to mocking,
      // but we can verify the fallback indicator is shown
      expect(screen.getByText('Using fallback')).toBeInTheDocument();
    });

    it('should fallback to SimplePDFViewer on PDF.js unavailability', async () => {
      const { isPDFJSAvailable } = await import('@/lib/pdfjs-config');

      // Mock PDF.js as unavailable
      vi.mocked(isPDFJSAvailable).mockReturnValue(false);

      render(
        <MockParentComponent
          pdfUrl="https://example.com/test.pdf"
          enableFallback={true}
        />
      );

      // Wait for fallback to trigger
      await waitFor(() => {
        expect(screen.getByTestId('fallback-indicator')).toBeInTheDocument();
      });

      // Should show fallback indicator
      expect(screen.getByText('Using fallback')).toBeInTheDocument();
    });

    it('should maintain state consistency during fallback transition', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');

      // Mock initial failure then success on retry
      let attemptCount = 0;
      vi.mocked(loadPDFDocument).mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Initial failure');
        }
        return {
          document: mockDocument,
          numPages: 5,
          loadTime: 1000,
        };
      });

      const onError = vi.fn();
      const onLoadComplete = vi.fn();

      const { rerender } = render(
        <MockParentComponent
          pdfUrl="https://example.com/test.pdf"
          onError={onError}
          onLoadComplete={onLoadComplete}
          enableFallback={true}
        />
      );

      // Wait for initial error and fallback
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
        expect(screen.getByTestId('fallback-indicator')).toBeInTheDocument();
      });

      // Retry with main viewer
      rerender(
        <MockParentComponent
          pdfUrl="https://example.com/test.pdf"
          onError={onError}
          onLoadComplete={onLoadComplete}
          enableFallback={false}
        />
      );

      // Should succeed on retry
      await waitFor(() => {
        expect(onLoadComplete).toHaveBeenCalledWith(5);
      });

      // Should not show fallback indicator
      expect(screen.queryByTestId('fallback-indicator')).not.toBeInTheDocument();
    });

    it('should handle SimplePDFViewer errors gracefully', async () => {
      // Mock SimplePDFViewer to throw error
      vi.doMock('../SimplePDFViewer', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            const fallbackError = new Error('SimplePDFViewer failed');
            if (onError) {
              setTimeout(() => onError(fallbackError), 100);
            }
          }, [onError]);

          return <div data-testid="simple-viewer-error">SimplePDFViewer Error</div>;
        },
      }));

      const onError = vi.fn();

      render(
        <MockParentComponent
          pdfUrl="https://example.com/test.pdf"
          onError={onError}
          enableFallback={true}
        />
      );

      // Wait for fallback error
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'SimplePDFViewer failed',
          })
        );
      });

      // Should show error indicator
      expect(screen.getByTestId('error-indicator')).toBeInTheDocument();
    });
  });

  /**
   * Test 3: Memory Manager Integration
   * Tests integration with memory management system
   * Requirements: 2.5
   */
  describe('Memory Manager Integration', () => {
    it('should initialize memory manager with PDF document', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');

      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });

      vi.mocked(createMemoryManager).mockReturnValue(mockMemoryManager);

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      // Wait for PDF to load
      await waitFor(() => {
        expect(mockMemoryManager.setPDFDocument).toHaveBeenCalledWith(mockDocument);
      });

      // Memory manager should be initialized
      expect(createMemoryManager).toHaveBeenCalled();
    });

    it('should handle memory pressure during rendering', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');

      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });

      // Mock memory manager with high memory usage
      const highMemoryManager = {
        ...mockMemoryManager,
        getStatistics: vi.fn(() => ({
          memoryInfo: { percentage: 0.9 }, // High memory usage
          cacheSize: 50,
          cacheHitRatio: 0.6,
        })),
      };

      vi.mocked(createMemoryManager).mockReturnValue(highMemoryManager);

      const mockPipeline = {
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        clearCache: vi.fn(),
        destroy: vi.fn(),
      };
      vi.mocked(getGlobalRenderPipeline).mockReturnValue(mockPipeline as any);

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          viewMode="continuous"
        />
      );

      // Wait for PDF to load
      await waitFor(() => {
        expect(highMemoryManager.setPDFDocument).toHaveBeenCalled();
      });

      // Should handle memory pressure by prioritizing pages
      expect(highMemoryManager.prioritizePages).toHaveBeenCalled();
    });

    it('should clean up memory manager on unmount', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');

      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });

      vi.mocked(createMemoryManager).mockReturnValue(mockMemoryManager);

      const { unmount } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      // Wait for initialization
      await waitFor(() => {
        expect(mockMemoryManager.setPDFDocument).toHaveBeenCalled();
      });

      // Unmount component
      unmount();

      // Should clean up memory manager
      await waitFor(() => {
        expect(mockMemoryManager.destroy).toHaveBeenCalled();
      });
    });

    it('should optimize page loading based on memory constraints', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');

      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 10, // Larger document
        loadTime: 1000,
      });

      // Mock memory manager with limited capacity
      const limitedMemoryManager = {
        ...mockMemoryManager,
        prioritizePages: vi.fn((visiblePages, totalPages) => {
          // Return only visible pages under memory pressure
          return visiblePages.slice(0, 3); // Limit to 3 pages
        }),
        removeNonPriorityPages: vi.fn(),
      };

      vi.mocked(createMemoryManager).mockReturnValue(limitedMemoryManager);

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/large-test.pdf"
          documentTitle="Large Test Document"
          viewMode="continuous"
        />
      );

      // Wait for PDF to load
      await waitFor(() => {
        expect(limitedMemoryManager.setPDFDocument).toHaveBeenCalled();
      });

      // Should prioritize pages based on memory constraints
      expect(limitedMemoryManager.prioritizePages).toHaveBeenCalled();
      expect(limitedMemoryManager.removeNonPriorityPages).toHaveBeenCalled();
    });
  });

  /**
   * Test 4: Component Lifecycle Integration
   * Tests component lifecycle interactions and cleanup
   * Requirements: 2.5
   */
  describe('Component Lifecycle Integration', () => {
    it('should handle rapid mount/unmount cycles gracefully', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');

      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });

      vi.mocked(createMemoryManager).mockReturnValue(mockMemoryManager);

      // Mount and unmount rapidly
      for (let i = 0; i < 3; i++) {
        const { unmount } = render(
          <PDFViewerWithPDFJS
            pdfUrl={`https://example.com/test-${i}.pdf`}
            documentTitle={`Test Document ${i}`}
          />
        );

        // Quick unmount
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });

        unmount();
      }

      // Should handle cleanup properly
      expect(mockMemoryManager.destroy).toHaveBeenCalledTimes(3);
    });

    it('should prevent state updates after unmount', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');

      // Mock delayed PDF loading
      vi.mocked(loadPDFDocument).mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => {
            resolve({
              document: mockDocument,
              numPages: 5,
              loadTime: 1000,
            });
          }, 1000);
        })
      );

      const onLoadComplete = vi.fn();
      const onError = vi.fn();

      const { unmount } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/delayed.pdf"
          documentTitle="Delayed Document"
          onLoadComplete={onLoadComplete}
          onError={onError}
        />
      );

      // Unmount before loading completes
      unmount();

      // Wait for delayed loading to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1200));
      });

      // Should not call callbacks after unmount
      expect(onLoadComplete).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle concurrent component instances', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');

      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });

      // Create separate memory managers for each instance
      const memoryManager1 = { ...mockMemoryManager };
      const memoryManager2 = { ...mockMemoryManager };

      vi.mocked(createMemoryManager)
        .mockReturnValueOnce(memoryManager1)
        .mockReturnValueOnce(memoryManager2);

      // Render two instances concurrently
      const { container: container1 } = render(
        <div data-testid="instance-1">
          <PDFViewerWithPDFJS
            pdfUrl="https://example.com/doc1.pdf"
            documentTitle="Document 1"
          />
        </div>
      );

      const { container: container2 } = render(
        <div data-testid="instance-2">
          <PDFViewerWithPDFJS
            pdfUrl="https://example.com/doc2.pdf"
            documentTitle="Document 2"
          />
        </div>
      );

      // Wait for both to load
      await waitFor(() => {
        expect(memoryManager1.setPDFDocument).toHaveBeenCalled();
        expect(memoryManager2.setPDFDocument).toHaveBeenCalled();
      });

      // Both instances should be independent
      expect(screen.getByTestId('instance-1')).toBeInTheDocument();
      expect(screen.getByTestId('instance-2')).toBeInTheDocument();
    });
  });

  /**
   * Test 5: Error Recovery Integration
   * Tests error recovery mechanisms in component interactions
   * Requirements: 2.5
   */
  describe('Error Recovery Integration', () => {
    it('should coordinate error recovery between components', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');

      let attemptCount = 0;
      vi.mocked(loadPDFDocument).mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Temporary failure');
        }
        return {
          document: mockDocument,
          numPages: 5,
          loadTime: 1000,
        };
      });

      const onError = vi.fn();
      const onLoadComplete = vi.fn();

      const { rerender } = render(
        <MockParentComponent
          pdfUrl="https://example.com/recovery-test.pdf"
          onError={onError}
          onLoadComplete={onLoadComplete}
        />
      );

      // Wait for initial error
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Temporary failure',
          })
        );
      });

      // Trigger retry by re-rendering
      rerender(
        <MockParentComponent
          pdfUrl="https://example.com/recovery-test.pdf"
          onError={onError}
          onLoadComplete={onLoadComplete}
        />
      );

      // Should succeed on retry
      await waitFor(() => {
        expect(onLoadComplete).toHaveBeenCalledWith(5);
      });

      // Should have attempted twice
      expect(attemptCount).toBe(2);
    });

    it('should handle cascading failures across components', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');

      // Mock PDF loading success but memory manager failure
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });

      const failingMemoryManager = {
        ...mockMemoryManager,
        setPDFDocument: vi.fn(() => {
          throw new Error('Memory manager failure');
        }),
      };

      vi.mocked(createMemoryManager).mockReturnValue(failingMemoryManager);

      const onError = vi.fn();

      render(
        <MockParentComponent
          pdfUrl="https://example.com/cascade-test.pdf"
          onError={onError}
        />
      );

      // Should handle memory manager failure
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Memory manager failure'),
          })
        );
      });
    });
  });
});