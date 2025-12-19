/**
 * PDFViewerWithPDFJS Reliability Integration Tests
 * 
 * Tests the integration between PDFViewerWithPDFJS and ReliablePDFRenderer
 * for enhanced PDF rendering reliability features.
 * 
 * Requirements: 1.1, 1.2, 8.1, 5.1, 5.2, 5.3, 5.4
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PDFViewerWithPDFJS from '../PDFViewerWithPDFJS';
import { ReliablePDFRenderer } from '@/lib/pdf-reliability/reliable-pdf-renderer';
import { 
  RenderingMethod, 
  RenderingStage,
  type RenderResult, 
  type ProgressState, 
  type DiagnosticsData 
} from '@/lib/pdf-reliability/types';

// Mock modules
vi.mock('@/lib/pdfjs-config', () => ({
  initializePDFJS: vi.fn(),
  isPDFJSAvailable: vi.fn(() => true),
}));

vi.mock('@/lib/pdfjs-integration');
vi.mock('@/lib/pdfjs-memory');
vi.mock('@/lib/pdfjs-render-pipeline');

// Mock ReliablePDFRenderer
vi.mock('@/lib/pdf-reliability/reliable-pdf-renderer');

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
  default: ({ error, onRetry }: { error: string; onRetry: () => void }) => (
    <div data-testid="viewer-error">
      <p>{error}</p>
      <button onClick={onRetry} data-testid="retry-button">
        Retry
      </button>
    </div>
  ),
}));

describe('PDFViewerWithPDFJS Reliability Integration Tests', () => {
  let mockReliableRenderer: any;
  let mockRenderResult: RenderResult;
  let mockProgressState: ProgressState;
  let mockDiagnostics: DiagnosticsData;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock diagnostics
    mockDiagnostics = {
      renderingId: 'test-render-123',
      startTime: new Date(),
      endTime: new Date(),
      totalTime: 1500,
      method: RenderingMethod.PDFJS_CANVAS,
      stage: 'complete' as RenderingStage,
      errors: [],
      performanceMetrics: {
        memoryUsage: 50,
        networkTime: 800,
        parseTime: 200,
        renderTime: 500,
      },
      browserInfo: {
        userAgent: 'test-agent',
        platform: 'test-platform',
        language: 'en-US',
      },
    };

    // Create mock progress state
    mockProgressState = {
      percentage: 0,
      stage: 'initializing' as RenderingStage,
      bytesLoaded: 0,
      totalBytes: 0,
      timeElapsed: 0,
      isStuck: false,
      lastUpdate: new Date(),
    };

    // Create mock render result
    mockRenderResult = {
      success: true,
      renderingId: 'test-render-123',
      method: RenderingMethod.PDFJS_CANVAS,
      pages: [
        {
          pageNumber: 1,
          canvas: document.createElement('canvas'),
          viewport: { width: 800, height: 600, scale: 1.0, rotation: 0 },
          renderTime: 500,
        },
      ],
      diagnostics: mockDiagnostics,
    };

    // Create mock ReliablePDFRenderer instance
    mockReliableRenderer = {
      renderPDF: vi.fn().mockResolvedValue(mockRenderResult),
      retryRendering: vi.fn().mockResolvedValue(mockRenderResult),
      cancelRendering: vi.fn(),
      getProgress: vi.fn().mockReturnValue(mockProgressState),
      onProgressUpdate: vi.fn(),
      forceRetry: vi.fn(),
    };

    // Mock ReliablePDFRenderer constructor
    vi.mocked(ReliablePDFRenderer).mockImplementation(() => mockReliableRenderer);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test 1: ReliablePDFRenderer Integration
   * 
   * Tests that PDFViewerWithPDFJS successfully integrates with ReliablePDFRenderer
   * 
   * Requirements: 1.1, 1.2, 8.1
   */
  describe('ReliablePDFRenderer Integration', () => {
    it('should initialize ReliablePDFRenderer with correct configuration', async () => {
      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      // Wait for component to initialize
      await waitFor(() => {
        expect(ReliablePDFRenderer).toHaveBeenCalledWith({
          defaultTimeout: 30000,
          maxRetries: 3,
          enableFallbacks: true,
          enableDiagnostics: true,
          memoryPressureThreshold: 100,
          progressUpdateInterval: 500,
          stuckDetectionThreshold: 10000,
        });
      });
    });

    it('should call ReliablePDFRenderer.renderPDF with correct options', async () => {
      const watermark = {
        text: 'CONFIDENTIAL',
        opacity: 0.3,
        fontSize: 48,
      };

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          watermark={watermark}
        />
      );

      await waitFor(() => {
        expect(mockReliableRenderer.renderPDF).toHaveBeenCalledWith(
          'https://example.com/test.pdf',
          expect.objectContaining({
            timeout: 30000,
            preferredMethod: 'pdfjs-canvas' as RenderingMethod,
            fallbackEnabled: true,
            diagnosticsEnabled: true,
            watermark: expect.objectContaining({
              text: 'CONFIDENTIAL',
              opacity: 0.3,
              fontSize: 48,
              position: 'center',
            }),
          })
        );
      });
    });

    it('should handle successful rendering from ReliablePDFRenderer', async () => {
      const onLoadComplete = vi.fn();
      const onTotalPagesChange = vi.fn();

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          onLoadComplete={onLoadComplete}
          onTotalPagesChange={onTotalPagesChange}
        />
      );

      await waitFor(() => {
        expect(onLoadComplete).toHaveBeenCalledWith(1);
        expect(onTotalPagesChange).toHaveBeenCalledWith(1);
      });

      // Verify viewer container is rendered
      expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
    });

    it('should handle rendering failure from ReliablePDFRenderer', async () => {
      const failedResult: RenderResult = {
        success: false,
        renderingId: 'test-render-456',
        method: RenderingMethod.PDFJS_CANVAS,
        pages: [],
        error: {
          type: 'NETWORK_ERROR' as any,
          message: 'Network timeout occurred',
          stage: RenderingStage.FETCHING,
          method: RenderingMethod.PDFJS_CANVAS,
          timestamp: new Date(),
          context: {},
          recoverable: true,
        },
        diagnostics: mockDiagnostics,
      };

      mockReliableRenderer.renderPDF.mockResolvedValue(failedResult);

      const onError = vi.fn();

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Network timeout occurred',
          })
        );
      });

      // Verify error state is displayed
      expect(screen.getByText(/Failed to Load PDF/i)).toBeInTheDocument();
    });

    it('should fall back to legacy loading when ReliablePDFRenderer throws', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');

      // Mock ReliablePDFRenderer to throw
      mockReliableRenderer.renderPDF.mockRejectedValue(new Error('Renderer failed'));

      // Mock legacy loading to succeed
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: {
          numPages: 3,
          getPage: vi.fn(),
          destroy: vi.fn(),
        } as any,
        numPages: 3,
        loadTime: 1000,
      });

      vi.mocked(createMemoryManager).mockReturnValue({
        setPDFDocument: vi.fn(),
        destroy: vi.fn(),
      } as any);

      const onLoadComplete = vi.fn();

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          onLoadComplete={onLoadComplete}
        />
      );

      // Should fall back to legacy loading
      await waitFor(() => {
        expect(loadPDFDocument).toHaveBeenCalled();
        expect(onLoadComplete).toHaveBeenCalledWith(3);
      });
    });
  });

  /**
   * Test 2: Progress Tracking Integration
   * 
   * Tests that progress tracking works correctly with ReliablePDFRenderer
   * 
   * Requirements: 5.1, 5.2, 5.3
   */
  describe('Progress Tracking Integration', () => {
    it('should set up progress callback and display progress updates', async () => {
      let progressCallback: ((progress: ProgressState) => void) | undefined;

      mockReliableRenderer.onProgressUpdate.mockImplementation((renderingId: string, callback: any) => {
        progressCallback = callback;
      });

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      // Wait for progress callback to be set up
      await waitFor(() => {
        expect(mockReliableRenderer.onProgressUpdate).toHaveBeenCalledWith(
          'test-render-123',
          expect.any(Function)
        );
      });

      // Simulate progress updates
      if (progressCallback) {
        const progressUpdate: ProgressState = {
          percentage: 25,
          stage: RenderingStage.FETCHING,
          bytesLoaded: 2500,
          totalBytes: 10000,
          timeElapsed: 1000,
          isStuck: false,
          lastUpdate: new Date(),
        };

        progressCallback(progressUpdate);

        // Verify loading spinner shows progress
        await waitFor(() => {
          expect(screen.getByTestId('loading-spinner')).toHaveTextContent('Fetching... 25%');
        });
      }
    });

    it('should display detailed progress information', async () => {
      let progressCallback: ((progress: ProgressState) => void) | undefined;

      mockReliableRenderer.onProgressUpdate.mockImplementation((renderingId: string, callback: any) => {
        progressCallback = callback;
      });

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      await waitFor(() => {
        expect(mockReliableRenderer.onProgressUpdate).toHaveBeenCalled();
      });

      // Simulate detailed progress
      if (progressCallback) {
        const detailedProgress: ProgressState = {
          percentage: 60,
          stage: RenderingStage.RENDERING,
          bytesLoaded: 6000,
          totalBytes: 10000,
          timeElapsed: 3000,
          isStuck: false,
          lastUpdate: new Date(),
        };

        progressCallback(detailedProgress);

        await waitFor(() => {
          expect(screen.getByText('Stage: rendering')).toBeInTheDocument();
          expect(screen.getByText('Downloaded: 6 KB / 10 KB')).toBeInTheDocument();
          expect(screen.getByText('Time elapsed: 3s')).toBeInTheDocument();
        });
      }
    });

    it('should show force retry option when rendering is stuck', async () => {
      let progressCallback: ((progress: ProgressState) => void) | undefined;

      mockReliableRenderer.onProgressUpdate.mockImplementation((renderingId: string, callback: any) => {
        progressCallback = callback;
      });

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      await waitFor(() => {
        expect(mockReliableRenderer.onProgressUpdate).toHaveBeenCalled();
      });

      // Simulate stuck state
      if (progressCallback) {
        const stuckProgress: ProgressState = {
          percentage: 85,
          stage: RenderingStage.RENDERING,
          bytesLoaded: 8500,
          totalBytes: 10000,
          timeElapsed: 15000,
          isStuck: true,
          lastUpdate: new Date(),
        };

        progressCallback(stuckProgress);

        await waitFor(() => {
          expect(screen.getByText(/Loading appears stuck/i)).toBeInTheDocument();
          expect(screen.getByText('Force Retry')).toBeInTheDocument();
        });
      }
    });

    it('should call forceRetry when force retry button is clicked', async () => {
      let progressCallback: ((progress: ProgressState) => void) | undefined;

      mockReliableRenderer.onProgressUpdate.mockImplementation((renderingId: string, callback: any) => {
        progressCallback = callback;
      });

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      await waitFor(() => {
        expect(mockReliableRenderer.onProgressUpdate).toHaveBeenCalled();
      });

      // Simulate stuck state
      if (progressCallback) {
        const stuckProgress: ProgressState = {
          percentage: 85,
          stage: RenderingStage.RENDERING,
          bytesLoaded: 8500,
          totalBytes: 10000,
          timeElapsed: 15000,
          isStuck: true,
          lastUpdate: new Date(),
        };

        progressCallback(stuckProgress);

        await waitFor(() => {
          expect(screen.getByText('Force Retry')).toBeInTheDocument();
        });

        // Click force retry
        fireEvent.click(screen.getByText('Force Retry'));

        // Verify forceRetry was called
        expect(mockReliableRenderer.forceRetry).toHaveBeenCalledWith('test-render-123');
      }
    });
  });

  /**
   * Test 3: Error Handling Integration
   * 
   * Tests that error handling works correctly with ReliablePDFRenderer
   * 
   * Requirements: 1.4, 1.5, 2.1, 7.1, 7.2
   */
  describe('Error Handling Integration', () => {
    it('should display enhanced error information from diagnostics', async () => {
      const failedResult: RenderResult = {
        success: false,
        renderingId: 'test-render-789',
        method: RenderingMethod.PDFJS_CANVAS,
        pages: [],
        error: {
          type: 'TIMEOUT_ERROR' as any,
          message: 'Rendering timed out after 30 seconds',
          stage: RenderingStage.RENDERING,
          method: RenderingMethod.PDFJS_CANVAS,
          timestamp: new Date(),
          context: { timeout: 30000, attemptCount: 2 },
          recoverable: true,
        },
        diagnostics: {
          ...mockDiagnostics,
          errors: [
            {
              type: 'TIMEOUT_ERROR' as any,
              message: 'Rendering timed out after 30 seconds',
              stage: RenderingStage.RENDERING,
              method: RenderingMethod.PDFJS_CANVAS,
              timestamp: new Date(),
              context: { timeout: 30000, attemptCount: 2 },
              recoverable: true,
            },
          ],
          performanceMetrics: {
            memoryUsage: 150,
            networkTime: 5000,
            parseTime: 1000,
            renderTime: 30000,
          },
        },
      };

      mockReliableRenderer.renderPDF.mockResolvedValue(failedResult);

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to Load PDF/i)).toBeInTheDocument();
        expect(screen.getByText(/Rendering timed out after 30 seconds/i)).toBeInTheDocument();
      });
    });

    it('should cleanup ReliablePDFRenderer on unmount', async () => {
      const { unmount } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      // Wait for rendering to start
      await waitFor(() => {
        expect(mockReliableRenderer.renderPDF).toHaveBeenCalled();
      });

      // Unmount component
      unmount();

      // Verify cleanup was called
      expect(mockReliableRenderer.cancelRendering).toHaveBeenCalledWith('test-render-123');
    });

    it('should handle ReliablePDFRenderer initialization failure gracefully', async () => {
      // Mock ReliablePDFRenderer constructor to throw
      vi.mocked(ReliablePDFRenderer).mockImplementation(() => {
        throw new Error('Failed to initialize ReliablePDFRenderer');
      });

      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');

      // Mock legacy loading to succeed
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: {
          numPages: 2,
          getPage: vi.fn(),
          destroy: vi.fn(),
        } as any,
        numPages: 2,
        loadTime: 800,
      });

      vi.mocked(createMemoryManager).mockReturnValue({
        setPDFDocument: vi.fn(),
        destroy: vi.fn(),
      } as any);

      const onLoadComplete = vi.fn();

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          onLoadComplete={onLoadComplete}
        />
      );

      // Should fall back to legacy loading
      await waitFor(() => {
        expect(loadPDFDocument).toHaveBeenCalled();
        expect(onLoadComplete).toHaveBeenCalledWith(2);
      });
    });
  });

  /**
   * Test 4: Backward Compatibility
   * 
   * Tests that existing functionality continues to work with reliability features
   * 
   * Requirements: All
   */
  describe('Backward Compatibility', () => {
    it('should maintain existing watermark functionality', async () => {
      const watermark = {
        text: 'SAMPLE',
        opacity: 0.4,
        fontSize: 32,
      };

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          watermark={watermark}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('watermark')).toBeInTheDocument();
        expect(screen.getByText('SAMPLE')).toBeInTheDocument();
      });
    });

    it('should maintain existing DRM functionality', async () => {
      const { container } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          enableDRM={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
      });

      // Test that DRM styles are applied
      const viewerContainer = screen.getByTestId('pdfjs-viewer-container');
      expect(viewerContainer).toHaveStyle({ userSelect: 'none' });
    });

    it('should maintain existing navigation functionality', async () => {
      const onPageChange = vi.fn();

      const { container } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          onPageChange={onPageChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
      });

      // Test keyboard navigation still works
      fireEvent.keyDown(container, { key: 'ArrowRight' });

      // Note: Navigation behavior may be different with reliability features,
      // but the interface should remain the same
      expect(onPageChange).toHaveBeenCalled();
    });

    it('should maintain existing callback functionality', async () => {
      const onLoadComplete = vi.fn();
      const onTotalPagesChange = vi.fn();
      const onError = vi.fn();
      const onRenderComplete = vi.fn();

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          onLoadComplete={onLoadComplete}
          onTotalPagesChange={onTotalPagesChange}
          onError={onError}
          onRenderComplete={onRenderComplete}
        />
      );

      await waitFor(() => {
        expect(onLoadComplete).toHaveBeenCalled();
        expect(onTotalPagesChange).toHaveBeenCalled();
      });

      // Error callback should not be called on success
      expect(onError).not.toHaveBeenCalled();
    });
  });
});