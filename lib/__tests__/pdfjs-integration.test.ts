/**
 * PDF.js Integration Layer Tests
 * 
 * Basic unit tests for PDF document loading and page rendering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadPDFDocument,
  renderPageToCanvas,
  cleanupCanvas,
  destroyPDFDocument,
  PDFDocumentLoaderError,
  PDFPageRendererError,
} from '../pdfjs-integration';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: {
    workerSrc: '',
  },
}));

describe('PDF.js Integration Layer', () => {
  describe('loadPDFDocument', () => {
    it('should load a PDF document from URL', async () => {
      const mockDocument = {
        numPages: 5,
        destroy: vi.fn(),
      };
      
      const mockLoadingTask = {
        promise: Promise.resolve(mockDocument),
        onProgress: null,
        destroy: vi.fn(),
      };
      
      const { getDocument } = await import('pdfjs-dist');
      vi.mocked(getDocument).mockReturnValue(mockLoadingTask as any);
      
      const result = await loadPDFDocument({
        source: 'https://example.com/test.pdf',
      });
      
      expect(result.document).toBe(mockDocument);
      expect(result.numPages).toBe(5);
      expect(result.loadTime).toBeGreaterThanOrEqual(0);
    });
    
    it('should track loading progress', async () => {
      const mockDocument = {
        numPages: 3,
        destroy: vi.fn(),
      };
      
      const mockLoadingTask = {
        promise: Promise.resolve(mockDocument),
        onProgress: null,
        destroy: vi.fn(),
      };
      
      const { getDocument } = await import('pdfjs-dist');
      vi.mocked(getDocument).mockReturnValue(mockLoadingTask as any);
      
      const progressCallback = vi.fn();
      
      await loadPDFDocument({
        source: 'https://example.com/test.pdf',
        onProgress: progressCallback,
      });
      
      // Verify progress callback was set
      expect(mockLoadingTask.onProgress).toBeDefined();
    });
    
    it('should throw PDFDocumentLoaderError on invalid PDF', async () => {
      const mockError = new Error('Invalid PDF');
      mockError.name = 'InvalidPDFException';
      
      const mockLoadingTask = {
        promise: Promise.reject(mockError),
        onProgress: null,
        destroy: vi.fn(),
      };
      
      // Catch the unhandled rejection
      mockLoadingTask.promise.catch(() => {});
      
      const { getDocument } = await import('pdfjs-dist');
      vi.mocked(getDocument).mockReturnValue(mockLoadingTask as any);
      
      await expect(
        loadPDFDocument({
          source: 'https://example.com/invalid.pdf',
        })
      ).rejects.toThrow(PDFDocumentLoaderError);
      
      // Create a new mock for the second test
      const mockLoadingTask2 = {
        promise: Promise.reject(mockError),
        onProgress: null,
        destroy: vi.fn(),
      };
      mockLoadingTask2.promise.catch(() => {});
      vi.mocked(getDocument).mockReturnValue(mockLoadingTask2 as any);
      
      await expect(
        loadPDFDocument({
          source: 'https://example.com/invalid.pdf',
        })
      ).rejects.toMatchObject({
        code: 'INVALID_PDF',
      });
    });
    
    it('should handle timeout', async () => {
      const mockLoadingTask = {
        promise: new Promise(() => {}), // Never resolves
        onProgress: null,
        destroy: vi.fn(),
      };
      
      const { getDocument } = await import('pdfjs-dist');
      vi.mocked(getDocument).mockReturnValue(mockLoadingTask as any);
      
      await expect(
        loadPDFDocument({
          source: 'https://example.com/slow.pdf',
          timeout: 100,
        })
      ).rejects.toThrow(PDFDocumentLoaderError);
      
      await expect(
        loadPDFDocument({
          source: 'https://example.com/slow.pdf',
          timeout: 100,
        })
      ).rejects.toMatchObject({
        code: 'TIMEOUT',
      });
    }, 10000);
  });
  
  describe('renderPageToCanvas', () => {
    it('should render a page to canvas', async () => {
      const mockViewport = {
        width: 800,
        height: 600,
        scale: 1.0,
      };
      
      const mockRenderTask = {
        promise: Promise.resolve(),
      };
      
      const mockPage = {
        getViewport: vi.fn().mockReturnValue(mockViewport),
        render: vi.fn().mockReturnValue(mockRenderTask),
      };
      
      const mockCanvas = document.createElement('canvas');
      
      const result = await renderPageToCanvas({
        page: mockPage as any,
        canvas: mockCanvas,
        scale: 1.5,
      });
      
      expect(result.canvas).toBe(mockCanvas);
      expect(result.viewport).toBe(mockViewport);
      expect(result.renderTime).toBeGreaterThanOrEqual(0);
      expect(mockPage.getViewport).toHaveBeenCalledWith({
        scale: 1.5,
        rotation: 0,
      });
    });
    
    it('should throw PDFPageRendererError on canvas context error', async () => {
      const mockPage = {
        getViewport: vi.fn().mockReturnValue({ width: 800, height: 600 }),
        render: vi.fn(),
      };
      
      // Create a canvas that returns null for getContext
      const mockCanvas = {
        getContext: vi.fn().mockReturnValue(null),
        width: 0,
        height: 0,
      } as any;
      
      await expect(
        renderPageToCanvas({
          page: mockPage as any,
          canvas: mockCanvas,
        })
      ).rejects.toThrow(PDFPageRendererError);
      
      await expect(
        renderPageToCanvas({
          page: mockPage as any,
          canvas: mockCanvas,
        })
      ).rejects.toMatchObject({
        code: 'CANVAS_CONTEXT_ERROR',
      });
    });
  });
  
  describe('cleanupCanvas', () => {
    it('should clear canvas and reset dimensions', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      
      cleanupCanvas(canvas);
      
      expect(canvas.width).toBe(0);
      expect(canvas.height).toBe(0);
    });
  });
  
  describe('destroyPDFDocument', () => {
    it('should destroy PDF document', () => {
      const mockDocument = {
        destroy: vi.fn(),
      };
      
      destroyPDFDocument(mockDocument as any);
      
      expect(mockDocument.destroy).toHaveBeenCalled();
    });
    
    it('should handle errors gracefully', () => {
      const mockDocument = {
        destroy: vi.fn().mockImplementation(() => {
          throw new Error('Destroy failed');
        }),
      };
      
      // Should not throw
      expect(() => destroyPDFDocument(mockDocument as any)).not.toThrow();
    });
  });
});
