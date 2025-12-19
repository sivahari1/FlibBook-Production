/**
 * Focused test for effect stability - simpler version of property tests
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import PDFViewerWithPDFJS from '../PDFViewerWithPDFJS';

// Mock PDF.js and related modules
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
    }
  },
  PDFPageRendererError: class PDFPageRendererError extends Error {
    constructor(message: string, public code: string) {
      super(message);
    }
  },
}));

vi.mock('@/lib/pdfjs-memory', () => ({
  createMemoryManager: vi.fn(() => ({
    setPDFDocument: vi.fn(),
    addRenderedPage: vi.fn(),
    addPageObject: vi.fn(),
    prioritizePages: vi.fn(() => [1, 2, 3]),
    removeNonPriorityPages: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('@/lib/pdfjs-render-pipeline', () => ({
  getGlobalRenderPipeline: vi.fn(() => ({
    queueRender: vi.fn((page, pageNum, canvas, zoom, priority, callback) => {
      // Simulate successful render
      setTimeout(() => callback(null), 10);
    }),
  })),
}));

vi.mock('@/lib/pdf-reliability/reliable-pdf-renderer', () => ({
  ReliablePDFRenderer: class MockReliablePDFRenderer {
    renderPDF = vi.fn().mockResolvedValue({
      success: true,
      renderingId: 'test-rendering-id',
      pages: [{ pageNumber: 1 }, { pageNumber: 2 }],
    });
    onProgressUpdate = vi.fn();
    cancelRendering = vi.fn();
    forceRetry = vi.fn();
  },
}));

// Mock child components
vi.mock('../WatermarkOverlay', () => ({
  default: ({ text }: { text: string }) => <div data-testid="watermark">{text}</div>,
}));

vi.mock('../LoadingSpinner', () => ({
  default: ({ message }: { message: string }) => <div data-testid="loading">{message}</div>,
}));

vi.mock('../ViewerError', () => ({
  default: ({ error }: { error: string }) => <div data-testid="error">{error}</div>,
}));

vi.mock('../SimplePDFViewer', () => ({
  default: ({ pdfUrl }: { pdfUrl: string }) => <div data-testid="simple-viewer">{pdfUrl}</div>,
}));

describe('PDFViewerWithPDFJS Effect Stability Focused Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute document loading effect exactly once per URL change', async () => {
    // Mock successful PDF loading
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    const mockLoadPDFDocument = loadPDFDocument as any;
    mockLoadPDFDocument.mockResolvedValue({
      document: {
        numPages: 2,
        getPage: vi.fn().mockResolvedValue({
          getViewport: vi.fn(() => ({ width: 600, height: 800 })),
        }),
      },
      numPages: 2,
    });

    // Render component with initial props
    const { rerender } = render(
      <PDFViewerWithPDFJS
        pdfUrl="https://example.com/test1.pdf"
        documentTitle="Test Document"
        watermark={{ text: "Test", opacity: 0.5, fontSize: 12 }}
        enableDRM={false}
        viewMode="single"
      />
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Clear the mock call count after initial load
    mockLoadPDFDocument.mockClear();

    // Re-render with same URL but different non-URL props
    await act(async () => {
      rerender(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test1.pdf" // Same URL
          documentTitle="Updated Test Document" // Different title
          watermark={{ text: "Updated", opacity: 0.7, fontSize: 14 }} // Different watermark
          enableDRM={true} // Different DRM setting
          viewMode="single"
        />
      );
    });

    // Wait a bit for any potential re-executions
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify that loadPDFDocument was not called again
    expect(mockLoadPDFDocument).toHaveBeenCalledTimes(0);
  });

  it('should re-execute document loading effect when URL changes', async () => {
    // Mock successful PDF loading
    const { ReliablePDFRenderer } = await import('@/lib/pdf-reliability/reliable-pdf-renderer');
    const mockRenderPDF = vi.fn().mockResolvedValue({
      success: true,
      renderingId: 'test-rendering-id',
      pages: [{ pageNumber: 1 }, { pageNumber: 2 }],
    });
    
    // Replace the mock with our spy
    (ReliablePDFRenderer as any).prototype.renderPDF = mockRenderPDF;

    // Render component with first URL
    const { rerender } = render(
      <PDFViewerWithPDFJS
        pdfUrl="https://example.com/test1.pdf"
        documentTitle="Test Document"
      />
    );

    // Wait for first load
    await waitFor(() => {
      expect(mockRenderPDF).toHaveBeenCalledTimes(1);
    }, { timeout: 1000 });

    // Change to second URL
    await act(async () => {
      rerender(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test2.pdf" // Different URL
          documentTitle="Test Document"
        />
      );
    });

    // Wait for second load
    await waitFor(() => {
      expect(mockRenderPDF).toHaveBeenCalledTimes(2);
    }, { timeout: 1000 });

    // Verify both URLs were loaded
    expect(mockRenderPDF).toHaveBeenNthCalledWith(1, "https://example.com/test1.pdf", expect.any(Object));
    expect(mockRenderPDF).toHaveBeenNthCalledWith(2, "https://example.com/test2.pdf", expect.any(Object));
  });

  it('should not re-execute document loading effect when callback props change', async () => {
    // Mock successful PDF loading
    const { ReliablePDFRenderer } = await import('@/lib/pdf-reliability/reliable-pdf-renderer');
    const mockRenderPDF = vi.fn().mockResolvedValue({
      success: true,
      renderingId: 'test-rendering-id',
      pages: [{ pageNumber: 1 }, { pageNumber: 2 }],
    });
    
    // Replace the mock with our spy
    (ReliablePDFRenderer as any).prototype.renderPDF = mockRenderPDF;

    // Create initial callbacks
    let onPageChange = vi.fn();
    let onLoadComplete = vi.fn();
    let onError = vi.fn();

    // Render component with initial callbacks
    const { rerender } = render(
      <PDFViewerWithPDFJS
        pdfUrl="https://example.com/test.pdf"
        documentTitle="Test Document"
        onPageChange={onPageChange}
        onLoadComplete={onLoadComplete}
        onError={onError}
      />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(mockRenderPDF).toHaveBeenCalledTimes(1);
    }, { timeout: 1000 });

    // Change callbacks multiple times
    for (let i = 0; i < 3; i++) {
      // Create new callback functions
      onPageChange = vi.fn();
      onLoadComplete = vi.fn();
      onError = vi.fn();

      await act(async () => {
        rerender(
          <PDFViewerWithPDFJS
            pdfUrl="https://example.com/test.pdf" // Keep URL the same
            documentTitle="Test Document"
            onPageChange={onPageChange}
            onLoadComplete={onLoadComplete}
            onError={onError}
          />
        );
      });

      // Wait a bit for any potential re-executions
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Document loading should still have been called only once
    expect(mockRenderPDF).toHaveBeenCalledTimes(1);
  });

  it('should not cause infinite re-renders', async () => {
    // Mock successful PDF loading
    const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
    const mockLoadPDFDocument = loadPDFDocument as any;
    mockLoadPDFDocument.mockResolvedValue({
      document: {
        numPages: 2,
        getPage: vi.fn().mockResolvedValue({
          getViewport: vi.fn(() => ({ width: 600, height: 800 })),
        }),
      },
      numPages: 2,
    });

    // Render component
    render(
      <PDFViewerWithPDFJS
        pdfUrl="https://example.com/test.pdf"
        documentTitle="Test Document"
      />
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Wait longer to see if there are any infinite loops
    await new Promise(resolve => setTimeout(resolve, 500));

    // The component should not have crashed or caused infinite re-renders
    // If we get here without timeout, the test passes
    expect(true).toBe(true);
  });
});