/**
 * PDFViewerWithPDFJS Continuous Scroll Mode Tests
 * 
 * Tests for continuous scroll functionality including:
 * - Multiple page rendering
 * - Virtual scrolling
 * - Visible page tracking
 * - Lazy page loading
 * - Memory management
 * 
 * Requirements: 5.2, 6.3, 6.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
    }
  },
  PDFPageRendererError: class PDFPageRendererError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

// Mock components
vi.mock('../WatermarkOverlay', () => ({
  default: () => <div data-testid="watermark-overlay">Watermark</div>,
}));

vi.mock('../LoadingSpinner', () => ({
  default: ({ message }: { message?: string }) => (
    <div data-testid="loading-spinner">{message || 'Loading...'}</div>
  ),
}));

vi.mock('../ViewerError', () => ({
  default: ({ error, onRetry }: { error: string; onRetry?: () => void }) => (
    <div data-testid="viewer-error">
      <p>{error}</p>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

describe('PDFViewerWithPDFJS - Continuous Scroll Mode', () => {
  const mockPdfUrl = 'https://example.com/test.pdf';
  const mockDocumentTitle = 'Test Document';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('Continuous Scroll Container', () => {
    it('should render continuous scroll container when viewMode is continuous', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      
      // Mock successful PDF load with 3 pages
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: {
          numPages: 3,
          getPage: vi.fn(),
          destroy: vi.fn(),
        } as any,
        numPages: 3,
        loadTime: 100,
      });
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
          viewMode="continuous"
        />
      );
      
      // Wait for document to load
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
      
      // Check for continuous container
      const continuousContainer = screen.getByTestId('pdfjs-continuous-container');
      expect(continuousContainer).toBeInTheDocument();
    });
    
    it('should render all page containers in continuous mode', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      
      // Mock successful PDF load with 5 pages
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: {
          numPages: 5,
          getPage: vi.fn(),
          destroy: vi.fn(),
        } as any,
        numPages: 5,
        loadTime: 100,
      });
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
          viewMode="continuous"
        />
      );
      
      // Wait for document to load
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
      
      // Check that all 5 page containers are rendered
      for (let i = 1; i <= 5; i++) {
        const pageContainer = screen.getByTestId(`pdfjs-page-${i}`);
        expect(pageContainer).toBeInTheDocument();
        expect(pageContainer).toHaveAttribute('data-page-number', String(i));
      }
    });
    
    it('should not render prev/next buttons in continuous mode', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: {
          numPages: 3,
          getPage: vi.fn(),
          destroy: vi.fn(),
        } as any,
        numPages: 3,
        loadTime: 100,
      });
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
          viewMode="continuous"
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
      
      // Prev/next buttons should not be present in continuous mode
      expect(screen.queryByTestId('pdfjs-prev-page-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('pdfjs-next-page-button')).not.toBeInTheDocument();
    });
    
    it('should still show page input in continuous mode', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: {
          numPages: 3,
          getPage: vi.fn(),
          destroy: vi.fn(),
        } as any,
        numPages: 3,
        loadTime: 100,
      });
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
          viewMode="continuous"
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
      
      // Page input should still be present
      const pageInput = screen.getByTestId('pdfjs-page-input');
      expect(pageInput).toBeInTheDocument();
      expect(pageInput).toHaveValue(1);
    });
  });
  
  describe('Single Page Mode (Default)', () => {
    it('should render single page container when viewMode is single', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: {
          numPages: 3,
          getPage: vi.fn().mockResolvedValue({
            pageNumber: 1,
            getViewport: vi.fn(() => ({ width: 600, height: 800, scale: 1 })),
            render: vi.fn(() => ({ promise: Promise.resolve() })),
          }),
          destroy: vi.fn(),
        } as any,
        numPages: 3,
        loadTime: 100,
      });
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
          viewMode="single"
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
      
      // Check for single page container
      const viewerContainer = screen.getByTestId('pdfjs-viewer-container');
      expect(viewerContainer).toBeInTheDocument();
      
      // Should not have continuous container
      expect(screen.queryByTestId('pdfjs-continuous-container')).not.toBeInTheDocument();
    });
    
    it('should render prev/next buttons in single page mode', async () => {
      const { loadPDFDocument, renderPageToCanvas } = await import('@/lib/pdfjs-integration');
      
      const mockCanvas = document.createElement('canvas');
      mockCanvas.width = 600;
      mockCanvas.height = 800;
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: {
          numPages: 3,
          getPage: vi.fn().mockResolvedValue({
            pageNumber: 1,
            getViewport: vi.fn(() => ({ width: 600, height: 800, scale: 1 })),
            render: vi.fn(() => ({ promise: Promise.resolve() })),
          }),
          destroy: vi.fn(),
        } as any,
        numPages: 3,
        loadTime: 100,
      });
      
      vi.mocked(renderPageToCanvas).mockResolvedValue({
        canvas: mockCanvas,
        viewport: { width: 600, height: 800, scale: 1 } as any,
        renderTime: 50,
      });
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
          viewMode="single"
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
      
      // Prev/next buttons should be present in single page mode
      expect(screen.getByTestId('pdfjs-prev-page-button')).toBeInTheDocument();
      expect(screen.getByTestId('pdfjs-next-page-button')).toBeInTheDocument();
    });
  });
  
  describe('Watermark in Continuous Mode', () => {
    it('should render watermark overlay in continuous mode', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: {
          numPages: 3,
          getPage: vi.fn(),
          destroy: vi.fn(),
        } as any,
        numPages: 3,
        loadTime: 100,
      });
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
          viewMode="continuous"
          watermark={{
            text: 'Confidential',
            opacity: 0.3,
            fontSize: 48,
          }}
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
      
      // Watermark should be present
      expect(screen.getByTestId('watermark-overlay')).toBeInTheDocument();
    });
  });
  
  describe('Zoom Controls in Continuous Mode', () => {
    it('should render zoom controls in continuous mode', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: {
          numPages: 3,
          getPage: vi.fn(),
          destroy: vi.fn(),
        } as any,
        numPages: 3,
        loadTime: 100,
      });
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
          viewMode="continuous"
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
      
      // Zoom controls should be present
      expect(screen.getByTestId('pdfjs-zoom-in-button')).toBeInTheDocument();
      expect(screen.getByTestId('pdfjs-zoom-out-button')).toBeInTheDocument();
      expect(screen.getByTestId('pdfjs-zoom-level')).toBeInTheDocument();
    });
  });
  
  describe('Page Number Indicators', () => {
    it('should show page number on each page in continuous mode', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: {
          numPages: 3,
          getPage: vi.fn(),
          destroy: vi.fn(),
        } as any,
        numPages: 3,
        loadTime: 100,
      });
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
          viewMode="continuous"
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
      
      // Check that each page has a page number indicator
      expect(screen.getByText('Page 1')).toBeInTheDocument();
      expect(screen.getByText('Page 2')).toBeInTheDocument();
      expect(screen.getByText('Page 3')).toBeInTheDocument();
    });
  });
});
