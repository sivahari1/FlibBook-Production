/**
 * PDFViewerWithPDFJS Navigation Controls Tests
 * 
 * Tests for task 4: Implement navigation controls
 * - 4.1: Page navigation
 * - 4.4: Zoom controls
 * - 4.6: Keyboard shortcuts
 * 
 * Requirements: 5.1, 5.3, 5.4, 5.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PDFViewerWithPDFJS from '../PDFViewerWithPDFJS';

// Mock the PDF.js modules
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

// Mock WatermarkOverlay
vi.mock('../WatermarkOverlay', () => ({
  default: () => <div data-testid="watermark-overlay">Watermark</div>,
}));

// Mock LoadingSpinner
vi.mock('../LoadingSpinner', () => ({
  default: ({ message }: { message: string }) => (
    <div data-testid="loading-spinner">{message}</div>
  ),
}));

// Mock ViewerError
vi.mock('../ViewerError', () => ({
  default: ({ error, onRetry }: { error: string; onRetry: () => void }) => (
    <div data-testid="viewer-error">
      <p>{error}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

describe('PDFViewerWithPDFJS - Navigation Controls', () => {
  const mockPdfUrl = 'https://example.com/test.pdf';
  const mockDocumentTitle = 'Test Document';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 4.1: Page Navigation', () => {
    it('should render page navigation controls when PDF is loaded', async () => {
      const { loadPDFDocument, renderPageToCanvas } = await import('@/lib/pdfjs-integration');
      
      const mockDocument = {
        numPages: 10,
        getPage: vi.fn().mockResolvedValue({
          pageNumber: 1,
          getViewport: vi.fn(() => ({ width: 800, height: 1000, scale: 1 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
      };

      (loadPDFDocument as any).mockResolvedValue({
        document: mockDocument,
        numPages: 10,
      });

      (renderPageToCanvas as any).mockResolvedValue({
        canvas: document.createElement('canvas'),
      });

      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
        />
      );

      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-page-navigation')).toBeInTheDocument();
      });

      // Check navigation controls exist
      expect(screen.getByTestId('pdfjs-prev-page-button')).toBeInTheDocument();
      expect(screen.getByTestId('pdfjs-next-page-button')).toBeInTheDocument();
      expect(screen.getByTestId('pdfjs-page-input')).toBeInTheDocument();
      expect(screen.getByTestId('pdfjs-page-count')).toHaveTextContent('of 10');
    });

    it('should navigate to next page when next button is clicked', async () => {
      const { loadPDFDocument, renderPageToCanvas } = await import('@/lib/pdfjs-integration');
      
      const mockDocument = {
        numPages: 10,
        getPage: vi.fn().mockResolvedValue({
          pageNumber: 1,
          getViewport: vi.fn(() => ({ width: 800, height: 1000, scale: 1 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
      };

      (loadPDFDocument as any).mockResolvedValue({
        document: mockDocument,
        numPages: 10,
      });

      (renderPageToCanvas as any).mockResolvedValue({
        canvas: document.createElement('canvas'),
      });

      const onPageChange = vi.fn();

      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
          onPageChange={onPageChange}
        />
      );

      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-page-navigation')).toBeInTheDocument();
      });

      // Click next button
      const nextButton = screen.getByTestId('pdfjs-next-page-button');
      fireEvent.click(nextButton);

      // Wait for page change
      await waitFor(() => {
        const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
        expect(pageInput.value).toBe('2');
      });
    });

    it('should navigate to previous page when prev button is clicked', async () => {
      const { loadPDFDocument, renderPageToCanvas } = await import('@/lib/pdfjs-integration');
      
      const mockDocument = {
        numPages: 10,
        getPage: vi.fn().mockResolvedValue({
          pageNumber: 2,
          getViewport: vi.fn(() => ({ width: 800, height: 1000, scale: 1 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
      };

      (loadPDFDocument as any).mockResolvedValue({
        document: mockDocument,
        numPages: 10,
      });

      (renderPageToCanvas as any).mockResolvedValue({
        canvas: document.createElement('canvas'),
      });

      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
        />
      );

      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-page-navigation')).toBeInTheDocument();
      });

      // First go to page 2
      const nextButton = screen.getByTestId('pdfjs-next-page-button');
      fireEvent.click(nextButton);

      await waitFor(() => {
        const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
        expect(pageInput.value).toBe('2');
      });

      // Then go back to page 1
      const prevButton = screen.getByTestId('pdfjs-prev-page-button');
      fireEvent.click(prevButton);

      await waitFor(() => {
        const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
        expect(pageInput.value).toBe('1');
      });
    });

    it('should handle page number input', async () => {
      const { loadPDFDocument, renderPageToCanvas } = await import('@/lib/pdfjs-integration');
      
      const mockDocument = {
        numPages: 10,
        getPage: vi.fn().mockResolvedValue({
          pageNumber: 1,
          getViewport: vi.fn(() => ({ width: 800, height: 1000, scale: 1 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
      };

      (loadPDFDocument as any).mockResolvedValue({
        document: mockDocument,
        numPages: 10,
      });

      (renderPageToCanvas as any).mockResolvedValue({
        canvas: document.createElement('canvas'),
      });

      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
        />
      );

      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-page-navigation')).toBeInTheDocument();
      });

      // Type page number
      const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
      fireEvent.change(pageInput, { target: { value: '5' } });

      await waitFor(() => {
        expect(pageInput.value).toBe('5');
      });
    });

    it('should disable prev button on first page', async () => {
      const { loadPDFDocument, renderPageToCanvas } = await import('@/lib/pdfjs-integration');
      
      const mockDocument = {
        numPages: 10,
        getPage: vi.fn().mockResolvedValue({
          pageNumber: 1,
          getViewport: vi.fn(() => ({ width: 800, height: 1000, scale: 1 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
      };

      (loadPDFDocument as any).mockResolvedValue({
        document: mockDocument,
        numPages: 10,
      });

      (renderPageToCanvas as any).mockResolvedValue({
        canvas: document.createElement('canvas'),
      });

      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
        />
      );

      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-page-navigation')).toBeInTheDocument();
      });

      const prevButton = screen.getByTestId('pdfjs-prev-page-button');
      expect(prevButton).toBeDisabled();
    });
  });

  describe('Task 4.4: Zoom Controls', () => {
    it('should render zoom controls when PDF is loaded', async () => {
      const { loadPDFDocument, renderPageToCanvas } = await import('@/lib/pdfjs-integration');
      
      const mockDocument = {
        numPages: 10,
        getPage: vi.fn().mockResolvedValue({
          pageNumber: 1,
          getViewport: vi.fn(() => ({ width: 800, height: 1000, scale: 1 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
      };

      (loadPDFDocument as any).mockResolvedValue({
        document: mockDocument,
        numPages: 10,
      });

      (renderPageToCanvas as any).mockResolvedValue({
        canvas: document.createElement('canvas'),
      });

      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
        />
      );

      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-zoom-controls')).toBeInTheDocument();
      });

      // Check zoom controls exist
      expect(screen.getByTestId('pdfjs-zoom-in-button')).toBeInTheDocument();
      expect(screen.getByTestId('pdfjs-zoom-out-button')).toBeInTheDocument();
      expect(screen.getByTestId('pdfjs-zoom-level')).toHaveTextContent('100%');
    });

    it('should zoom in when zoom in button is clicked', async () => {
      const { loadPDFDocument, renderPageToCanvas } = await import('@/lib/pdfjs-integration');
      
      const mockDocument = {
        numPages: 10,
        getPage: vi.fn().mockResolvedValue({
          pageNumber: 1,
          getViewport: vi.fn(() => ({ width: 800, height: 1000, scale: 1 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
      };

      (loadPDFDocument as any).mockResolvedValue({
        document: mockDocument,
        numPages: 10,
      });

      (renderPageToCanvas as any).mockResolvedValue({
        canvas: document.createElement('canvas'),
      });

      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
        />
      );

      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-zoom-controls')).toBeInTheDocument();
      });

      // Click zoom in button
      const zoomInButton = screen.getByTestId('pdfjs-zoom-in-button');
      fireEvent.click(zoomInButton);

      // Wait for zoom level to update
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-zoom-level')).toHaveTextContent('125%');
      });
    });

    it('should zoom out when zoom out button is clicked', async () => {
      const { loadPDFDocument, renderPageToCanvas } = await import('@/lib/pdfjs-integration');
      
      const mockDocument = {
        numPages: 10,
        getPage: vi.fn().mockResolvedValue({
          pageNumber: 1,
          getViewport: vi.fn(() => ({ width: 800, height: 1000, scale: 1 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
      };

      (loadPDFDocument as any).mockResolvedValue({
        document: mockDocument,
        numPages: 10,
      });

      (renderPageToCanvas as any).mockResolvedValue({
        canvas: document.createElement('canvas'),
      });

      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
        />
      );

      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-zoom-controls')).toBeInTheDocument();
      });

      // Click zoom out button
      const zoomOutButton = screen.getByTestId('pdfjs-zoom-out-button');
      fireEvent.click(zoomOutButton);

      // Wait for zoom level to update
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-zoom-level')).toHaveTextContent('75%');
      });
    });

    it('should respect zoom level bounds (0.5x - 3.0x)', async () => {
      const { loadPDFDocument, renderPageToCanvas } = await import('@/lib/pdfjs-integration');
      
      const mockDocument = {
        numPages: 10,
        getPage: vi.fn().mockResolvedValue({
          pageNumber: 1,
          getViewport: vi.fn(() => ({ width: 800, height: 1000, scale: 1 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
      };

      (loadPDFDocument as any).mockResolvedValue({
        document: mockDocument,
        numPages: 10,
      });

      (renderPageToCanvas as any).mockResolvedValue({
        canvas: document.createElement('canvas'),
      });

      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
        />
      );

      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-zoom-controls')).toBeInTheDocument();
      });

      // Zoom out to minimum
      const zoomOutButton = screen.getByTestId('pdfjs-zoom-out-button');
      fireEvent.click(zoomOutButton);
      fireEvent.click(zoomOutButton);

      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-zoom-level')).toHaveTextContent('50%');
        expect(zoomOutButton).toBeDisabled();
      });

      // Zoom in to maximum
      const zoomInButton = screen.getByTestId('pdfjs-zoom-in-button');
      for (let i = 0; i < 11; i++) {
        fireEvent.click(zoomInButton);
      }

      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-zoom-level')).toHaveTextContent('300%');
        expect(zoomInButton).toBeDisabled();
      });
    });
  });

  describe('Task 4.6: Keyboard Shortcuts', () => {
    it('should navigate with arrow keys', async () => {
      const { loadPDFDocument, renderPageToCanvas } = await import('@/lib/pdfjs-integration');
      
      const mockDocument = {
        numPages: 10,
        getPage: vi.fn().mockResolvedValue({
          pageNumber: 1,
          getViewport: vi.fn(() => ({ width: 800, height: 1000, scale: 1 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
      };

      (loadPDFDocument as any).mockResolvedValue({
        document: mockDocument,
        numPages: 10,
      });

      (renderPageToCanvas as any).mockResolvedValue({
        canvas: document.createElement('canvas'),
      });

      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
        />
      );

      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-page-navigation')).toBeInTheDocument();
      });

      // Press ArrowRight to go to next page
      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
        expect(pageInput.value).toBe('2');
      });

      // Press ArrowLeft to go to previous page
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      await waitFor(() => {
        const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
        expect(pageInput.value).toBe('1');
      });
    });

    it('should navigate with Page Up/Down keys', async () => {
      const { loadPDFDocument, renderPageToCanvas } = await import('@/lib/pdfjs-integration');
      
      const mockDocument = {
        numPages: 10,
        getPage: vi.fn().mockResolvedValue({
          pageNumber: 1,
          getViewport: vi.fn(() => ({ width: 800, height: 1000, scale: 1 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
      };

      (loadPDFDocument as any).mockResolvedValue({
        document: mockDocument,
        numPages: 10,
      });

      (renderPageToCanvas as any).mockResolvedValue({
        canvas: document.createElement('canvas'),
      });

      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
        />
      );

      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-page-navigation')).toBeInTheDocument();
      });

      // Press PageDown to go to next page
      fireEvent.keyDown(window, { key: 'PageDown' });

      await waitFor(() => {
        const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
        expect(pageInput.value).toBe('2');
      });

      // Press PageUp to go to previous page
      fireEvent.keyDown(window, { key: 'PageUp' });

      await waitFor(() => {
        const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
        expect(pageInput.value).toBe('1');
      });
    });

    it('should navigate with Home/End keys', async () => {
      const { loadPDFDocument, renderPageToCanvas } = await import('@/lib/pdfjs-integration');
      
      const mockDocument = {
        numPages: 10,
        getPage: vi.fn().mockResolvedValue({
          pageNumber: 1,
          getViewport: vi.fn(() => ({ width: 800, height: 1000, scale: 1 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
      };

      (loadPDFDocument as any).mockResolvedValue({
        document: mockDocument,
        numPages: 10,
      });

      (renderPageToCanvas as any).mockResolvedValue({
        canvas: document.createElement('canvas'),
      });

      render(
        <PDFViewerWithPDFJS
          pdfUrl={mockPdfUrl}
          documentTitle={mockDocumentTitle}
        />
      );

      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-page-navigation')).toBeInTheDocument();
      });

      // Press End to go to last page
      fireEvent.keyDown(window, { key: 'End' });

      await waitFor(() => {
        const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
        expect(pageInput.value).toBe('10');
      });

      // Press Home to go to first page
      fireEvent.keyDown(window, { key: 'Home' });

      await waitFor(() => {
        const pageInput = screen.getByTestId('pdfjs-page-input') as HTMLInputElement;
        expect(pageInput.value).toBe('1');
      });
    });
  });
});
