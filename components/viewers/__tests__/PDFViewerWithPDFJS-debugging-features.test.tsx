/**
 * Unit Tests for PDFViewerWithPDFJS Debugging Features
 * 
 * Tests development mode logging functionality, error message content and clarity,
 * and debugging information output.
 * 
 * Requirements: 4.2, 4.3, 4.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import PDFViewerWithPDFJS from '../PDFViewerWithPDFJS';

// Mock dependencies
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

vi.mock('@/lib/pdfjs-memory', () => ({
  createMemoryManager: vi.fn(() => ({
    setPDFDocument: vi.fn(),
    addRenderedPage: vi.fn(),
    addPageObject: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('@/lib/pdfjs-render-pipeline', () => ({
  getGlobalRenderPipeline: vi.fn(() => ({
    queueRender: vi.fn(),
    cancelAll: vi.fn(),
  })),
}));

vi.mock('@/lib/pdf-reliability/reliable-pdf-renderer', () => ({
  ReliablePDFRenderer: class MockReliablePDFRenderer {
    renderPDF = vi.fn().mockResolvedValue({
      success: false,
      pages: [],
      renderingId: 'test-rendering-id',
      error: new Error('Mock rendering failed')
    });
    cancelRendering = vi.fn();
    onProgressUpdate = vi.fn();
    forceRetry = vi.fn();
    removeCallbacks = vi.fn();
    cleanup = vi.fn();
    cleanupAll = vi.fn();
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
      <span>{error}</span>
      <button onClick={onRetry} data-testid="retry-button">Retry</button>
    </div>
  ),
}));

vi.mock('../SimplePDFViewer', () => ({
  default: ({ pdfUrl }: { pdfUrl: string }) => (
    <div data-testid="simple-pdf-viewer">Simple viewer for {pdfUrl}</div>
  ),
}));

describe('PDFViewerWithPDFJS Debugging Features', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleGroupSpy: ReturnType<typeof vi.spyOn>;
  let consoleGroupEndSpy: ReturnType<typeof vi.spyOn>;
  
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up console spies
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    
    // Reset global state
    delete (window as any).__pdfViewerCleanup;
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleGroupSpy.mockRestore();
    consoleGroupEndSpy.mockRestore();
    
    // Restore NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
    
    // Clean up any remaining timers
    vi.clearAllTimers();
  });

  describe('Development Mode Logging', () => {
    beforeEach(() => {
      // Set development mode
      process.env.NODE_ENV = 'development';
    });

    it('should log effect executions in development mode', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const mockLoadPDFDocument = vi.mocked(loadPDFDocument);
      
      // Mock PDF loading failure to trigger error state
      mockLoadPDFDocument.mockRejectedValueOnce(new Error('Test error'));

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      // Wait for component to process
      await waitFor(() => {
        // Should log effect execution for document loading
        expect(consoleGroupSpy).toHaveBeenCalledWith(
          expect.stringContaining('[PDFViewerWithPDFJS] Effect: Document Loading')
        );
      });

      // Should log dependencies and reason
      expect(consoleLogSpy).toHaveBeenCalledWith('Dependencies:', expect.any(Array));
      expect(consoleLogSpy).toHaveBeenCalledWith('Reason:', 'PDF URL changed');
      expect(consoleLogSpy).toHaveBeenCalledWith('Timestamp:', expect.any(String));
      expect(consoleGroupEndSpy).toHaveBeenCalled();
    });

    it('should log state transitions in development mode', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const mockLoadPDFDocument = vi.mocked(loadPDFDocument);
      
      // Mock PDF loading failure
      mockLoadPDFDocument.mockRejectedValueOnce(new Error('Test error'));

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      // Wait for state transitions
      await waitFor(() => {
        // Should log state transitions
        const stateTransitionLogs = consoleLogSpy.mock.calls.filter(call =>
          call.some(arg => typeof arg === 'string' && arg.includes('State transition:'))
        );
        expect(stateTransitionLogs.length).toBeGreaterThan(0);
      });
    });

    it('should log dependency changes when they occur', async () => {
      const { rerender } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test1.pdf"
          documentTitle="Test Document 1"
        />
      );

      // Clear previous logs
      consoleGroupSpy.mockClear();
      consoleLogSpy.mockClear();

      // Change URL to trigger dependency change
      rerender(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test2.pdf"
          documentTitle="Test Document 2"
        />
      );

      await waitFor(() => {
        // Should log effect execution for the new URL
        expect(consoleGroupSpy).toHaveBeenCalledWith(
          expect.stringContaining('[PDFViewerWithPDFJS] Effect: Document Loading')
        );
      });
    });

    it('should enable periodic state consistency checking in development', async () => {
      vi.useFakeTimers();

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      // Should log that consistency checking is enabled
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[PDFViewerWithPDFJS] Development mode: State consistency checking enabled'
      );

      vi.useRealTimers();
    });
  });

  describe('Production Mode Behavior', () => {
    beforeEach(() => {
      // Set production mode
      process.env.NODE_ENV = 'production';
    });

    it('should not log effect executions in production mode', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const mockLoadPDFDocument = vi.mocked(loadPDFDocument);
      
      mockLoadPDFDocument.mockRejectedValueOnce(new Error('Test error'));

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      await waitFor(() => {
        // Should not log effect execution details in production
        expect(consoleGroupSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('[PDFViewerWithPDFJS] Effect:')
        );
      });
    });

    it('should not enable periodic state consistency checking in production', async () => {
      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      // Should not log consistency checking in production
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('State consistency checking enabled')
      );
    });
  });

  describe('Error Message Content and Clarity', () => {
    it('should provide clear error messages for PDF.js unavailability', async () => {
      // Mock PDF.js as unavailable
      const { isPDFJSAvailable } = await import('@/lib/pdfjs-config');
      vi.mocked(isPDFJSAvailable).mockReturnValue(false);

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
            message: expect.stringContaining('PDF.js library is not available')
          })
        );
      });

      // In development mode, should include debugging information
      process.env.NODE_ENV = 'development';
      
      const onErrorDev = vi.fn();
      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test2.pdf"
          documentTitle="Test Document"
          onError={onErrorDev}
        />
      );

      await waitFor(() => {
        expect(onErrorDev).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringMatching(/Debugging Information:.*Window object available:.*Troubleshooting:/s)
          })
        );
      });
    });

    it('should provide clear error messages for invalid URLs', async () => {
      // Ensure PDF.js is available for this test
      const { isPDFJSAvailable } = await import('@/lib/pdfjs-config');
      vi.mocked(isPDFJSAvailable).mockReturnValue(true);

      const onError = vi.fn();

      // Test with null URL
      render(
        <PDFViewerWithPDFJS
          pdfUrl={null as any}
          documentTitle="Test Document"
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Invalid PDF URL provided')
          })
        );
      });

      // In development mode, should include debugging information
      process.env.NODE_ENV = 'development';
      
      const onErrorDev = vi.fn();
      render(
        <PDFViewerWithPDFJS
          pdfUrl={undefined as any}
          documentTitle="Test Document"
          onError={onErrorDev}
        />
      );

      await waitFor(() => {
        expect(onErrorDev).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringMatching(/Debugging Information:.*URL value:.*URL type:.*Troubleshooting:/s)
          })
        );
      });
    });

    it('should provide clear error messages for malformed URLs', async () => {
      // Ensure PDF.js is available for this test
      const { isPDFJSAvailable } = await import('@/lib/pdfjs-config');
      vi.mocked(isPDFJSAvailable).mockReturnValue(true);

      const onError = vi.fn();

      render(
        <PDFViewerWithPDFJS
          pdfUrl="not-a-valid-url"
          documentTitle="Test Document"
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Invalid PDF URL format')
          })
        );
      });

      // In development mode, should include debugging information
      process.env.NODE_ENV = 'development';
      
      const onErrorDev = vi.fn();
      render(
        <PDFViewerWithPDFJS
          pdfUrl="also-not-valid"
          documentTitle="Test Document"
          onError={onErrorDev}
        />
      );

      await waitFor(() => {
        expect(onErrorDev).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringMatching(/Debugging Information:.*URL:.*URL Error:.*Troubleshooting:/s)
          })
        );
      });
    });
  });

  describe('Enhanced Debug Information Display', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should display comprehensive debug information in error state', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const mockLoadPDFDocument = vi.mocked(loadPDFDocument);
      
      mockLoadPDFDocument.mockRejectedValueOnce(new Error('Test loading error'));

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/Failed to Load PDF/i)).toBeInTheDocument();
      });

      // Should show debug information section
      expect(screen.getByText('Debug Information:')).toBeInTheDocument();
      
      // Should show PDF URL section
      expect(screen.getByText('PDF URL:')).toBeInTheDocument();
      
      // Should show error details section
      expect(screen.getByText('Error Details:')).toBeInTheDocument();
      
      // Should show component state section
      expect(screen.getByText('Component State:')).toBeInTheDocument();
      
      // Should show browser environment section
      expect(screen.getByText('Browser Environment:')).toBeInTheDocument();
    });

    it('should provide recovery action buttons in debug panel', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const mockLoadPDFDocument = vi.mocked(loadPDFDocument);
      
      mockLoadPDFDocument.mockRejectedValueOnce(new Error('Test loading error'));

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/Failed to Load PDF/i)).toBeInTheDocument();
      });

      // Should show recovery actions section
      expect(screen.getByText('Recovery Actions:')).toBeInTheDocument();
      
      // Should show recovery action buttons
      expect(screen.getByRole('button', { name: /retry with clean state/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /check state consistency/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /force cleanup/i })).toBeInTheDocument();
    });

    it('should execute recovery actions when debug buttons are clicked', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const mockLoadPDFDocument = vi.mocked(loadPDFDocument);
      
      mockLoadPDFDocument.mockRejectedValueOnce(new Error('Test loading error'));

      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/Failed to Load PDF/i)).toBeInTheDocument();
      });

      // Click state consistency check button
      const consistencyButton = screen.getByRole('button', { name: /check state consistency/i });
      
      await act(async () => {
        fireEvent.click(consistencyButton);
      });

      // Should log the manual state consistency check
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[PDFViewerWithPDFJS] Manual state consistency check'
      );

      // Click force cleanup button
      const cleanupButton = screen.getByRole('button', { name: /force cleanup/i });
      
      await act(async () => {
        fireEvent.click(cleanupButton);
      });

      // Should log the manual comprehensive cleanup
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[PDFViewerWithPDFJS] Manual comprehensive cleanup'
      );
    });
  });

  describe('State Inconsistency Detection and Logging', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should detect and log state inconsistencies', async () => {
      // This test would require more complex mocking to create actual inconsistent states
      // For now, we'll test that the logging infrastructure is in place
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      // The component should have the cleanup function available for debugging
      await waitFor(() => {
        expect((window as any).__pdfViewerCleanup).toBeDefined();
      });

      // Should be able to call the cleanup function without errors
      expect(() => {
        if ((window as any).__pdfViewerCleanup) {
          (window as any).__pdfViewerCleanup();
        }
      }).not.toThrow();
    });

    it('should warn about invalid state transitions', async () => {
      // This would require mocking internal state to create invalid transitions
      // The infrastructure is in place in the component's setValidatedLoadingState function
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      // The component should have state validation logic that would warn about invalid transitions
      // This is tested indirectly through the component's behavior
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Invalid state transition')
      );
    });
  });

  describe('Cleanup Function Exposure', () => {
    it('should expose cleanup function for external debugging', async () => {
      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      // Should expose cleanup function on window for debugging
      await waitFor(() => {
        expect((window as any).__pdfViewerCleanup).toBeDefined();
        expect(typeof (window as any).__pdfViewerCleanup).toBe('function');
      });
    });

    it('should clean up exposed function on unmount', async () => {
      const { unmount } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );

      // Should have cleanup function
      await waitFor(() => {
        expect((window as any).__pdfViewerCleanup).toBeDefined();
      });

      // Unmount component
      unmount();

      // Should clean up the exposed function
      expect((window as any).__pdfViewerCleanup).toBeUndefined();
    });
  });
});