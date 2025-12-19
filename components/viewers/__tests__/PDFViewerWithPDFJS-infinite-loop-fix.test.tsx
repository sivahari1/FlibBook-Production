/**
 * Test to verify the infinite loop fix is working
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

// Create a spy for the ReliablePDFRenderer
const mockRenderPDF = vi.fn().mockResolvedValue({
  success: true,
  renderingId: 'test-rendering-id',
  pages: [{ pageNumber: 1 }, { pageNumber: 2 }],
});

const mockOnProgressUpdate = vi.fn();
const mockCancelRendering = vi.fn();
const mockForceRetry = vi.fn();

vi.mock('@/lib/pdf-reliability/reliable-pdf-renderer', () => ({
  ReliablePDFRenderer: class MockReliablePDFRenderer {
    renderPDF = mockRenderPDF;
    onProgressUpdate = mockOnProgressUpdate;
    cancelRendering = mockCancelRendering;
    forceRetry = mockForceRetry;
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

describe('PDFViewerWithPDFJS Infinite Loop Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderPDF.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not cause infinite re-renders or maximum update depth exceeded errors', async () => {
    // This test verifies that the component doesn't crash with infinite loops
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    try {
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
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check that no "Maximum update depth exceeded" errors occurred
      const errorCalls = consoleErrorSpy.mock.calls;
      const hasMaxUpdateDepthError = errorCalls.some(call => 
        call.some(arg => 
          typeof arg === 'string' && 
          arg.includes('Maximum update depth exceeded')
        )
      );

      expect(hasMaxUpdateDepthError).toBe(false);

      // The component should render successfully without crashing
      // It should either be loading or have loaded successfully (showing the toolbar)
      const hasLoadingOrToolbar = screen.queryByTestId('loading') || screen.queryByTestId('pdfjs-toolbar');
      expect(hasLoadingOrToolbar).toBeTruthy();
      
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('should not re-execute document loading when non-URL props change', async () => {
    // Render component with initial props
    const { rerender } = render(
      <PDFViewerWithPDFJS
        pdfUrl="https://example.com/test.pdf"
        documentTitle="Test Document"
        watermark={{ text: "Test", opacity: 0.5, fontSize: 12 }}
      />
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Clear mock calls after initial render
    mockRenderPDF.mockClear();

    // Re-render with same URL but different props
    await act(async () => {
      rerender(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf" // Same URL
          documentTitle="Updated Test Document" // Different title
          watermark={{ text: "Updated", opacity: 0.7, fontSize: 14 }} // Different watermark
        />
      );
    });

    // Wait a bit for any potential re-executions
    await new Promise(resolve => setTimeout(resolve, 200));

    // Document loading should not have been called again
    expect(mockRenderPDF).toHaveBeenCalledTimes(0);
  });

  it('should handle prop changes without causing circular dependencies', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    try {
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

      // Rapidly change props multiple times to test stability
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          rerender(
            <PDFViewerWithPDFJS
              pdfUrl="https://example.com/test.pdf"
              documentTitle={`Test Document ${i}`}
              watermark={{ text: `Test ${i}`, opacity: 0.5 + (i * 0.1), fontSize: 12 + i }}
              enableDRM={i % 2 === 0}
              viewMode={i % 2 === 0 ? 'single' : 'continuous'}
            />
          );
        });
        
        // Small delay between changes
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Check that no errors occurred
      const errorCalls = consoleErrorSpy.mock.calls;
      const hasReactErrors = errorCalls.some(call => 
        call.some(arg => 
          typeof arg === 'string' && 
          (arg.includes('Maximum update depth exceeded') || 
           arg.includes('Cannot update a component') ||
           arg.includes('infinite loop'))
        )
      );

      expect(hasReactErrors).toBe(false);
      
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('should execute document loading effect when URL changes', async () => {
    // Render component with first URL
    const { rerender } = render(
      <PDFViewerWithPDFJS
        pdfUrl="https://example.com/test1.pdf"
        documentTitle="Test Document"
      />
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Verify initial call
    expect(mockRenderPDF).toHaveBeenCalledWith("https://example.com/test1.pdf", expect.any(Object));
    const initialCallCount = mockRenderPDF.mock.calls.length;

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
      expect(mockRenderPDF).toHaveBeenCalledWith("https://example.com/test2.pdf", expect.any(Object));
    }, { timeout: 1000 });

    // Should have been called one more time
    expect(mockRenderPDF.mock.calls.length).toBe(initialCallCount + 1);
  });
});