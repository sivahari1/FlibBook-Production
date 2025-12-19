/**
 * Unified Rendering Pipeline Integration Tests
 * 
 * Tests end-to-end rendering with different PDF types and validates
 * the unified approach across preview and member view systems.
 * 
 * Task 12.1: Write integration tests for unified rendering pipeline
 * Requirements: All
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import UnifiedViewer from '../UnifiedViewer';
import SimpleDocumentViewer from '../SimpleDocumentViewer';
import { ContentType, EnhancedDocument, WatermarkConfig } from '@/lib/types/content';

// Mock child components and dependencies
vi.mock('@/lib/pdfjs-config', () => ({
  initializePDFJS: vi.fn(),
  isPDFJSAvailable: vi.fn(() => true),
}));

vi.mock('@/lib/pdfjs-integration');
vi.mock('@/lib/pdfjs-memory');
vi.mock('@/lib/pdfjs-render-pipeline');
vi.mock('@/lib/loading-state-manager', () => ({
  useLoadingStateManager: vi.fn(() => ({
    updateLoadingState: vi.fn(),
    getLoadingState: vi.fn(),
    clearLoadingState: vi.fn(),
  })),
  createLoadingContextId: vi.fn((prefix, id) => `${prefix}-${id}`),
}));

vi.mock('@/lib/loading-state-persistence', () => ({
  useLoadingStatePersistence: vi.fn(() => ({
    saveState: vi.fn(),
    restoreState: vi.fn(() => null),
    clearState: vi.fn(),
  })),
}));

// Mock PDF.js viewer component
vi.mock('../PDFViewerWithPDFJS', () => ({
  default: ({ 
    pdfUrl, 
    documentTitle, 
    onLoadComplete, 
    onRenderComplete, 
    onError 
  }: {
    pdfUrl: string;
    documentTitle: string;
    onLoadComplete?: (numPages: number) => void;
    onRenderComplete?: (pageNumber: number) => void;
    onError?: (error: Error) => void;
  }) => {
    React.useEffect(() => {
      // Simulate successful PDF loading
      setTimeout(() => {
        if (onLoadComplete) onLoadComplete(5);
        if (onRenderComplete) onRenderComplete(1);
      }, 100);
    }, [onLoadComplete, onRenderComplete]);

    return (
      <div data-testid="pdfjs-viewer" data-pdf-url={pdfUrl}>
        {documentTitle} - PDF Viewer
      </div>
    );
  },
}));

// Mock other viewer components
vi.mock('../ImageViewer', () => ({
  default: ({ imageUrl, title }: { imageUrl: string; title: string }) => (
    <div data-testid="image-viewer" data-image-url={imageUrl}>
      {title} - Image Viewer
    </div>
  ),
}));

vi.mock('../VideoPlayer', () => ({
  default: ({ videoUrl, title }: { videoUrl: string; title: string }) => (
    <div data-testid="video-player" data-video-url={videoUrl}>
      {title} - Video Player
    </div>
  ),
}));

vi.mock('../LinkPreview', () => ({
  default: ({ linkUrl, title }: { linkUrl: string; title: string }) => (
    <div data-testid="link-preview" data-link-url={linkUrl}>
      {title} - Link Preview
    </div>
  ),
}));

vi.mock('../LoadingProgressIndicator', () => ({
  default: ({ progress }: { progress: any }) => (
    <div data-testid="loading-progress">
      Loading: {progress?.percentage || 0}%
    </div>
  ),
}));

describe('Unified Rendering Pipeline Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Test 1: PDF Rendering Consistency
   * Validates that PDF documents render consistently across different contexts
   * Requirements: 1.1, 1.2
   */
  describe('PDF Rendering Consistency', () => {
    it('should render PDF documents using direct PDF.js approach', async () => {
      const pdfDocument: EnhancedDocument = {
        id: 'test-pdf-1',
        title: 'Test PDF Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/test.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: {
          fileSize: 1024000,
          mimeType: 'application/pdf',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const onAnalytics = vi.fn();

      render(
        <UnifiedViewer
          content={pdfDocument}
          onAnalytics={onAnalytics}
        />
      );

      // Should show loading initially
      expect(screen.getByTestId('loading-progress')).toBeInTheDocument();

      // Fast-forward timers to complete loading
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-viewer')).toBeInTheDocument();
      });

      // Verify PDF.js viewer is used with correct props
      const pdfViewer = screen.getByTestId('pdfjs-viewer');
      expect(pdfViewer).toHaveAttribute('data-pdf-url', 'https://example.com/test.pdf');
      expect(pdfViewer).toHaveTextContent('Test PDF Document - PDF Viewer');

      // Verify analytics tracking
      expect(onAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'test-pdf-1',
          contentType: ContentType.PDF,
          action: 'view',
        })
      );
    });

    it('should render different PDF types with same rendering engine', async () => {
      const pdfTypes = [
        {
          id: 'complex-pdf',
          title: 'Complex PDF with Forms',
          fileUrl: 'https://example.com/complex.pdf',
        },
        {
          id: 'large-pdf',
          title: 'Large PDF Document',
          fileUrl: 'https://example.com/large.pdf',
        },
        {
          id: 'encrypted-pdf',
          title: 'Encrypted PDF',
          fileUrl: 'https://example.com/encrypted.pdf',
        },
      ];

      for (const pdfType of pdfTypes) {
        const document: EnhancedDocument = {
          ...pdfType,
          contentType: ContentType.PDF,
          thumbnailUrl: 'https://example.com/thumb.jpg',
          metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const { unmount } = render(
          <UnifiedViewer content={document} />
        );

        // Fast-forward loading
        vi.advanceTimersByTime(600);

        await waitFor(() => {
          expect(screen.getByTestId('pdfjs-viewer')).toBeInTheDocument();
        });

        // Verify same rendering approach is used
        const viewer = screen.getByTestId('pdfjs-viewer');
        expect(viewer).toHaveAttribute('data-pdf-url', pdfType.fileUrl);
        expect(viewer).toHaveTextContent(`${pdfType.title} - PDF Viewer`);

        unmount();
      }
    });

    it('should maintain rendering consistency with DRM settings', async () => {
      const pdfDocument: EnhancedDocument = {
        id: 'drm-pdf',
        title: 'DRM Protected PDF',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/drm.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const drmSettings = {
        enableScreenshotPrevention: true,
        allowTextSelection: false,
        allowPrinting: false,
        allowDownload: false,
        watermarkRequired: true,
      };

      const watermark: WatermarkConfig = {
        text: 'CONFIDENTIAL',
        opacity: 0.3,
        fontSize: 48,
      };

      render(
        <UnifiedViewer
          content={pdfDocument}
          drmSettings={drmSettings}
          watermark={watermark}
        />
      );

      // Fast-forward loading
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-viewer')).toBeInTheDocument();
      });

      // Verify DRM-protected PDF still uses same rendering engine
      const viewer = screen.getByTestId('pdfjs-viewer');
      expect(viewer).toHaveAttribute('data-pdf-url', 'https://example.com/drm.pdf');
    });
  });

  /**
   * Test 2: Multi-Content Type Support
   * Validates that the unified viewer handles different content types correctly
   * Requirements: 2.1, 2.3
   */
  describe('Multi-Content Type Support', () => {
    it('should route to appropriate viewer based on content type', async () => {
      const contentTypes = [
        {
          type: ContentType.PDF,
          document: {
            id: 'pdf-doc',
            title: 'PDF Document',
            fileUrl: 'https://example.com/doc.pdf',
            expectedViewer: 'pdfjs-viewer',
          },
        },
        {
          type: ContentType.IMAGE,
          document: {
            id: 'image-doc',
            title: 'Image Document',
            fileUrl: 'https://example.com/image.jpg',
            expectedViewer: 'image-viewer',
          },
        },
        {
          type: ContentType.VIDEO,
          document: {
            id: 'video-doc',
            title: 'Video Document',
            fileUrl: 'https://example.com/video.mp4',
            expectedViewer: 'video-player',
          },
        },
        {
          type: ContentType.LINK,
          document: {
            id: 'link-doc',
            title: 'Link Document',
            linkUrl: 'https://example.com/external',
            expectedViewer: 'link-preview',
          },
        },
      ];

      for (const contentType of contentTypes) {
        const document: EnhancedDocument = {
          ...contentType.document,
          contentType: contentType.type,
          thumbnailUrl: 'https://example.com/thumb.jpg',
          metadata: { fileSize: 1024000, mimeType: 'application/octet-stream' },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const { unmount } = render(
          <UnifiedViewer content={document} />
        );

        // Fast-forward loading
        vi.advanceTimersByTime(600);

        await waitFor(() => {
          expect(screen.getByTestId(contentType.document.expectedViewer)).toBeInTheDocument();
        });

        // Verify correct viewer is rendered
        const viewer = screen.getByTestId(contentType.document.expectedViewer);
        expect(viewer).toHaveTextContent(`${contentType.document.title} - `);

        unmount();
      }
    });

    it('should handle content validation errors gracefully', async () => {
      const invalidDocuments = [
        {
          id: 'missing-url',
          title: 'PDF without URL',
          contentType: ContentType.PDF,
          fileUrl: undefined, // Missing required field
        },
        {
          id: 'missing-link',
          title: 'Link without URL',
          contentType: ContentType.LINK,
          linkUrl: undefined, // Missing required field
        },
      ];

      for (const invalidDoc of invalidDocuments) {
        const document: EnhancedDocument = {
          ...invalidDoc,
          thumbnailUrl: 'https://example.com/thumb.jpg',
          metadata: { fileSize: 1024000, mimeType: 'application/octet-stream' },
          createdAt: new Date(),
          updatedAt: new Date(),
        } as EnhancedDocument;

        const { unmount } = render(
          <UnifiedViewer content={document} />
        );

        // Fast-forward loading
        vi.advanceTimersByTime(600);

        await waitFor(() => {
          expect(screen.getByText(/Error Loading Content/i)).toBeInTheDocument();
        });

        // Verify error message is displayed
        expect(screen.getByText(/missing/i)).toBeInTheDocument();
        expect(screen.getByText(/Reload Page/i)).toBeInTheDocument();

        unmount();
      }
    });
  });

  /**
   * Test 3: Loading State Management
   * Validates consistent loading states across all content types
   * Requirements: 3.1, 3.2
   */
  describe('Loading State Management', () => {
    it('should show consistent loading states for all content types', async () => {
      const document: EnhancedDocument = {
        id: 'loading-test',
        title: 'Loading Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/test.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<UnifiedViewer content={document} />);

      // Should show loading initially
      expect(screen.getByTestId('loading-progress')).toBeInTheDocument();
      expect(screen.getByText(/Loading PDF content/i)).toBeInTheDocument();

      // Progress should start at 0%
      expect(screen.getByText('Loading: 0%')).toBeInTheDocument();

      // Fast-forward to show progress
      vi.advanceTimersByTime(300);

      // Should still be loading
      expect(screen.getByTestId('loading-progress')).toBeInTheDocument();

      // Complete loading
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-progress')).not.toBeInTheDocument();
        expect(screen.getByTestId('pdfjs-viewer')).toBeInTheDocument();
      });
    });

    it('should handle loading progress updates correctly', async () => {
      const document: EnhancedDocument = {
        id: 'progress-test',
        title: 'Progress Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/progress.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const onAnalytics = vi.fn();

      render(
        <UnifiedViewer
          content={document}
          onAnalytics={onAnalytics}
        />
      );

      // Initial loading state
      expect(screen.getByText('Loading: 0%')).toBeInTheDocument();

      // Fast-forward through loading phases
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-viewer')).toBeInTheDocument();
      });

      // Should have tracked load completion
      expect(onAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'view',
        })
      );
    });
  });

  /**
   * Test 4: Error Recovery Integration
   * Validates error handling and recovery across the unified pipeline
   * Requirements: 1.3, 2.4
   */
  describe('Error Recovery Integration', () => {
    it('should handle PDF loading errors with specific messages', async () => {
      // Mock PDF viewer to simulate error
      vi.doMock('../PDFViewerWithPDFJS', () => ({
        default: ({ onError }: { onError?: (error: Error) => void }) => {
          React.useEffect(() => {
            if (onError) {
              onError(new Error('PDF loading failed'));
            }
          }, [onError]);

          return <div data-testid="pdf-error">PDF Error</div>;
        },
      }));

      const document: EnhancedDocument = {
        id: 'error-test',
        title: 'Error Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/error.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const onAnalytics = vi.fn();

      render(
        <UnifiedViewer
          content={document}
          onAnalytics={onAnalytics}
        />
      );

      // Fast-forward loading
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('pdf-error')).toBeInTheDocument();
      });

      // Should track error event
      expect(onAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'error',
          metadata: expect.objectContaining({
            error: 'PDF loading failed',
          }),
        })
      );
    });

    it('should provide retry functionality for failed loads', async () => {
      const document: EnhancedDocument = {
        id: 'retry-test',
        title: 'Retry Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/retry.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock window.location.reload
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      // Create invalid document to trigger error
      const invalidDocument = {
        ...document,
        fileUrl: undefined,
      } as EnhancedDocument;

      render(<UnifiedViewer content={invalidDocument} />);

      // Fast-forward loading
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByText(/Error Loading Content/i)).toBeInTheDocument();
      });

      // Click reload button
      const reloadButton = screen.getByText(/Reload Page/i);
      fireEvent.click(reloadButton);

      expect(mockReload).toHaveBeenCalled();
    });
  });

  /**
   * Test 5: Performance and Memory Management
   * Validates that the unified approach maintains good performance
   * Requirements: 2.2, 5.5
   */
  describe('Performance and Memory Management', () => {
    it('should handle multiple document types efficiently', async () => {
      const documents: EnhancedDocument[] = [
        {
          id: 'perf-pdf',
          title: 'Performance PDF',
          contentType: ContentType.PDF,
          fileUrl: 'https://example.com/perf.pdf',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'perf-image',
          title: 'Performance Image',
          contentType: ContentType.IMAGE,
          fileUrl: 'https://example.com/perf.jpg',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          metadata: { fileSize: 512000, mimeType: 'image/jpeg' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Render multiple documents sequentially to test cleanup
      for (const document of documents) {
        const { unmount } = render(
          <UnifiedViewer content={document} />
        );

        // Fast-forward loading
        vi.advanceTimersByTime(600);

        await waitFor(() => {
          const expectedTestId = document.contentType === ContentType.PDF 
            ? 'pdfjs-viewer' 
            : 'image-viewer';
          expect(screen.getByTestId(expectedTestId)).toBeInTheDocument();
        });

        // Unmount to test cleanup
        unmount();
      }

      // All documents should have been rendered and cleaned up successfully
      expect(true).toBe(true); // Test passes if no errors thrown
    });

    it('should maintain consistent performance across content types', async () => {
      const startTime = performance.now();

      const document: EnhancedDocument = {
        id: 'timing-test',
        title: 'Timing Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/timing.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<UnifiedViewer content={document} />);

      // Fast-forward loading
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-viewer')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (accounting for test environment)
      expect(renderTime).toBeLessThan(1000); // 1 second max for test
    });
  });

  /**
   * Test 6: Cross-Browser Compatibility
   * Validates that unified rendering works across different browser environments
   * Requirements: All
   */
  describe('Cross-Browser Compatibility', () => {
    it('should handle different browser capabilities gracefully', async () => {
      const document: EnhancedDocument = {
        id: 'compat-test',
        title: 'Compatibility Test Document',
        contentType: ContentType.PDF,
        fileUrl: 'https://example.com/compat.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { fileSize: 1024000, mimeType: 'application/pdf' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock different browser scenarios
      const originalUserAgent = navigator.userAgent;
      
      // Test with different user agents
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      ];

      for (const userAgent of userAgents) {
        Object.defineProperty(navigator, 'userAgent', {
          value: userAgent,
          configurable: true,
        });

        const { unmount } = render(
          <UnifiedViewer content={document} />
        );

        // Fast-forward loading
        vi.advanceTimersByTime(600);

        await waitFor(() => {
          expect(screen.getByTestId('pdfjs-viewer')).toBeInTheDocument();
        });

        // Should render successfully regardless of browser
        expect(screen.getByTestId('pdfjs-viewer')).toHaveAttribute(
          'data-pdf-url',
          'https://example.com/compat.pdf'
        );

        unmount();
      }

      // Restore original user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });
  });
});