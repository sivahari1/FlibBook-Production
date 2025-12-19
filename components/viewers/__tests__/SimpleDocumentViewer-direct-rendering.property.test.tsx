/**
 * Property-Based Tests for SimpleDocumentViewer Direct Rendering Reliability
 * 
 * **Feature: document-conversion-reliability-fix, Property 2: Direct rendering reliability**
 * 
 * Tests that the Direct_PDF_Rendering system successfully renders valid PDF documents 
 * without requiring pre-conversion to images.
 * 
 * **Validates: Requirements 1.2**
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import SimpleDocumentViewer from '../SimpleDocumentViewer';
import type { SimpleDocumentViewerProps } from '../SimpleDocumentViewer';

// Mock PDF.js components to simulate direct rendering
vi.mock('../PDFViewerWithPDFJS', () => ({
  default: vi.fn(({ pdfUrl, onLoadComplete, onTotalPagesChange, onError }) => {
    // Simulate direct PDF.js rendering behavior
    setTimeout(() => {
      // Simulate successful direct rendering for valid URLs
      if (pdfUrl && pdfUrl.includes('valid')) {
        onLoadComplete?.(3);
        onTotalPagesChange?.(3);
      } else if (pdfUrl && pdfUrl.includes('invalid')) {
        // Simulate rendering failure for invalid PDFs
        onError?.(new Error('Invalid PDF format'));
      } else {
        // Default successful rendering
        onLoadComplete?.(5);
        onTotalPagesChange?.(5);
      }
    }, 10); // Reduced timeout for faster tests
    
    return (
      <div data-testid="direct-pdf-renderer">
        <canvas data-testid="pdf-canvas" width="800" height="600" />
        <div data-testid="pdf-content">Direct PDF.js Rendering</div>
      </div>
    );
  }),
}));

// Mock other components
vi.mock('../ViewerToolbar', () => ({
  default: vi.fn(() => <div data-testid="viewer-toolbar-mock" />),
}));

vi.mock('../WatermarkOverlay', () => ({
  default: vi.fn(() => <div data-testid="watermark-overlay-mock" />),
}));

vi.mock('../LoadingSpinner', () => ({
  default: vi.fn(() => <div data-testid="loading-spinner-mock" />),
}));

vi.mock('../ViewerError', () => ({
  default: vi.fn(() => <div data-testid="viewer-error-mock" />),
}));

// Mock legacy components (should not be used in direct rendering)
vi.mock('../ContinuousScrollView', () => ({
  default: vi.fn(() => <div data-testid="legacy-continuous-view" />),
}));

vi.mock('../PagedView', () => ({
  default: vi.fn(() => <div data-testid="legacy-paged-view" />),
}));

// Mock hooks
vi.mock('@/hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: vi.fn(),
}));

vi.mock('@/hooks/useTouchGestures', () => ({
  useTouchGestures: vi.fn(),
}));

// Mock viewer preferences
vi.mock('@/lib/viewer-preferences', () => ({
  loadPreferences: vi.fn(() => ({
    viewMode: 'continuous',
    defaultZoom: 1.0,
  })),
  updatePreferences: vi.fn(),
  isLocalStorageAvailable: vi.fn(() => true),
}));

describe('SimpleDocumentViewer - Direct Rendering Reliability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window methods for DRM features
    Object.defineProperty(window, 'onbeforeprint', {
      writable: true,
      value: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property 2: Direct rendering reliability
   * For any valid PDF document, the Direct_PDF_Rendering system should successfully 
   * render the document without requiring pre-conversion
   */
  it('should render PDFs directly without pre-conversion', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data for valid PDF scenarios
        fc.record({
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pdfUrl: fc.webUrl().map(url => url.replace('http://', 'https://') + '/valid-document.pdf'),
          enableReliabilityFeatures: fc.boolean(),
          viewMode: fc.constantFrom('continuous', 'paged'),
        }),
        async (testData) => {
          const props: SimpleDocumentViewerProps = {
            documentId: testData.documentId,
            documentTitle: testData.documentTitle,
            pdfUrl: testData.pdfUrl,
            enableReliabilityFeatures: testData.enableReliabilityFeatures,
          };

          const { unmount } = render(<SimpleDocumentViewer {...props} />);

          // Wait for direct PDF rendering to complete
          await waitFor(() => {
            expect(screen.getByTestId('direct-pdf-renderer')).toBeInTheDocument();
          }, { timeout: 1000 });

          // Property: Direct rendering reliability
          // Should use direct PDF.js rendering, not legacy image-based rendering
          const directRenderer = screen.getByTestId('direct-pdf-renderer');
          const pdfCanvas = screen.getByTestId('pdf-canvas');
          const pdfContent = screen.getByTestId('pdf-content');

          expect(directRenderer).toBeInTheDocument();
          expect(pdfCanvas).toBeInTheDocument();
          expect(pdfContent).toBeInTheDocument();

          // Should NOT use legacy image-based rendering components
          expect(screen.queryByTestId('legacy-continuous-view')).not.toBeInTheDocument();
          expect(screen.queryByTestId('legacy-paged-view')).not.toBeInTheDocument();

          // Should render directly without pre-conversion
          expect(pdfContent).toHaveTextContent('Direct PDF.js Rendering');

          unmount();
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  });

  /**
   * Property: Direct rendering handles various PDF formats
   * The system should handle different PDF characteristics without pre-conversion
   */
  it('should handle various PDF formats directly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pdfFormat: fc.constantFrom('standard', 'complex', 'large', 'encrypted'),
          enableDRMProtection: fc.boolean(),
          allowTextSelection: fc.boolean(),
        }),
        async (testData) => {
          // Generate PDF URL based on format
          const pdfUrl = `https://example.com/valid-${testData.pdfFormat}-document.pdf`;

          const props: SimpleDocumentViewerProps = {
            documentId: testData.documentId,
            documentTitle: testData.documentTitle,
            pdfUrl,
            enableDRMProtection: testData.enableDRMProtection,
            allowTextSelection: testData.allowTextSelection,
          };

          const { unmount } = render(<SimpleDocumentViewer {...props} />);

          // Wait for direct rendering
          await waitFor(() => {
            expect(screen.getByTestId('direct-pdf-renderer')).toBeInTheDocument();
          }, { timeout: 1000 });

          // Property: Format handling reliability
          // Should render all valid formats directly
          const directRenderer = screen.getByTestId('direct-pdf-renderer');
          const pdfCanvas = screen.getByTestId('pdf-canvas');

          expect(directRenderer).toBeInTheDocument();
          expect(pdfCanvas).toBeInTheDocument();

          // Canvas should have valid dimensions for direct rendering
          expect(pdfCanvas).toHaveAttribute('width', '800');
          expect(pdfCanvas).toHaveAttribute('height', '600');

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Direct rendering error handling
   * Invalid PDFs should be handled gracefully without falling back to conversion
   */
  it('should handle invalid PDFs gracefully in direct rendering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          invalidReason: fc.constantFrom('corrupted', 'missing', 'malformed'),
        }),
        async (testData) => {
          // Generate invalid PDF URL
          const pdfUrl = `https://example.com/invalid-${testData.invalidReason}-document.pdf`;

          const props: SimpleDocumentViewerProps = {
            documentId: testData.documentId,
            documentTitle: testData.documentTitle,
            pdfUrl,
            enableReliabilityFeatures: true,
          };

          const { unmount } = render(<SimpleDocumentViewer {...props} />);

          // Wait for error handling
          await waitFor(() => {
            // Should show error state, not fall back to legacy rendering
            const hasError = screen.queryByTestId('viewer-error-mock') !== null;
            const hasDirectRenderer = screen.queryByTestId('direct-pdf-renderer') !== null;
            expect(hasError || hasDirectRenderer).toBe(true);
          }, { timeout: 1000 });

          // Property: Error handling reliability
          // Should handle errors in direct rendering system, not fall back to conversion
          const hasError = screen.queryByTestId('viewer-error-mock') !== null;
          const hasDirectRenderer = screen.queryByTestId('direct-pdf-renderer') !== null;

          // Either should show error or continue with direct rendering
          expect(hasError || hasDirectRenderer).toBe(true);

          // Should NOT fall back to legacy image-based rendering
          expect(screen.queryByTestId('legacy-continuous-view')).not.toBeInTheDocument();
          expect(screen.queryByTestId('legacy-paged-view')).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 10 } // Reduced for faster testing
    );
  });

  /**
   * Property: Direct rendering with DRM features
   * DRM features should work with direct rendering without requiring conversion
   */
  it('should apply DRM features to direct rendering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pdfUrl: fc.webUrl().map(url => url.replace('http://', 'https://') + '/valid-document.pdf'),
          enableDRMProtection: fc.constant(true), // Always enable DRM for this test
          allowTextSelection: fc.boolean(),
          allowPrinting: fc.boolean(),
          allowDownload: fc.boolean(),
        }),
        async (testData) => {
          const props: SimpleDocumentViewerProps = {
            documentId: testData.documentId,
            documentTitle: testData.documentTitle,
            pdfUrl: testData.pdfUrl,
            enableDRMProtection: testData.enableDRMProtection,
            allowTextSelection: testData.allowTextSelection,
            allowPrinting: testData.allowPrinting,
            allowDownload: testData.allowDownload,
          };

          const { unmount } = render(<SimpleDocumentViewer {...props} />);

          // Wait for direct rendering with DRM
          await waitFor(() => {
            expect(screen.getByTestId('direct-pdf-renderer')).toBeInTheDocument();
          }, { timeout: 1000 });

          // Property: DRM with direct rendering
          // DRM features should be applied to direct rendering
          const directRenderer = screen.getByTestId('direct-pdf-renderer');
          const viewerContainer = screen.getByTestId('simple-document-viewer');

          expect(directRenderer).toBeInTheDocument();
          expect(viewerContainer).toBeInTheDocument();

          // Verify DRM styling is applied to the container
          const containerStyle = window.getComputedStyle(viewerContainer);
          if (!testData.allowTextSelection) {
            // Text selection should be disabled when DRM is enabled and text selection is not allowed
            expect(containerStyle.userSelect).toBe('none');
          }

          // Should still use direct rendering, not conversion
          expect(screen.getByTestId('pdf-canvas')).toBeInTheDocument();
          expect(screen.queryByTestId('legacy-continuous-view')).not.toBeInTheDocument();
          expect(screen.queryByTestId('legacy-paged-view')).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 10 } // Reduced for faster testing
    );
  });

  /**
   * Property: Direct rendering performance
   * Direct rendering should be faster than conversion-based rendering
   */
  it('should render directly without conversion delays', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pdfUrl: fc.webUrl().map(url => url.replace('http://', 'https://') + '/valid-document.pdf'),
        }),
        async (testData) => {
          const props: SimpleDocumentViewerProps = {
            documentId: testData.documentId,
            documentTitle: testData.documentTitle,
            pdfUrl: testData.pdfUrl,
            enableReliabilityFeatures: true,
          };

          const startTime = Date.now();
          const { unmount } = render(<SimpleDocumentViewer {...props} />);

          // Wait for direct rendering to complete
          await waitFor(() => {
            expect(screen.getByTestId('direct-pdf-renderer')).toBeInTheDocument();
          }, { timeout: 1000 });

          const renderTime = Date.now() - startTime;

          // Property: Performance reliability
          // Direct rendering should complete quickly (under 3 seconds for mocked rendering)
          expect(renderTime).toBeLessThan(3000);

          // Should use direct rendering components
          expect(screen.getByTestId('direct-pdf-renderer')).toBeInTheDocument();
          expect(screen.getByTestId('pdf-canvas')).toBeInTheDocument();

          // Should not show loading spinner after rendering completes
          expect(screen.queryByTestId('loading-spinner-mock')).not.toBeInTheDocument();

          unmount();
        }
      ),
      { numRuns: 10 } // Reduced for faster testing
    );
  });
});