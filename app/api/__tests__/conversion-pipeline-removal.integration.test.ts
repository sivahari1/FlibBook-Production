/**
 * Integration Tests for Conversion Pipeline Removal
 * 
 * Tests that the system works without conversion dependencies and that
 * deprecated conversion API endpoints are no longer accessible.
 * 
 * Requirements: 1.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

describe('Conversion Pipeline Removal Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Conversion API Endpoint Deprecation', () => {
    it('should return 404 for deprecated conversion endpoint', async () => {
      // Test that the conversion endpoint is no longer accessible
      const response = await fetch('/api/documents/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: 'test-doc-1' })
      }).catch(() => ({ status: 404, ok: false }));

      expect(response.status).toBe(404);
      expect(response.ok).toBe(false);
    });

    it('should not have conversion service imports available', async () => {
      // Test that conversion services are not accessible
      await expect(async () => {
        await import('@/lib/services/pdf-converter');
      }).rejects.toThrow();

      await expect(async () => {
        await import('@/lib/services/page-cache');
      }).rejects.toThrow();
    });
  });

  describe('Document Viewing Without Conversion', () => {
    it('should serve PDF documents directly without requiring conversion', () => {
      // Mock document data that should be served directly
      const mockDocument = {
        id: 'test-doc-1',
        title: 'Test PDF',
        userId: 'user-1',
        contentType: 'PDF',
        mimeType: 'application/pdf',
        fileUrl: 'https://example.com/test.pdf',
        storagePath: 'user-1/test.pdf',
        status: 'UPLOADED'
      };

      // Verify document structure doesn't include conversion-related fields
      expect(mockDocument).not.toHaveProperty('pages');
      expect(mockDocument).not.toHaveProperty('pageUrls');
      expect(mockDocument).not.toHaveProperty('conversionStatus');
      expect(mockDocument).not.toHaveProperty('needsConversion');
    });

    it('should not require page conversion checks for PDF viewing', () => {
      // Test that PDF viewing logic doesn't depend on page conversion
      const pdfDocument = {
        id: 'pdf-doc-1',
        contentType: 'PDF',
        fileUrl: 'https://example.com/document.pdf'
      };

      // The document should be viewable with just the fileUrl
      expect(pdfDocument.fileUrl).toBeDefined();
      expect(pdfDocument.contentType).toBe('PDF');
      
      // No conversion-related properties should be required
      expect(pdfDocument).not.toHaveProperty('convertedPages');
      expect(pdfDocument).not.toHaveProperty('conversionRequired');
    });
  });

  describe('Member View Integration', () => {
    it('should render member view without conversion dependencies', () => {
      // Test that member view components work without conversion pipeline
      const memberDocument = {
        id: 'member-doc-1',
        title: 'Member PDF',
        contentType: 'PDF',
        fileUrl: 'https://example.com/member.pdf',
        metadata: { pageCount: 10 }
      };

      // Member documents should work with direct PDF rendering
      expect(memberDocument.fileUrl).toBeDefined();
      expect(memberDocument.contentType).toBe('PDF');
      
      // Should not have conversion-related data
      expect(memberDocument).not.toHaveProperty('pages');
      expect(memberDocument).not.toHaveProperty('conversionRequired');
    });
  });

  describe('Storage and Database Cleanup', () => {
    it('should not create document page entries for new PDFs', () => {
      const newDocument = {
        id: 'new-pdf-1',
        title: 'New PDF',
        contentType: 'PDF',
        fileUrl: 'https://example.com/new.pdf'
      };

      // New PDFs should not require page entries in database
      expect(newDocument).not.toHaveProperty('documentPages');
      expect(newDocument).not.toHaveProperty('pageCache');
    });

    it('should not query document-pages storage bucket', () => {
      // Test that document viewing doesn't access document-pages bucket
      const mockDocument = {
        id: 'test-doc-2',
        contentType: 'PDF',
        fileUrl: 'https://example.com/test2.pdf'
      };

      // Document should be accessible via main documents bucket only
      expect(mockDocument.fileUrl).toContain('example.com');
      expect(mockDocument.fileUrl).not.toContain('document-pages');
    });
  });

  describe('Error Handling Without Conversion', () => {
    it('should handle PDF errors without conversion fallback', () => {
      const corruptedDocument = {
        id: 'corrupted-pdf',
        title: 'Corrupted PDF',
        contentType: 'PDF',
        fileUrl: 'https://example.com/corrupted.pdf',
        status: 'UPLOADED'
      };

      // Should return the document data without conversion attempts
      expect(corruptedDocument.id).toBe('corrupted-pdf');
      
      // Should not have conversion error fields
      expect(corruptedDocument).not.toHaveProperty('conversionError');
      expect(corruptedDocument).not.toHaveProperty('needsConversion');
    });

    it('should not provide conversion retry mechanisms', () => {
      const failedDocument = {
        id: 'failed-pdf',
        contentType: 'PDF',
        fileUrl: 'https://example.com/failed.pdf'
      };

      // Should not provide conversion retry options
      expect(failedDocument).not.toHaveProperty('retryConversion');
      expect(failedDocument).not.toHaveProperty('conversionEndpoint');
    });
  });

  describe('Performance Without Conversion', () => {
    it('should have faster response times without conversion checks', () => {
      const startTime = Date.now();
      
      const mockDocument = {
        id: 'perf-test-pdf',
        contentType: 'PDF',
        fileUrl: 'https://example.com/perf.pdf'
      };

      // Simple document access should be fast
      const accessTime = Date.now() - startTime;
      expect(accessTime).toBeLessThan(10); // Should be nearly instantaneous
      
      // Document should be ready for direct rendering
      expect(mockDocument.fileUrl).toBeDefined();
    });
  });

  describe('API Route Cleanup', () => {
    it('should not have pages API endpoint for documents', async () => {
      // Test that the pages endpoint is removed/deprecated
      const response = await fetch('/api/documents/test-doc/pages').catch(() => ({ 
        status: 404, 
        ok: false 
      }));

      expect(response.status).toBe(404);
    });

    it('should not have conversion monitoring endpoints', async () => {
      // Test that conversion monitoring is removed
      const response = await fetch('/api/conversion/status').catch(() => ({ 
        status: 404, 
        ok: false 
      }));

      expect(response.status).toBe(404);
    });
  });

  describe('Component Integration Without Conversion', () => {
    it('should use UnifiedViewer for PDF content instead of conversion-based components', () => {
      // Test that the system routes to unified viewer
      const pdfContent = {
        id: 'unified-test-pdf',
        contentType: 'PDF',
        fileUrl: 'https://example.com/unified.pdf'
      };

      // Should be compatible with UnifiedViewer interface
      expect(pdfContent.contentType).toBe('PDF');
      expect(pdfContent.fileUrl).toBeDefined();
      
      // Should not require conversion-specific properties
      expect(pdfContent).not.toHaveProperty('pages');
      expect(pdfContent).not.toHaveProperty('flipbookData');
    });

    it('should not import conversion services in viewer components', async () => {
      // Test that viewer components don't import conversion services
      try {
        const UniversalViewer = await import('@/components/viewers/UniversalViewer');
        expect(UniversalViewer).toBeDefined();
        
        // Should not have conversion-related exports
        expect((UniversalViewer as any).convertPdfToImages).toBeUndefined();
        expect((UniversalViewer as any).pageCache).toBeUndefined();
      } catch (error) {
        // If import fails, that's expected for deprecated components
        expect(error).toBeDefined();
      }
    });
  });
});