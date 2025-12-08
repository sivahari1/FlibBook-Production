/**
 * PDFViewerWithPDFJS Integration Tests
 * 
 * Tests the integration between PDF.js, Canvas rendering, Watermarks,
 * DRM protections, Navigation controls, and Error handling.
 * 
 * Requirements: All - Integration testing across all components
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PDFViewerWithPDFJS from '../PDFViewerWithPDFJS';
import type { PDFDocument, PDFPage } from '@/lib/types/pdfjs';

// Mock modules
vi.mock('@/lib/pdfjs-config', () => ({
  initializePDFJS: vi.fn(),
  isPDFJSAvailable: vi.fn(() => true),
}));

vi.mock('@/lib/pdfjs-integration');
vi.mock('@/lib/pdfjs-memory');
vi.mock('@/lib/pdfjs-render-pipeline');

// Mock child components
vi.mock('../WatermarkOverlay', () => ({
  default: ({ text, opacity }: { text: string; opacity: number }) => (
    <div data-testid="watermark" data-text={text} data-opacity={opacity}>
      {text}
    </div>
  ),
}));

vi.mock('../LoadingSpinner', () => ({
  default: ({ message }: { message: string }) => (
    <div data-testid="loading-spinner">{message}</div>
  ),
}));

// Don't mock ViewerError - use the real component
// vi.mock('../ViewerError');

/**
 * Helper to create mock PDF document
 */
function createMockPDFDocument(numPages: number = 5): PDFDocument {
  const pages = new Map<number, PDFPage>();
  
  for (let i = 1; i <= numPages; i++) {
    const mockPage: PDFPage = {
      pageNumber: i,
      getViewport: vi.fn((params: { scale: number }) => ({
        width: 800 * params.scale,
        height: 600 * params.scale,
        scale: params.scale,
        rotation: 0,
      })),
      render: vi.fn(() => ({
        promise: Promise.resolve(),
        cancel: vi.fn(),
      })),
      cleanup: vi.fn(),
    } as any;
    
    pages.set(i, mockPage);
  }
  
  return {
    numPages,
    getPage: vi.fn((pageNum: number) => Promise.resolve(pages.get(pageNum)!)),
    destroy: vi.fn(),
    fingerprints: ['test-fingerprint'],
  } as any;
}

/**
 * Helper to create mock canvas
 */
function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  return canvas;
}

describe('PDFViewerWithPDFJS Integration Tests', () => {
  let mockDocument: PDFDocument;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocument = createMockPDFDocument(5);
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Integration Test 1: PDF.js + Canvas Rendering Pipeline
   * 
   * Tests that PDF.js successfully loads a document and renders pages to canvas
   * 
   * Requirements: 2.1, 2.2, 2.3
   */
  describe('PDF.js + Canvas Rendering Pipeline', () => {
    it('should load PDF document and render first page to canvas', async () => {
      const { loadPDFDocument, renderPageToCanvas } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
      
      // Mock successful PDF loading
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });
      
      // Mock canvas rendering
      const mockCanvas = createMockCanvas();
      vi.mocked(renderPageToCanvas).mockResolvedValue({
        canvas: mockCanvas,
        viewport: { width: 800, height: 600, scale: 1.0, rotation: 0 },
        renderTime: 500,
      });
      
      // Mock memory manager
      const mockMemoryManager = {
        setPDFDocument: vi.fn(),
        addRenderedPage: vi.fn(),
        addPageObject: vi.fn(),
        prioritizePages: vi.fn(() => [1]),
        removeNonPriorityPages: vi.fn(),
        destroy: vi.fn(),
      };
      vi.mocked(createMemoryManager).mockReturnValue(mockMemoryManager as any);
      
      // Mock render pipeline
      const mockPipeline = {
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          // Simulate successful render
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      };
      vi.mocked(getGlobalRenderPipeline).mockReturnValue(mockPipeline as any);
      
      const onLoadComplete = vi.fn();
      const onRenderComplete = vi.fn();
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          onLoadComplete={onLoadComplete}
          onRenderComplete={onRenderComplete}
        />
      );
      
      // Wait for PDF to load
      await waitFor(() => {
        expect(loadPDFDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            source: 'https://example.com/test.pdf',
          })
        );
      });
      
      // Wait for document to be loaded
      await waitFor(() => {
        expect(onLoadComplete).toHaveBeenCalledWith(5);
      });
      
      // Wait for first page to render
      await waitFor(() => {
        expect(mockPipeline.queueRender).toHaveBeenCalled();
      });
      
      // Verify memory manager was initialized
      expect(mockMemoryManager.setPDFDocument).toHaveBeenCalledWith(mockDocument);
      
      // Verify render pipeline was used
      expect(mockPipeline.queueRender).toHaveBeenCalledWith(
        expect.anything(), // page
        1, // page number
        expect.anything(), // canvas
        1.0, // scale
        100, // priority
        expect.any(Function) // callback
      );
      
      // Verify viewer container is rendered
      expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
    });

    it('should handle progressive rendering with progress feedback', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
      
      let progressCallback: ((progress: any) => void) | undefined;
      
      // Mock PDF loading with progress
      vi.mocked(loadPDFDocument).mockImplementation(async (options) => {
        progressCallback = options.onProgress;
        
        // Simulate progress updates
        if (progressCallback) {
          progressCallback({ loaded: 1000, total: 10000 });
          await new Promise(resolve => setTimeout(resolve, 10));
          progressCallback({ loaded: 5000, total: 10000 });
          await new Promise(resolve => setTimeout(resolve, 10));
          progressCallback({ loaded: 10000, total: 10000 });
        }
        
        return {
          document: mockDocument,
          numPages: 5,
          loadTime: 1000,
        };
      });
      
      // Mock memory manager
      vi.mocked(createMemoryManager).mockReturnValue({
        setPDFDocument: vi.fn(),
        addRenderedPage: vi.fn(),
        destroy: vi.fn(),
      } as any);
      
      // Mock render pipeline
      vi.mocked(getGlobalRenderPipeline).mockReturnValue({
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      } as any);
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );
      
      // Should show loading indicator initially
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Verify progress was tracked
      expect(progressCallback).toBeDefined();
    });
  });

  /**
   * Integration Test 2: Watermark Overlay + PDF Rendering
   * 
   * Tests that watermarks are properly overlaid on rendered PDF content
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  describe('Watermark Overlay + PDF Rendering', () => {
    it('should render watermark overlay on top of PDF canvas', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });
      
      vi.mocked(createMemoryManager).mockReturnValue({
        setPDFDocument: vi.fn(),
        addRenderedPage: vi.fn(),
        destroy: vi.fn(),
      } as any);
      
      vi.mocked(getGlobalRenderPipeline).mockReturnValue({
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      } as any);
      
      const watermark = {
        text: 'CONFIDENTIAL',
        opacity: 0.3,
        fontSize: 48,
      };
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          watermark={watermark}
        />
      );
      
      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
      });
      
      // Verify watermark is rendered
      const watermarkElement = screen.getByTestId('watermark');
      expect(watermarkElement).toBeInTheDocument();
      expect(watermarkElement).toHaveTextContent('CONFIDENTIAL');
      expect(watermarkElement).toHaveAttribute('data-opacity', '0.3');
    });


    it('should maintain watermark visibility during zoom operations', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });
      
      vi.mocked(createMemoryManager).mockReturnValue({
        setPDFDocument: vi.fn(),
        addRenderedPage: vi.fn(),
        destroy: vi.fn(),
      } as any);
      
      const mockPipeline = {
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      };
      vi.mocked(getGlobalRenderPipeline).mockReturnValue(mockPipeline as any);
      
      const watermark = {
        text: 'WATERMARK',
        opacity: 0.5,
        fontSize: 36,
      };
      
      const { container } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          watermark={watermark}
        />
      );
      
      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('watermark')).toBeInTheDocument();
      });
      
      // Simulate zoom in (keyboard shortcut)
      fireEvent.keyDown(container, { key: '+', ctrlKey: true });
      
      // Wait for re-render
      await waitFor(() => {
        expect(mockPipeline.queueRender).toHaveBeenCalledWith(
          expect.anything(),
          1,
          expect.anything(),
          1.25, // Zoomed in
          expect.anything(),
          expect.any(Function)
        );
      });
      
      // Watermark should still be visible
      expect(screen.getByTestId('watermark')).toBeInTheDocument();
      expect(screen.getByText('WATERMARK')).toBeInTheDocument();
    });

    it('should maintain watermark visibility during page navigation', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });
      
      vi.mocked(createMemoryManager).mockReturnValue({
        setPDFDocument: vi.fn(),
        addRenderedPage: vi.fn(),
        destroy: vi.fn(),
      } as any);
      
      const mockPipeline = {
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      };
      vi.mocked(getGlobalRenderPipeline).mockReturnValue(mockPipeline as any);
      
      const watermark = {
        text: 'PROTECTED',
        opacity: 0.4,
        fontSize: 40,
      };
      
      const onPageChange = vi.fn();
      
      const { container } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          watermark={watermark}
          onPageChange={onPageChange}
        />
      );
      
      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('watermark')).toBeInTheDocument();
      });
      
      // Navigate to next page (keyboard shortcut)
      fireEvent.keyDown(container, { key: 'ArrowRight' });
      
      // Wait for page change
      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(2);
      });
      
      // Watermark should still be visible on new page
      expect(screen.getByTestId('watermark')).toBeInTheDocument();
      expect(screen.getByText('PROTECTED')).toBeInTheDocument();
    });

    it('should update watermark when settings change dynamically', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });
      
      vi.mocked(createMemoryManager).mockReturnValue({
        setPDFDocument: vi.fn(),
        addRenderedPage: vi.fn(),
        destroy: vi.fn(),
      } as any);
      
      vi.mocked(getGlobalRenderPipeline).mockReturnValue({
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      } as any);
      
      const initialWatermark = {
        text: 'DRAFT',
        opacity: 0.3,
        fontSize: 36,
      };
      
      const { rerender } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          watermark={initialWatermark}
        />
      );
      
      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('DRAFT')).toBeInTheDocument();
      });
      
      // Update watermark settings
      const updatedWatermark = {
        text: 'FINAL',
        opacity: 0.5,
        fontSize: 48,
      };
      
      rerender(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          watermark={updatedWatermark}
        />
      );
      
      // Verify watermark updated
      await waitFor(() => {
        expect(screen.getByText('FINAL')).toBeInTheDocument();
        expect(screen.queryByText('DRAFT')).not.toBeInTheDocument();
      });
    });
  });

  /**
   * Integration Test 3: DRM Protection + PDF.js Events
   * 
   * Tests that DRM protections work correctly with PDF.js rendered content
   * 
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  describe('DRM Protection + PDF.js Events', () => {
    it('should prevent context menu on PDF canvas', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });
      
      vi.mocked(createMemoryManager).mockReturnValue({
        setPDFDocument: vi.fn(),
        addRenderedPage: vi.fn(),
        destroy: vi.fn(),
      } as any);
      
      vi.mocked(getGlobalRenderPipeline).mockReturnValue({
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      } as any);
      
      const { container } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          enableDRM={true}
        />
      );
      
      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
      });
      
      // Try to open context menu
      const contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
      });
      
      const prevented = !container.dispatchEvent(contextMenuEvent);
      
      // Context menu should be prevented
      expect(prevented).toBe(true);
    });

    it('should block print shortcuts', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });
      
      vi.mocked(createMemoryManager).mockReturnValue({
        setPDFDocument: vi.fn(),
        addRenderedPage: vi.fn(),
        destroy: vi.fn(),
      } as any);
      
      vi.mocked(getGlobalRenderPipeline).mockReturnValue({
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      } as any);
      
      const { container } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          enableDRM={true}
        />
      );
      
      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
      });
      
      // Try to print with Ctrl+P
      const printEvent = new KeyboardEvent('keydown', {
        key: 'p',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      
      const prevented = !container.dispatchEvent(printEvent);
      
      // Print should be prevented
      expect(prevented).toBe(true);
    });

    it('should prevent text selection on PDF canvas', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });
      
      vi.mocked(createMemoryManager).mockReturnValue({
        setPDFDocument: vi.fn(),
        addRenderedPage: vi.fn(),
        destroy: vi.fn(),
      } as any);
      
      vi.mocked(getGlobalRenderPipeline).mockReturnValue({
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      } as any);
      
      const { container } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          enableDRM={true}
        />
      );
      
      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
      });
      
      // Try to select text
      const selectEvent = new Event('selectstart', {
        bubbles: true,
        cancelable: true,
      });
      
      const prevented = !container.dispatchEvent(selectEvent);
      
      // Text selection should be prevented
      expect(prevented).toBe(true);
    });

    it('should block save shortcuts', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });
      
      vi.mocked(createMemoryManager).mockReturnValue({
        setPDFDocument: vi.fn(),
        addRenderedPage: vi.fn(),
        destroy: vi.fn(),
      } as any);
      
      vi.mocked(getGlobalRenderPipeline).mockReturnValue({
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      } as any);
      
      const { container } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          enableDRM={true}
        />
      );
      
      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
      });
      
      // Try to save with Ctrl+S
      const saveEvent = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      
      const prevented = !container.dispatchEvent(saveEvent);
      
      // Save should be prevented
      expect(prevented).toBe(true);
    });
  });

  /**
   * Integration Test 4: Navigation Controls + Page Rendering
   * 
   * Tests that navigation controls work correctly with page rendering
   * 
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  describe('Navigation Controls + Page Rendering', () => {
    it('should navigate between pages and render each page', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });
      
      vi.mocked(createMemoryManager).mockReturnValue({
        setPDFDocument: vi.fn(),
        addRenderedPage: vi.fn(),
        destroy: vi.fn(),
      } as any);
      
      const mockPipeline = {
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      };
      vi.mocked(getGlobalRenderPipeline).mockReturnValue(mockPipeline as any);
      
      const onPageChange = vi.fn();
      
      const { container } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          onPageChange={onPageChange}
        />
      );
      
      // Wait for initial render (page 1)
      await waitFor(() => {
        expect(mockPipeline.queueRender).toHaveBeenCalledWith(
          expect.anything(),
          1,
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.any(Function)
        );
      });
      
      // Navigate to next page
      fireEvent.keyDown(container, { key: 'ArrowRight' });
      
      // Wait for page 2 to render
      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(2);
      });
      
      await waitFor(() => {
        expect(mockPipeline.queueRender).toHaveBeenCalledWith(
          expect.anything(),
          2,
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.any(Function)
        );
      });
    });


    it('should handle zoom controls and re-render at new scale', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });
      
      vi.mocked(createMemoryManager).mockReturnValue({
        setPDFDocument: vi.fn(),
        addRenderedPage: vi.fn(),
        destroy: vi.fn(),
      } as any);
      
      const mockPipeline = {
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      };
      vi.mocked(getGlobalRenderPipeline).mockReturnValue(mockPipeline as any);
      
      const { container } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );
      
      // Wait for initial render at scale 1.0
      await waitFor(() => {
        expect(mockPipeline.queueRender).toHaveBeenCalledWith(
          expect.anything(),
          1,
          expect.anything(),
          1.0,
          expect.anything(),
          expect.any(Function)
        );
      });
      
      mockPipeline.queueRender.mockClear();
      
      // Zoom in
      fireEvent.keyDown(container, { key: '+', ctrlKey: true });
      
      // Wait for re-render at new scale
      await waitFor(() => {
        expect(mockPipeline.queueRender).toHaveBeenCalledWith(
          expect.anything(),
          1,
          expect.anything(),
          1.25, // Zoomed in by 0.25
          expect.anything(),
          expect.any(Function)
        );
      });
    });


    it('should support keyboard shortcuts for navigation', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });
      
      vi.mocked(createMemoryManager).mockReturnValue({
        setPDFDocument: vi.fn(),
        addRenderedPage: vi.fn(),
        destroy: vi.fn(),
      } as any);
      
      vi.mocked(getGlobalRenderPipeline).mockReturnValue({
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      } as any);
      
      const onPageChange = vi.fn();
      
      const { container } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          onPageChange={onPageChange}
        />
      );
      
      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
      });
      
      // Test arrow right (next page)
      fireEvent.keyDown(container, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(2);
      });
      
      // Test arrow left (previous page)
      fireEvent.keyDown(container, { key: 'ArrowLeft' });
      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(1);
      });
      
      // Test Page Down
      fireEvent.keyDown(container, { key: 'PageDown' });
      await waitFor(() => {
        expect(onPageChange).toHaveBeenCalledWith(2);
      });
    });


    it('should render pages in continuous scroll mode with lazy loading', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });
      
      const mockMemoryManager = {
        setPDFDocument: vi.fn(),
        addRenderedPage: vi.fn(),
        addPageObject: vi.fn(),
        prioritizePages: vi.fn((visiblePages) => visiblePages),
        removeNonPriorityPages: vi.fn(),
        destroy: vi.fn(),
      };
      vi.mocked(createMemoryManager).mockReturnValue(mockMemoryManager as any);
      
      const mockPipeline = {
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      };
      vi.mocked(getGlobalRenderPipeline).mockReturnValue(mockPipeline as any);
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          viewMode="continuous"
        />
      );
      
      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
      });
      
      // In continuous mode, visible pages should be rendered
      await waitFor(() => {
        expect(mockPipeline.queueRender).toHaveBeenCalled();
      }, { timeout: 3000 });
      
      // Memory manager should prioritize visible pages
      expect(mockMemoryManager.prioritizePages).toHaveBeenCalled();
    });
  });

  /**
   * Integration Test 5: Error Handling + User Feedback
   * 
   * Tests that errors are properly handled and communicated to users
   * 
   * Requirements: 2.4, 7.1, 7.2, 7.3, 7.4, 7.5
   */
  describe('Error Handling + User Feedback', () => {
    it('should display clear error message when PDF fails to load', async () => {
      const { loadPDFDocument, PDFDocumentLoaderError } = await import('@/lib/pdfjs-integration');
      
      vi.mocked(loadPDFDocument).mockRejectedValue(
        new PDFDocumentLoaderError('Network error', 'NETWORK_ERROR')
      );
      
      const onError = vi.fn();
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          onError={onError}
        />
      );
      
      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/Failed to Load PDF/i)).toBeInTheDocument();
      });
      
      // Verify error callback was called
      expect(onError).toHaveBeenCalled();
    });

    it('should provide retry option when loading fails', async () => {
      const { loadPDFDocument, PDFDocumentLoaderError } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
      
      // First attempt fails
      vi.mocked(loadPDFDocument)
        .mockRejectedValueOnce(
          new PDFDocumentLoaderError('Timeout', 'TIMEOUT')
        )
        .mockResolvedValueOnce({
          document: mockDocument,
          numPages: 5,
          loadTime: 1000,
        });
      
      vi.mocked(createMemoryManager).mockReturnValue({
        setPDFDocument: vi.fn(),
        addRenderedPage: vi.fn(),
        destroy: vi.fn(),
      } as any);
      
      vi.mocked(getGlobalRenderPipeline).mockReturnValue({
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      } as any);
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );
      
      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/Failed to Load PDF/i)).toBeInTheDocument();
      });
      
      // Verify retry button is available
      const retryButton = screen.getByText(/Retry Loading/i);
      expect(retryButton).toBeInTheDocument();
      
      // Click retry
      fireEvent.click(retryButton);
      
      // Wait for successful load after retry
      await waitFor(() => {
        expect(screen.getByTestId('pdfjs-viewer-container')).toBeInTheDocument();
      });
      
      // Verify loadPDFDocument was called twice (initial + retry)
      expect(loadPDFDocument).toHaveBeenCalledTimes(2);
    });

    it('should display specific error message for invalid PDF', async () => {
      const { loadPDFDocument, PDFDocumentLoaderError } = await import('@/lib/pdfjs-integration');
      
      vi.mocked(loadPDFDocument).mockRejectedValue(
        new PDFDocumentLoaderError('Invalid PDF', 'INVALID_PDF')
      );
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );
      
      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/Failed to Load PDF/i)).toBeInTheDocument();
      });
      
      // Verify specific error message
      expect(screen.getByText(/not a valid PDF/i)).toBeInTheDocument();
    });

    it('should display specific error message for missing PDF', async () => {
      const { loadPDFDocument, PDFDocumentLoaderError } = await import('@/lib/pdfjs-integration');
      
      vi.mocked(loadPDFDocument).mockRejectedValue(
        new PDFDocumentLoaderError('Missing PDF', 'MISSING_PDF')
      );
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );
      
      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/Failed to Load PDF/i)).toBeInTheDocument();
      });
      
      // Verify specific error message
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });

    it('should handle rendering errors gracefully', async () => {
      const { loadPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
      const { PDFPageRendererError } = await import('@/lib/pdfjs-integration');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });
      
      vi.mocked(createMemoryManager).mockReturnValue({
        setPDFDocument: vi.fn(),
        addRenderedPage: vi.fn(),
        destroy: vi.fn(),
      } as any);
      
      // Mock render pipeline to fail
      vi.mocked(getGlobalRenderPipeline).mockReturnValue({
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => {
            callback(new PDFPageRendererError('Render failed', 'RENDER_ERROR'));
          }, 0);
        }),
        destroy: vi.fn(),
      } as any);
      
      const onError = vi.fn();
      
      render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
          onError={onError}
        />
      );
      
      // Wait for PDF to load
      await waitFor(() => {
        expect(loadPDFDocument).toHaveBeenCalled();
      });
      
      // Wait for render error
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });


    it('should handle PDF.js unavailability with fallback message', async () => {
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
      
      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/Failed to Load PDF/i)).toBeInTheDocument();
      });
      
      // Verify fallback error message
      expect(screen.getByText(/PDF.js library is not available/i)).toBeInTheDocument();
      
      // Verify error callback was called
      expect(onError).toHaveBeenCalled();
    });

    it('should cleanup resources on unmount even after errors', async () => {
      const { loadPDFDocument, destroyPDFDocument } = await import('@/lib/pdfjs-integration');
      const { createMemoryManager } = await import('@/lib/pdfjs-memory');
      const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
      
      vi.mocked(loadPDFDocument).mockResolvedValue({
        document: mockDocument,
        numPages: 5,
        loadTime: 1000,
      });
      
      const mockMemoryManager = {
        setPDFDocument: vi.fn(),
        addRenderedPage: vi.fn(),
        destroy: vi.fn(),
      };
      vi.mocked(createMemoryManager).mockReturnValue(mockMemoryManager as any);
      
      vi.mocked(getGlobalRenderPipeline).mockReturnValue({
        queueRender: vi.fn((page, pageNum, canvas, scale, priority, callback) => {
          setTimeout(() => callback(null), 0);
        }),
        destroy: vi.fn(),
      } as any);
      
      const { unmount } = render(
        <PDFViewerWithPDFJS
          pdfUrl="https://example.com/test.pdf"
          documentTitle="Test Document"
        />
      );
      
      // Wait for PDF to load
      await waitFor(() => {
        expect(mockMemoryManager.setPDFDocument).toHaveBeenCalled();
      });
      
      // Unmount component
      unmount();
      
      // Verify cleanup was called
      expect(destroyPDFDocument).toHaveBeenCalledWith(mockDocument);
      expect(mockMemoryManager.destroy).toHaveBeenCalled();
    });
  });
});
