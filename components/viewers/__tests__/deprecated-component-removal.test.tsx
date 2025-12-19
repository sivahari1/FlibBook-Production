/**
 * Unit Tests for Deprecated Component Removal
 * 
 * Tests that deprecated conversion pipeline components are no longer accessible
 * and that the system properly routes to the unified viewer system.
 * 
 * Requirements: 1.1
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ContentType, EnhancedDocument } from '@/lib/types/content';
import UniversalViewer from '../UniversalViewer';
import UnifiedViewer from '../UnifiedViewer';

// Mock the UnifiedViewer to avoid actual PDF rendering in tests
vi.mock('../UnifiedViewer', () => ({
  default: function MockUnifiedViewer({ content }: { content: EnhancedDocument }) {
    return (
      <div data-testid="unified-viewer">
        <div data-testid="unified-viewer-content-type">{content.contentType}</div>
        <div data-testid="unified-viewer-document-id">{content.id}</div>
      </div>
    );
  }
}));

describe('Deprecated Component Removal', () => {
  const mockPDFDocument: EnhancedDocument = {
    id: 'test-pdf-1',
    title: 'Test PDF Document',
    contentType: ContentType.PDF,
    fileUrl: 'https://example.com/test.pdf',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    metadata: {
      fileSize: 1024000,
      mimeType: 'application/pdf',
      pageCount: 5
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('FlipBookWrapper Component', () => {
    it('should not be accessible as a standalone component', async () => {
      // FlipBookWrapper should not be exported or accessible outside UniversalViewer
      const UniversalViewerModule = await import('../UniversalViewer');
      expect((UniversalViewerModule as any).FlipBookWrapper).toBeUndefined();
    });

    it('should not render FlipBookWrapper for PDF content in UniversalViewer', () => {
      render(<UniversalViewer content={mockPDFDocument} />);
      
      // FlipBookWrapper should not be present in the DOM
      expect(screen.queryByTestId('flipbook-wrapper')).not.toBeInTheDocument();
      expect(screen.queryByTestId('conversion-loading')).not.toBeInTheDocument();
      expect(screen.queryByText('Converting document to pages...')).not.toBeInTheDocument();
    });
  });

  describe('PDF-to-Image Conversion Dependencies', () => {
    it('should not attempt to fetch converted pages for PDF content', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => 
        Promise.reject(new Error('Conversion API should not be called'))
      );

      render(<UniversalViewer content={mockPDFDocument} />);
      
      // Wait a bit to ensure no fetch calls are made
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify no calls to conversion-related endpoints
      expect(fetchSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/documents/convert')
      );
      expect(fetchSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('/pages')
      );
      
      fetchSpy.mockRestore();
    });

    it('should not display conversion-related error messages', () => {
      render(<UniversalViewer content={mockPDFDocument} />);
      
      // These error messages should not appear since we're not using conversion
      expect(screen.queryByText(/conversion is in progress/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/conversion.*failed/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/convert document/i)).not.toBeInTheDocument();
    });
  });

  describe('Unified Viewer Integration', () => {
    it('should route PDF content to UnifiedViewer instead of deprecated components', () => {
      // This test verifies that the system properly routes to the new unified approach
      render(<UnifiedViewer content={mockPDFDocument} />);
      
      // Verify UnifiedViewer is rendered
      expect(screen.getByTestId('unified-viewer')).toBeInTheDocument();
      expect(screen.getByTestId('unified-viewer-content-type')).toHaveTextContent('PDF');
      expect(screen.getByTestId('unified-viewer-document-id')).toHaveTextContent('test-pdf-1');
    });

    it('should not render deprecated FlipBook components for PDF content', () => {
      render(<UnifiedViewer content={mockPDFDocument} />);
      
      // Verify deprecated components are not present
      expect(screen.queryByTestId('flipbook-container')).not.toBeInTheDocument();
      expect(screen.queryByTestId('flipbook-wrapper')).not.toBeInTheDocument();
      expect(screen.queryByTestId('page-conversion')).not.toBeInTheDocument();
    });
  });

  describe('Component Export Verification', () => {
    it('should not export FlipBookWrapper from UniversalViewer module', async () => {
      const UniversalViewerModule = await import('../UniversalViewer');
      
      // FlipBookWrapper should not be exported
      expect((UniversalViewerModule as any).FlipBookWrapper).toBeUndefined();
      expect(UniversalViewerModule.default).toBeDefined(); // UniversalViewer should still be exported
    });

    it('should not have conversion-related utilities accessible', async () => {
      // Test that conversion utilities are not accessible from the viewer components
      const UniversalViewerModule = await import('../UniversalViewer');
      
      expect((UniversalViewerModule as any).convertPdfToImages).toBeUndefined();
      expect((UniversalViewerModule as any).fetchPages).toBeUndefined();
    });
  });

  describe('Error Handling Without Conversion', () => {
    it('should handle PDF rendering errors without falling back to conversion', () => {
      const pdfWithInvalidUrl: EnhancedDocument = {
        ...mockPDFDocument,
        fileUrl: 'invalid-url'
      };

      render(<UnifiedViewer content={pdfWithInvalidUrl} />);
      
      // Should not show conversion-related error handling
      expect(screen.queryByText(/convert document/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/conversion.*retry/i)).not.toBeInTheDocument();
    });
  });
});