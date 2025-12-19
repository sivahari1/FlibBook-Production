/**
 * Simple test to isolate the infinite loop issue
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
    cancelAll: vi.fn(),
    destroy: vi.fn(),
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

describe('PDFViewerWithPDFJS Simple Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not call document loading effect multiple times for same URL', async () => {
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
    const { rerender } = render(
      <PDFViewerWithPDFJS
        pdfUrl="https://example.com/test.pdf"
        documentTitle="Test Document"
      />
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Wait a bit for effects to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    // Clear mock calls after initial load
    mockLoadPDFDocument.mockClear();

    // Re-render with same URL but different title
    await act(async () => {
      rerender(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf" // Same URL
          documentTitle="Updated Test Document" // Different title
        />
      );
    });

    // Wait a bit for any potential re-executions
    await new Promise(resolve => setTimeout(resolve, 200));

    // Document loading should not have been called again
    expect(mockLoadPDFDocument).toHaveBeenCalledTimes(0);
  }, 10000);
});