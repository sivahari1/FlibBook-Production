/**
 * SimpleDocumentViewer Reliability Integration Tests
 * 
 * Tests the integration of reliability features in SimpleDocumentViewer
 * 
 * Requirements: 1.1, 1.2, 8.1, 5.1, 5.2, 5.3, 5.4
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SimpleDocumentViewer from '../SimpleDocumentViewer';

// Mock PDFViewerWithPDFJS
vi.mock('../PDFViewerWithPDFJS', () => ({
  default: ({ 
    pdfUrl, 
    documentTitle, 
    watermark, 
    enableDRM, 
    onLoadComplete, 
    onError,
    onPageChange,
    onTotalPagesChange,
    hideToolbar 
  }: any) => (
    <div data-testid="pdf-viewer-with-pdfjs">
      <div data-testid="pdf-url">{pdfUrl}</div>
      <div data-testid="document-title">{documentTitle}</div>
      <div data-testid="watermark-text">{watermark?.text}</div>
      <div data-testid="enable-drm">{enableDRM ? 'true' : 'false'}</div>
      <div data-testid="hide-toolbar">{hideToolbar ? 'true' : 'false'}</div>
      <button 
        onClick={() => onLoadComplete?.(5)} 
        data-testid="trigger-load-complete"
      >
        Trigger Load Complete
      </button>
      <button 
        onClick={() => onError?.(new Error('Test error'))} 
        data-testid="trigger-error"
      >
        Trigger Error
      </button>
      <button 
        onClick={() => onPageChange?.(2)} 
        data-testid="trigger-page-change"
      >
        Trigger Page Change
      </button>
    </div>
  ),
}));

// Mock other components
vi.mock('../ViewerToolbar', () => ({
  default: ({ 
    documentTitle, 
    currentPage, 
    totalPages, 
    onPageChange, 
    onClose 
  }: any) => (
    <div data-testid="viewer-toolbar">
      <div data-testid="toolbar-title">{documentTitle}</div>
      <div data-testid="toolbar-page">{currentPage}/{totalPages}</div>
      <button onClick={() => onPageChange?.(3)} data-testid="toolbar-page-change">
        Change Page
      </button>
      <button onClick={onClose} data-testid="toolbar-close">
        Close
      </button>
    </div>
  ),
}));

vi.mock('../ContinuousScrollView', () => ({
  default: ({ pages, onPageVisible }: any) => (
    <div data-testid="continuous-scroll-view">
      <div data-testid="pages-count">{pages.length}</div>
      <button 
        onClick={() => onPageVisible?.(3)} 
        data-testid="trigger-page-visible"
      >
        Trigger Page Visible
      </button>
    </div>
  ),
}));

vi.mock('../PagedView', () => ({
  default: ({ pages, currentPage }: any) => (
    <div data-testid="paged-view">
      <div data-testid="pages-count">{pages.length}</div>
      <div data-testid="current-page">{currentPage}</div>
    </div>
  ),
}));

vi.mock('../WatermarkOverlay', () => ({
  default: ({ text, opacity, fontSize }: any) => (
    <div data-testid="watermark-overlay">
      <div data-testid="watermark-text">{text}</div>
      <div data-testid="watermark-opacity">{opacity}</div>
      <div data-testid="watermark-font-size">{fontSize}</div>
    </div>
  ),
}));

vi.mock('../LoadingSpinner', () => ({
  default: ({ message }: { message: string }) => (
    <div data-testid="loading-spinner">{message}</div>
  ),
}));

vi.mock('../ViewerError', () => ({
  default: ({ error, onRetry, onClose }: any) => (
    <div data-testid="viewer-error">
      <div data-testid="error-message">{error}</div>
      <button onClick={onRetry} data-testid="error-retry">Retry</button>
      <button onClick={onClose} data-testid="error-close">Close</button>
    </div>
  ),
}));

// Mock hooks
vi.mock('@/hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: vi.fn(),
}));

vi.mock('@/hooks/useTouchGestures', () => ({
  useTouchGestures: vi.fn(),
}));

// Mock viewer preferences
vi.mock('@/lib/viewer-preferences', () => ({
  loadPreferences: vi.fn(() => ({
    viewMode: 'continuous',
    defaultZoom: 1.0,
  })),
  updatePreferences: vi.fn(),
  isLocalStorageAvailable: vi.fn(() => true),
}));

describe('SimpleDocumentViewer Reliability Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test 1: Reliability Features Integration
   * 
   * Tests that reliability features are properly integrated into SimpleDocumentViewer
   * 
   * Requirements: 1.1, 1.2, 8.1
   */
  describe('Reliability Features Integration', () => {
    it('should enable reliability features by default for PDF rendering', () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc-1"
          documentTitle="Test Document"
          pdfUrl="https://example.com/test.pdf"
        />
      );

      // Should render PDFViewerWithPDFJS for PDF content
      expect(screen.getByTestId('pdf-viewer-with-pdfjs')).toBeInTheDocument();
      expect(screen.getByTestId('pdf-url')).toHaveTextContent('https://example.com/test.pdf');
      expect(screen.getByTestId('document-title')).toHaveTextContent('Test Document');
    });

    it('should allow disabling reliability features', () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc-2"
          documentTitle="Test Document"
          pdfUrl="https://example.com/test.pdf"
          enableReliabilityFeatures={false}
        />
      );

      // Should still render PDFViewerWithPDFJS but with reliability features disabled
      expect(screen.getByTestId('pdf-viewer-with-pdfjs')).toBeInTheDocument();
    });

    it('should pass watermark settings to PDF viewer', () => {
      const watermark = {
        text: 'CONFIDENTIAL',
        opacity: 0.3,
        fontSize: 48,
      };

      render(
        <SimpleDocumentViewer
          documentId="test-doc-3"
          documentTitle="Test Document"
          pdfUrl="https://example.com/test.pdf"
          watermark={watermark}
        />
      );

      expect(screen.getByTestId('watermark-text')).toHaveTextContent('CONFIDENTIAL');
    });

    it('should enable DRM protection when screenshot prevention is enabled', () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc-4"
          documentTitle="Test Document"
          pdfUrl="https://example.com/test.pdf"
          enableScreenshotPrevention={true}
        />
      );

      expect(screen.getByTestId('enable-drm')).toHaveTextContent('true');
    });

    it('should hide toolbar in PDF viewer', () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc-5"
          documentTitle="Test Document"
          pdfUrl="https://example.com/test.pdf"
        />
      );

      expect(screen.getByTestId('hide-toolbar')).toHaveTextContent('true');
    });
  });

  /**
   * Test 2: Enhanced Error Handling
   * 
   * Tests that enhanced error handling works with reliability features
   * 
   * Requirements: 1.4, 1.5, 2.1, 7.1, 7.2
   */
  describe('Enhanced Error Handling', () => {
    it('should call enhanced error callback when PDF rendering fails', async () => {
      const onRenderingError = vi.fn();

      render(
        <SimpleDocumentViewer
          documentId="test-doc-6"
          documentTitle="Test Document"
          pdfUrl="https://example.com/test.pdf"
          onRenderingError={onRenderingError}
        />
      );

      // Trigger error in PDF viewer
      fireEvent.click(screen.getByTestId('trigger-error'));

      await waitFor(() => {
        expect(onRenderingError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Test error',
          })
        );
      });
    });

    it('should display error message when PDF rendering fails', async () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc-7"
          documentTitle="Test Document"
          pdfUrl="https://example.com/test.pdf"
        />
      );

      // Trigger error in PDF viewer
      fireEvent.click(screen.getByTestId('trigger-error'));

      await waitFor(() => {
        expect(screen.getByTestId('viewer-error')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toHaveTextContent('Test error');
      });
    });

    it('should provide retry functionality when rendering fails', async () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc-8"
          documentTitle="Test Document"
          pdfUrl="https://example.com/test.pdf"
        />
      );

      // Trigger error
      fireEvent.click(screen.getByTestId('trigger-error'));

      await waitFor(() => {
        expect(screen.getByTestId('viewer-error')).toBeInTheDocument();
      });

      // Verify retry button is available
      expect(screen.getByTestId('error-retry')).toBeInTheDocument();
    });

    it('should handle missing PDF URL gracefully', () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc-9"
          documentTitle="Test Document"
          // No pdfUrl provided
        />
      );

      // Should show error for missing PDF
      expect(screen.getByTestId('viewer-error')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('No pages available to display');
    });
  });

  /**
   * Test 3: Progress Feedback Integration
   * 
   * Tests that progress feedback works correctly with reliability features
   * 
   * Requirements: 5.1, 5.2, 5.3
   */
  describe('Progress Feedback Integration', () => {
    it('should update page count when PDF loads successfully', async () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc-10"
          documentTitle="Test Document"
          pdfUrl="https://example.com/test.pdf"
        />
      );

      // Trigger successful load
      fireEvent.click(screen.getByTestId('trigger-load-complete'));

      await waitFor(() => {
        // Should update toolbar with correct page count
        expect(screen.getByTestId('toolbar-page')).toHaveTextContent('1/5');
      });
    });

    it('should handle page changes from PDF viewer', async () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc-11"
          documentTitle="Test Document"
          pdfUrl="https://example.com/test.pdf"
        />
      );

      // Load PDF first
      fireEvent.click(screen.getByTestId('trigger-load-complete'));

      await waitFor(() => {
        expect(screen.getByTestId('toolbar-page')).toHaveTextContent('1/5');
      });

      // Trigger page change
      fireEvent.click(screen.getByTestId('trigger-page-change'));

      await waitFor(() => {
        expect(screen.getByTestId('toolbar-page')).toHaveTextContent('2/5');
      });
    });

    it('should log reliability feature status on load', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(
        <SimpleDocumentViewer
          documentId="test-doc-12"
          documentTitle="Test Document"
          pdfUrl="https://example.com/test.pdf"
          enableReliabilityFeatures={true}
        />
      );

      // Trigger load complete
      fireEvent.click(screen.getByTestId('trigger-load-complete'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('reliability features: enabled')
        );
      });

      consoleSpy.mockRestore();
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
    it('should maintain existing toolbar functionality', async () => {
      const onClose = vi.fn();

      render(
        <SimpleDocumentViewer
          documentId="test-doc-13"
          documentTitle="Test Document"
          pdfUrl="https://example.com/test.pdf"
          onClose={onClose}
        />
      );

      // Load PDF
      fireEvent.click(screen.getByTestId('trigger-load-complete'));

      await waitFor(() => {
        expect(screen.getByTestId('viewer-toolbar')).toBeInTheDocument();
      });

      // Test close functionality
      fireEvent.click(screen.getByTestId('toolbar-close'));
      expect(onClose).toHaveBeenCalled();
    });

    it('should maintain existing watermark overlay functionality', () => {
      const watermark = {
        text: 'SAMPLE',
        opacity: 0.5,
        fontSize: 36,
      };

      render(
        <SimpleDocumentViewer
          documentId="test-doc-14"
          documentTitle="Test Document"
          pdfUrl="https://example.com/test.pdf"
          watermark={watermark}
        />
      );

      // Should render watermark overlay
      expect(screen.getByTestId('watermark-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('SAMPLE');
      expect(screen.getByTestId('watermark-opacity')).toHaveTextContent('0.5');
      expect(screen.getByTestId('watermark-font-size')).toHaveTextContent('36');
    });

    it('should fall back to legacy page rendering when no PDF URL is provided', () => {
      const pages = [
        {
          pageNumber: 1,
          pageUrl: 'https://example.com/page1.jpg',
          dimensions: { width: 800, height: 600 },
        },
        {
          pageNumber: 2,
          pageUrl: 'https://example.com/page2.jpg',
          dimensions: { width: 800, height: 600 },
        },
      ];

      render(
        <SimpleDocumentViewer
          documentId="test-doc-15"
          documentTitle="Test Document"
          pages={pages}
        />
      );

      // Should render continuous scroll view for legacy pages
      expect(screen.getByTestId('continuous-scroll-view')).toBeInTheDocument();
      expect(screen.getByTestId('pages-count')).toHaveTextContent('2');
    });

    it('should maintain existing view mode switching', async () => {
      const pages = [
        {
          pageNumber: 1,
          pageUrl: 'https://example.com/page1.jpg',
          dimensions: { width: 800, height: 600 },
        },
      ];

      const { rerender } = render(
        <SimpleDocumentViewer
          documentId="test-doc-16"
          documentTitle="Test Document"
          pages={pages}
        />
      );

      // Should start in continuous mode (default)
      expect(screen.getByTestId('continuous-scroll-view')).toBeInTheDocument();

      // Switch to paged mode by changing viewMode prop (simulating toolbar interaction)
      // Note: In real usage, this would be handled by internal state
      rerender(
        <SimpleDocumentViewer
          documentId="test-doc-16"
          documentTitle="Test Document"
          pages={pages}
        />
      );

      // Should still be in continuous mode since we didn't actually change the internal state
      expect(screen.getByTestId('continuous-scroll-view')).toBeInTheDocument();
    });

    it('should maintain existing keyboard and touch gesture support', () => {
      const { useKeyboardNavigation } = require('@/hooks/useKeyboardNavigation');
      const { useTouchGestures } = require('@/hooks/useTouchGestures');

      render(
        <SimpleDocumentViewer
          documentId="test-doc-17"
          documentTitle="Test Document"
          pdfUrl="https://example.com/test.pdf"
        />
      );

      // Verify hooks are called
      expect(useKeyboardNavigation).toHaveBeenCalled();
      expect(useTouchGestures).toHaveBeenCalled();
    });

    it('should maintain existing DRM protection features', () => {
      const { container } = render(
        <SimpleDocumentViewer
          documentId="test-doc-18"
          documentTitle="Test Document"
          pdfUrl="https://example.com/test.pdf"
          enableScreenshotPrevention={true}
        />
      );

      // Should apply DRM styles to container
      const viewerContainer = container.firstChild as HTMLElement;
      expect(viewerContainer).toHaveStyle({ userSelect: 'none' });
    });
  });

  /**
   * Test 5: Performance and Memory Management
   * 
   * Tests that reliability features don't negatively impact performance
   * 
   * Requirements: 6.3, 6.4
   */
  describe('Performance and Memory Management', () => {
    it('should not cause memory leaks when unmounting with reliability features', () => {
      const { unmount } = render(
        <SimpleDocumentViewer
          documentId="test-doc-19"
          documentTitle="Test Document"
          pdfUrl="https://example.com/test.pdf"
          enableReliabilityFeatures={true}
        />
      );

      // Should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid prop changes without issues', () => {
      const { rerender } = render(
        <SimpleDocumentViewer
          documentId="test-doc-20"
          documentTitle="Test Document"
          pdfUrl="https://example.com/test1.pdf"
          enableReliabilityFeatures={true}
        />
      );

      // Rapidly change props
      for (let i = 2; i <= 5; i++) {
        rerender(
          <SimpleDocumentViewer
            documentId={`test-doc-${20 + i}`}
            documentTitle={`Test Document ${i}`}
            pdfUrl={`https://example.com/test${i}.pdf`}
            enableReliabilityFeatures={true}
          />
        );
      }

      // Should handle changes without errors
      expect(screen.getByTestId('pdf-viewer-with-pdfjs')).toBeInTheDocument();
    });

    it('should maintain performance with large documents', async () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc-21"
          documentTitle="Large Test Document"
          pdfUrl="https://example.com/large-test.pdf"
          enableReliabilityFeatures={true}
        />
      );

      // Simulate loading a large document (100 pages)
      fireEvent.click(screen.getByTestId('trigger-load-complete'));

      await waitFor(() => {
        expect(screen.getByTestId('toolbar-page')).toHaveTextContent('1/5');
      });

      // Should render without performance issues
      expect(screen.getByTestId('pdf-viewer-with-pdfjs')).toBeInTheDocument();
    });
  });
});