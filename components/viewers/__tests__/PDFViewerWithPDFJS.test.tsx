/**
 * PDFViewerWithPDFJS Component Tests
 * 
 * Basic unit tests for the PDF.js viewer component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  default: ({ text }: { text: string }) => <div data-testid="watermark">{text}</div>,
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

describe('PDFViewerWithPDFJS', () => {
  const defaultProps = {
    pdfUrl: 'https://example.com/test.pdf',
    documentTitle: 'Test Document',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Structure', () => {
    it('should render loading state initially', () => {
      const { loadPDFDocument } = require('@/lib/pdfjs-integration');
      
      // Mock loading that never resolves
      loadPDFDocument.mockImplementation(() => new Promise(() => {}));
      
      render(<PDFViewerWithPDFJS {...defaultProps} />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/Loading PDF/i)).toBeInTheDocument();
    });

    it('should initialize PDF.js on mount', () => {
      const { initializePDFJS } = require('@/lib/pdfjs-config');
      const { loadPDFDocument } = require('@/lib/pdfjs-integration');
      
      loadPDFDocument.mockImplementation(() => new Promise(() => {}));
      
      render(<PDFViewerWithPDFJS {...defaultProps} />);
      
      expect(initializePDFJS).toHaveBeenCalled();
    });

    it('should render canvas container when loaded', async () => {
      const { loadPDFDocument, renderPageToCanvas } = require('@/lib/pdfjs-integration');
      
      const mockDocument = {
        numPages: 5,
        getPage: vi.fn().mockResolvedValue({
          getViewport: vi.fn(() => ({ width: 800, height: 600 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
        destroy: vi.fn(),
      };
      
      loadPDFDocument.mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });
      
      renderPageToCanvas.mockResolvedValue({
        canvas: document.createElement('canvas'),
        viewport: { width: 800, height: 600 },
        renderTime: 500,
      });
      
      render(<PDFViewerWithPDFJS {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
      });
    });
  });

  describe('Props', () => {
    it('should accept pdfUrl prop', () => {
      const { loadPDFDocument } = require('@/lib/pdfjs-integration');
      loadPDFDocument.mockImplementation(() => new Promise(() => {}));
      
      render(<PDFViewerWithPDFJS {...defaultProps} pdfUrl="https://example.com/custom.pdf" />);
      
      expect(loadPDFDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'https://example.com/custom.pdf',
        })
      );
    });

    it('should render watermark when provided', async () => {
      const { loadPDFDocument, renderPageToCanvas } = require('@/lib/pdfjs-integration');
      
      const mockDocument = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getViewport: vi.fn(() => ({ width: 800, height: 600 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
        destroy: vi.fn(),
      };
      
      loadPDFDocument.mockResolvedValue({
        document: mockDocument,
        numPages: 1,
        loadTime: 1000,
      });
      
      renderPageToCanvas.mockResolvedValue({
        canvas: document.createElement('canvas'),
        viewport: { width: 800, height: 600 },
        renderTime: 500,
      });
      
      const watermark = {
        text: 'CONFIDENTIAL',
        opacity: 0.3,
        fontSize: 48,
      };
      
      render(<PDFViewerWithPDFJS {...defaultProps} watermark={watermark} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('watermark')).toBeInTheDocument();
        expect(screen.getByText('CONFIDENTIAL')).toBeInTheDocument();
      });
    });
  });

  describe('Callbacks', () => {
    it('should call onLoadComplete when PDF loads', async () => {
      const { loadPDFDocument } = require('@/lib/pdfjs-integration');
      const onLoadComplete = vi.fn();
      
      const mockDocument = {
        numPages: 10,
        getPage: vi.fn().mockResolvedValue({
          getViewport: vi.fn(() => ({ width: 800, height: 600 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
        destroy: vi.fn(),
      };
      
      loadPDFDocument.mockResolvedValue({
        document: mockDocument,
        numPages: 10,
        loadTime: 1000,
      });
      
      render(<PDFViewerWithPDFJS {...defaultProps} onLoadComplete={onLoadComplete} />);
      
      await waitFor(() => {
        expect(onLoadComplete).toHaveBeenCalledWith(10);
      });
    });

    it('should call onError when loading fails', async () => {
      const { loadPDFDocument } = require('@/lib/pdfjs-integration');
      const { PDFDocumentLoaderError } = require('@/lib/pdfjs-integration');
      const onError = vi.fn();
      
      loadPDFDocument.mockRejectedValue(
        new PDFDocumentLoaderError('Failed to load', 'NETWORK_ERROR')
      );
      
      render(<PDFViewerWithPDFJS {...defaultProps} onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error when PDF.js is not available', async () => {
      const { isPDFJSAvailable } = require('@/lib/pdfjs-config');
      isPDFJSAvailable.mockReturnValue(false);
      
      render(<PDFViewerWithPDFJS {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('viewer-error')).toBeInTheDocument();
        expect(screen.getByText(/PDF.js library is not available/i)).toBeInTheDocument();
      });
    });

    it('should display error when PDF URL is invalid', async () => {
      render(<PDFViewerWithPDFJS {...defaultProps} pdfUrl="" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('viewer-error')).toBeInTheDocument();
        expect(screen.getByText(/Invalid PDF URL/i)).toBeInTheDocument();
      });
    });

    it('should display specific error message for timeout', async () => {
      const { loadPDFDocument } = require('@/lib/pdfjs-integration');
      const { PDFDocumentLoaderError } = require('@/lib/pdfjs-integration');
      
      loadPDFDocument.mockRejectedValue(
        new PDFDocumentLoaderError('Timeout', 'TIMEOUT')
      );
      
      render(<PDFViewerWithPDFJS {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/timed out/i)).toBeInTheDocument();
      });
    });

    it('should display specific error message for invalid PDF', async () => {
      const { loadPDFDocument } = require('@/lib/pdfjs-integration');
      const { PDFDocumentLoaderError } = require('@/lib/pdfjs-integration');
      
      loadPDFDocument.mockRejectedValue(
        new PDFDocumentLoaderError('Invalid', 'INVALID_PDF')
      );
      
      render(<PDFViewerWithPDFJS {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/not a valid PDF/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup PDF document on unmount', async () => {
      const { loadPDFDocument, destroyPDFDocument } = require('@/lib/pdfjs-integration');
      
      const mockDocument = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getViewport: vi.fn(() => ({ width: 800, height: 600 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
        destroy: vi.fn(),
      };
      
      loadPDFDocument.mockResolvedValue({
        document: mockDocument,
        numPages: 1,
        loadTime: 1000,
      });
      
      const { unmount } = render(<PDFViewerWithPDFJS {...defaultProps} />);
      
      await waitFor(() => {
        expect(loadPDFDocument).toHaveBeenCalled();
      });
      
      unmount();
      
      expect(destroyPDFDocument).toHaveBeenCalledWith(mockDocument);
    });

    it('should cleanup canvas on unmount', async () => {
      const { loadPDFDocument, renderPageToCanvas, cleanupCanvas } = require('@/lib/pdfjs-integration');
      
      const mockDocument = {
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getViewport: vi.fn(() => ({ width: 800, height: 600 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
        destroy: vi.fn(),
      };
      
      const mockCanvas = document.createElement('canvas');
      
      loadPDFDocument.mockResolvedValue({
        document: mockDocument,
        numPages: 1,
        loadTime: 1000,
      });
      
      renderPageToCanvas.mockResolvedValue({
        canvas: mockCanvas,
        viewport: { width: 800, height: 600 },
        renderTime: 500,
      });
      
      const { unmount } = render(<PDFViewerWithPDFJS {...defaultProps} />);
      
      await waitFor(() => {
        expect(renderPageToCanvas).toHaveBeenCalled();
      });
      
      unmount();
      
      expect(cleanupCanvas).toHaveBeenCalled();
    });
  });
});
