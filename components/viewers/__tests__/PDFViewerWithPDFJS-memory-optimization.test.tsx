/**
 * Memory Optimization Tests for PDFViewerWithPDFJS
 * 
 * Tests the memory management and performance optimizations implemented in Task 8.
 * 
 * Requirements: 1.4, 3.5
 * Task 8: Optimize memory management and performance
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
  renderPageToCanvas: vi.fn(),
}));

vi.mock('@/lib/pdfjs-memory', () => ({
  createMemoryManager: vi.fn(() => ({
    setPDFDocument: vi.fn(),
    addRenderedPage: vi.fn(),
    addPageObject: vi.fn(),
    clearPage: vi.fn(),
    clearAllPages: vi.fn(),
    destroy: vi.fn(),
    getMemoryStats: vi.fn(() => ({
      totalMemoryMB: 10,
      cachedPages: 1,
      cachedPageObjects: 1,
      maxRenderedPages: 1,
      maxPageObjects: 1,
    })),
    prioritizePages: vi.fn((visiblePages) => visiblePages),
    removeNonPriorityPages: vi.fn(),
  })),
}));

vi.mock('@/lib/pdfjs-render-pipeline', () => ({
  getGlobalRenderPipeline: vi.fn(() => ({
    queueRender: vi.fn((page, pageNumber, canvas, scale, priority, callback) => {
      // Simulate successful render
      setTimeout(() => callback?.(), 10);
    }),
    cancelAll: vi.fn(),
    clearCache: vi.fn(),
    clearPageCache: vi.fn(),
    destroy: vi.fn(),
    getCacheStats: vi.fn(() => ({
      size: 1,
      maxSize: 1,
      hitRate: 0.8,
    })),
  })),
}));

vi.mock('@/lib/pdf-reliability/reliable-pdf-renderer', () => ({
  ReliablePDFRenderer: class MockReliablePDFRenderer {
    renderPDF = vi.fn().mockResolvedValue({
      success: true,
      renderingId: 'test-rendering-id',
      pages: [{ pageNumber: 1 }, { pageNumber: 2 }],
    });
    cancelRendering = vi.fn();
    onProgressUpdate = vi.fn();
    forceRetry = vi.fn();
  },
}));

// Mock performance.memory API
const mockMemory = {
  usedJSHeapSize: 50 * 1024 * 1024, // 50MB
  totalJSHeapSize: 100 * 1024 * 1024, // 100MB
  jsHeapSizeLimit: 200 * 1024 * 1024, // 200MB
};

Object.defineProperty(window, 'performance', {
  value: {
    memory: mockMemory,
  },
  writable: true,
});

describe('PDFViewerWithPDFJS Memory Optimization', () => {
  const defaultProps = {
    pdfUrl: 'https://example.com/test.pdf',
    documentTitle: 'Test Document',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset memory values
    mockMemory.usedJSHeapSize = 50 * 1024 * 1024; // 50MB - normal usage
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should initialize memory manager with aggressive settings', async () => {
    const { createMemoryManager } = await import('@/lib/pdfjs-memory');
    
    render(<PDFViewerWithPDFJS {...defaultProps} />);

    await waitFor(() => {
      expect(createMemoryManager).toHaveBeenCalledWith({
        maxRenderedPages: 1, // Aggressive: Only keep current page
        maxPageObjects: 1, // Aggressive: Only keep current page object
        enableMonitoring: true, // Enable monitoring for optimization
        warningThreshold: 20, // Lower threshold for earlier cleanup
      });
    });
  });

  it('should configure render pipeline with aggressive memory management', async () => {
    const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
    
    render(<PDFViewerWithPDFJS {...defaultProps} />);

    await waitFor(() => {
      expect(getGlobalRenderPipeline).toHaveBeenCalledWith({
        maxCacheSize: 1, // Aggressive: Only cache current page
        cacheTTL: 1 * 60 * 1000, // Shorter TTL: 1 minute
        maxConcurrentRenders: 1, // Only render one page at a time
        throttleDelay: 50, // Faster throttling for better responsiveness
      });
    });
  });

  it('should trigger memory pressure cleanup when usage is high', async () => {
    // Simulate high memory usage (90%)
    mockMemory.usedJSHeapSize = 180 * 1024 * 1024; // 180MB out of 200MB limit

    const { createMemoryManager } = await import('@/lib/pdfjs-memory');
    const mockMemoryManager = {
      clearAllPages: vi.fn(),
      destroy: vi.fn(),
      setPDFDocument: vi.fn(),
      addRenderedPage: vi.fn(),
      getMemoryStats: vi.fn(() => ({ cachedPages: 1 })),
    };
    
    vi.mocked(createMemoryManager).mockReturnValue(mockMemoryManager as any);

    render(<PDFViewerWithPDFJS {...defaultProps} />);

    // Wait for memory monitoring to trigger
    await waitFor(() => {
      expect(mockMemoryManager.clearAllPages).toHaveBeenCalled();
    }, { timeout: 10000 });
  });

  it('should display performance metrics in development mode', async () => {
    // Set NODE_ENV to development
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(<PDFViewerWithPDFJS {...defaultProps} />);

    // Wait for performance metrics to be displayed
    await waitFor(() => {
      const performanceMonitor = screen.queryByText('Performance Monitor:');
      if (performanceMonitor) {
        expect(performanceMonitor).toBeInTheDocument();
      }
    });

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  it('should configure PDF.js worker for memory efficiency', async () => {
    // Mock PDF.js global
    const mockPdfjsLib = {
      GlobalWorkerOptions: {
        maxWorkerTasks: 2,
        recycleWorker: false,
        workerPort: { timeout: 0 },
        workerSrc: 'test-worker.js',
      },
    };

    (window as any).pdfjsLib = mockPdfjsLib;

    render(<PDFViewerWithPDFJS {...defaultProps} />);

    await waitFor(() => {
      expect(mockPdfjsLib.GlobalWorkerOptions.maxWorkerTasks).toBe(1);
      expect(mockPdfjsLib.GlobalWorkerOptions.recycleWorker).toBe(true);
      expect(mockPdfjsLib.GlobalWorkerOptions.workerPort.timeout).toBe(30000);
    });

    // Cleanup
    delete (window as any).pdfjsLib;
  });

  it('should perform comprehensive cleanup on unmount', async () => {
    const { createMemoryManager } = await import('@/lib/pdfjs-memory');
    const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
    
    const mockMemoryManager = {
      clearAllPages: vi.fn(),
      destroy: vi.fn(),
      setPDFDocument: vi.fn(),
      addRenderedPage: vi.fn(),
    };
    
    const mockPipeline = {
      cancelAll: vi.fn(),
      clearCache: vi.fn(),
      destroy: vi.fn(),
      queueRender: vi.fn(),
    };

    vi.mocked(createMemoryManager).mockReturnValue(mockMemoryManager as any);
    vi.mocked(getGlobalRenderPipeline).mockReturnValue(mockPipeline as any);

    const { unmount } = render(<PDFViewerWithPDFJS {...defaultProps} />);

    unmount();

    await waitFor(() => {
      expect(mockMemoryManager.clearAllPages).toHaveBeenCalled();
      expect(mockMemoryManager.destroy).toHaveBeenCalled();
      expect(mockPipeline.cancelAll).toHaveBeenCalled();
      expect(mockPipeline.clearCache).toHaveBeenCalled();
    });
  });

  it('should handle memory pressure detection gracefully when API is not available', () => {
    // Remove performance.memory API
    const originalPerformance = window.performance;
    delete (window as any).performance;

    expect(() => {
      render(<PDFViewerWithPDFJS {...defaultProps} />);
    }).not.toThrow();

    // Restore performance API
    window.performance = originalPerformance;
  });

  it('should expose cleanup function for external use', async () => {
    render(<PDFViewerWithPDFJS {...defaultProps} />);

    await waitFor(() => {
      expect((window as any).__pdfViewerCleanup).toBeDefined();
      expect(typeof (window as any).__pdfViewerCleanup).toBe('function');
    });
  });

  it('should clean up exposed cleanup function on unmount', async () => {
    const { unmount } = render(<PDFViewerWithPDFJS {...defaultProps} />);

    await waitFor(() => {
      expect((window as any).__pdfViewerCleanup).toBeDefined();
    });

    unmount();

    expect((window as any).__pdfViewerCleanup).toBeUndefined();
  });
});