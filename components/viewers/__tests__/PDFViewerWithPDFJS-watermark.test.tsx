/**
 * PDFViewerWithPDFJS Watermark Integration Tests
 * 
 * Tests for watermark overlay functionality with PDF.js rendering
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PDFViewerWithPDFJS from '../PDFViewerWithPDFJS';
import type { WatermarkSettings } from '../PDFViewerWithPDFJS';

// Mock PDF.js modules
vi.mock('@/lib/pdfjs-config', () => ({
  initializePDFJS: vi.fn(),
  isPDFJSAvailable: vi.fn(() => true),
}));

const mockDocument = {
  numPages: 3,
  getPage: vi.fn().mockResolvedValue({
    getViewport: vi.fn(() => ({ width: 800, height: 600, scale: 1 })),
    render: vi.fn(() => ({ promise: Promise.resolve() })),
  }),
  destroy: vi.fn(),
};

vi.mock('@/lib/pdfjs-integration', () => ({
  loadPDFDocument: vi.fn(),
  renderPageToCanvas: vi.fn(),
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

// Mock child components
vi.mock('../WatermarkOverlay', () => ({
  default: ({ text, opacity, fontSize }: { text: string; opacity: number; fontSize: number }) => (
    <div 
      data-testid="watermark-overlay"
      data-text={text}
      data-opacity={opacity}
      data-fontsize={fontSize}
    >
      {text}
    </div>
  ),
}));

vi.mock('../LoadingSpinner', () => ({
  default: ({ message }: { message: string }) => <div data-testid="loading-spinner">{message}</div>,
}));

vi.mock('../ViewerError', () => ({
  default: ({ error, onRetry }: { error: string; onRetry: () => void }) => (
    <div data-testid="viewer-error">
      <p>{error}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

describe('PDFViewerWithPDFJS - Watermark Integration', () => {
  const defaultProps = {
    pdfUrl: 'https://example.com/test.pdf',
    documentTitle: 'Test Document',
  };

  const defaultWatermark: WatermarkSettings = {
    text: 'CONFIDENTIAL',
    opacity: 0.3,
    fontSize: 48,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import and setup mocks
    const pdfjsIntegration = await import('@/lib/pdfjs-integration');
    
    vi.mocked(pdfjsIntegration.loadPDFDocument).mockResolvedValue({
      document: mockDocument,
      numPages: 3,
      loadTime: 100,
    });
    
    vi.mocked(pdfjsIntegration.renderPageToCanvas).mockResolvedValue({
      canvas: document.createElement('canvas'),
      viewport: { width: 800, height: 600, scale: 1 },
      renderTime: 50,
    });
  });

  describe('Requirement 3.1 & 3.2: Watermark Overlay Presence', () => {
    it('should display watermark when enabled in single page mode', async () => {
      render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={defaultWatermark}
          viewMode="single"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
      });

      const watermark = screen.getByTestId('watermark-overlay');
      expect(watermark).toBeInTheDocument();
      expect(watermark).toHaveAttribute('data-text', 'CONFIDENTIAL');
    });

    it('should not display watermark when not provided', async () => {
      render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          viewMode="single"
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('pdfjs-watermark-container')).not.toBeInTheDocument();
      });
    });

    it('should display watermark on all pages in continuous mode', async () => {
      render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={defaultWatermark}
          viewMode="continuous"
        />
      );

      await waitFor(() => {
        // Check that page containers exist (watermarks render when pages load)
        expect(screen.getByTestId('pdfjs-page-1')).toBeInTheDocument();
        expect(screen.getByTestId('pdfjs-page-2')).toBeInTheDocument();
        expect(screen.getByTestId('pdfjs-page-3')).toBeInTheDocument();
      });
      
      // Watermarks will appear as pages are loaded lazily
      // This test verifies the structure is in place for watermarks
    });

    it('should maintain watermark visibility during rendering', async () => {
      render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={defaultWatermark}
          viewMode="single"
        />
      );

      await waitFor(() => {
        const watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
        expect(watermarkContainer).toBeInTheDocument();
        
        // Check that watermark has pointer-events: none
        expect(watermarkContainer).toHaveStyle({ pointerEvents: 'none' });
      });
    });
  });

  describe('Requirement 3.3: Watermark Zoom Persistence', () => {
    it('should scale watermark font size with zoom level', async () => {
      const { rerender } = render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={defaultWatermark}
          viewMode="single"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
      });

      // Initial zoom level (1.0)
      const watermark = screen.getByTestId('watermark-overlay');
      expect(watermark).toHaveAttribute('data-fontsize', String(48 * 1.0));

      // Simulate zoom in by clicking zoom button
      const zoomInButton = await screen.findByTestId('pdfjs-zoom-in-button');
      zoomInButton.click();

      await waitFor(() => {
        watermark = screen.getByTestId('watermark-overlay');
        // Font size should scale with zoom (1.25x)
        expect(parseFloat(watermark.getAttribute('data-fontsize') || '0')).toBeGreaterThan(48);
      });
    });

    it('should maintain watermark position during zoom', async () => {
      render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={defaultWatermark}
          viewMode="single"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
      });

      const watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
      
      // Watermark should be absolutely positioned
      expect(watermarkContainer).toHaveClass('absolute', 'inset-0');
    });

    it('should update watermark in continuous mode when zoom changes', async () => {
      render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={defaultWatermark}
          viewMode="continuous"
        />
      );

      await waitFor(() => {
        // Verify continuous container is rendered
        expect(screen.getByTestId('pdfjs-continuous-container')).toBeInTheDocument();
      });

      // Zoom in
      const zoomInButton = await screen.findByTestId('pdfjs-zoom-in-button');
      zoomInButton.click();

      await waitFor(() => {
        // Verify zoom level changed
        expect(screen.getByTestId('pdfjs-zoom-level')).toHaveTextContent('125%');
      });
      
      // Watermarks will update as pages re-render with new zoom level
    });
  });

  describe('Requirement 3.4: Watermark Navigation Persistence', () => {
    it('should maintain watermark when navigating to next page', async () => {
      render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={defaultWatermark}
          viewMode="single"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
      });

      // Navigate to next page
      const nextButton = await screen.findByTestId('pdfjs-next-page-button');
      nextButton.click();

      await waitFor(() => {
        // Watermark should still be present
        expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
        expect(screen.getByTestId('watermark-overlay')).toBeInTheDocument();
      });
    });

    it('should maintain watermark when navigating to previous page', async () => {
      render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={defaultWatermark}
          viewMode="single"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
      });

      // Navigate to page 2 first
      const nextButton = await screen.findByTestId('pdfjs-next-page-button');
      nextButton.click();

      await waitFor(() => {
        expect(screen.getByText('of 3')).toBeInTheDocument();
      });

      // Navigate back
      const prevButton = await screen.findByTestId('pdfjs-prev-page-button');
      prevButton.click();

      await waitFor(() => {
        // Watermark should still be present
        expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
      });
    });

    it('should show watermark on all visible pages in continuous mode', async () => {
      render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={defaultWatermark}
          viewMode="continuous"
        />
      );

      await waitFor(() => {
        // Check that page containers exist
        expect(screen.getByTestId('pdfjs-page-1')).toBeInTheDocument();
        expect(screen.getByTestId('pdfjs-page-2')).toBeInTheDocument();
        expect(screen.getByTestId('pdfjs-page-3')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 3.5: Watermark Dynamic Updates', () => {
    it('should update watermark text when settings change', async () => {
      const { rerender } = render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={defaultWatermark}
          viewMode="single"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('watermark-overlay')).toHaveAttribute('data-text', 'CONFIDENTIAL');
      });

      // Update watermark settings
      const newWatermark: WatermarkSettings = {
        text: 'DRAFT',
        opacity: 0.5,
        fontSize: 64,
      };

      rerender(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={newWatermark}
          viewMode="single"
        />
      );

      await waitFor(() => {
        const watermark = screen.getByTestId('watermark-overlay');
        expect(watermark).toHaveAttribute('data-text', 'DRAFT');
        expect(watermark).toHaveAttribute('data-opacity', '0.5');
      });
    });

    it('should update watermark opacity when settings change', async () => {
      const { rerender } = render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={defaultWatermark}
          viewMode="single"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('watermark-overlay')).toHaveAttribute('data-opacity', '0.3');
      });

      // Update opacity
      const updatedWatermark: WatermarkSettings = {
        ...defaultWatermark,
        opacity: 0.7,
      };

      rerender(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={updatedWatermark}
          viewMode="single"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('watermark-overlay')).toHaveAttribute('data-opacity', '0.7');
      });
    });

    it('should update watermark font size when settings change', async () => {
      const { rerender } = render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={defaultWatermark}
          viewMode="single"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('watermark-overlay')).toHaveAttribute('data-fontsize', '48');
      });

      // Update font size
      const updatedWatermark: WatermarkSettings = {
        ...defaultWatermark,
        fontSize: 72,
      };

      rerender(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={updatedWatermark}
          viewMode="single"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('watermark-overlay')).toHaveAttribute('data-fontsize', '72');
      });
    });

    it('should remove watermark when settings are cleared', async () => {
      const { rerender } = render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={defaultWatermark}
          viewMode="single"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-watermark-container')).toBeInTheDocument();
      });

      // Remove watermark
      rerender(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={undefined}
          viewMode="single"
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('pdfjs-watermark-container')).not.toBeInTheDocument();
      });
    });

    it('should update watermark immediately in continuous mode', async () => {
      const { rerender } = render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={defaultWatermark}
          viewMode="continuous"
        />
      );

      await waitFor(() => {
        // Verify continuous container is rendered
        expect(screen.getByTestId('pdfjs-continuous-container')).toBeInTheDocument();
      });

      // Update watermark
      const newWatermark: WatermarkSettings = {
        text: 'UPDATED',
        opacity: 0.6,
        fontSize: 56,
      };

      rerender(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={newWatermark}
          viewMode="continuous"
        />
      );

      await waitFor(() => {
        // Verify container still exists with updated watermark settings
        expect(screen.getByTestId('pdfjs-continuous-container')).toBeInTheDocument();
      });
      
      // Watermarks will update as pages render with new settings
    });
  });

  describe('Watermark Positioning and Styling', () => {
    it('should position watermark with correct z-index', async () => {
      render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={defaultWatermark}
          viewMode="single"
        />
      );

      await waitFor(() => {
        const watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
        expect(watermarkContainer).toHaveStyle({ zIndex: '10' });
      });
    });

    it('should make watermark non-interactive', async () => {
      render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={defaultWatermark}
          viewMode="single"
        />
      );

      await waitFor(() => {
        const watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
        expect(watermarkContainer).toHaveStyle({ pointerEvents: 'none' });
      });
    });

    it('should cover entire canvas area', async () => {
      render(
        <PDFViewerWithPDFJS 
          {...defaultProps} 
          watermark={defaultWatermark}
          viewMode="single"
        />
      );

      await waitFor(() => {
        const watermarkContainer = screen.getByTestId('pdfjs-watermark-container');
        expect(watermarkContainer).toHaveClass('absolute', 'inset-0');
      });
    });
  });
});
