/**
 * Property-Based Tests for SimpleDocumentViewer Unified Rendering Consistency
 * 
 * **Feature: document-conversion-reliability-fix, Property 1: Unified rendering consistency**
 * 
 * Tests that the rendering output is identical whether viewed through the preview system 
 * or member view system using the enhanced SimpleDocumentViewer.
 * 
 * **Validates: Requirements 1.1**
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import SimpleDocumentViewer from '../SimpleDocumentViewer';
import type { SimpleDocumentViewerProps } from '../SimpleDocumentViewer';

// Mock PDF.js components
vi.mock('../PDFViewerWithPDFJS', () => ({
  default: vi.fn(({ onLoadComplete, onTotalPagesChange }) => {
    // Simulate successful PDF loading
    setTimeout(() => {
      onLoadComplete?.(5);
      onTotalPagesChange?.(5);
    }, 100);
    
    return (
      <div data-testid="pdf-viewer-mock">
        <canvas data-testid="pdf-canvas" width="800" height="600" />
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

describe('SimpleDocumentViewer - Unified Rendering Consistency', () => {
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
   * Property 1: Unified rendering consistency
   * For any PDF document, the rendering output should be identical whether viewed 
   * through the preview system or member view system
   */
  it('should render consistently across different viewer contexts', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data
        fc.record({
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pdfUrl: fc.webUrl(),
          watermarkText: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          enableDRMProtection: fc.boolean(),
          allowTextSelection: fc.boolean(),
          enableFlipbookNavigation: fc.boolean(),
        }),
        async (testData) => {
          // Create base props
          const baseProps: SimpleDocumentViewerProps = {
            documentId: testData.documentId,
            documentTitle: testData.documentTitle,
            pdfUrl: testData.pdfUrl,
            watermark: testData.watermarkText ? {
              text: testData.watermarkText,
              opacity: 0.3,
              fontSize: 24,
            } : undefined,
            enableDRMProtection: testData.enableDRMProtection,
            allowTextSelection: testData.allowTextSelection,
            enableFlipbookNavigation: testData.enableFlipbookNavigation,
          };

          // Render in "preview" context (minimal features)
          const { unmount: unmountPreview } = render(
            <SimpleDocumentViewer
              {...baseProps}
              enableScreenshotPrevention={false}
              enableReliabilityFeatures={true}
              data-testid="preview-viewer"
            />
          );

          // Wait for PDF to load
          await waitFor(() => {
            expect(screen.getByTestId('pdf-viewer-mock')).toBeInTheDocument();
          });

          // Capture preview rendering state
          const previewViewer = screen.getByTestId('simple-document-viewer');
          const previewCanvas = screen.getByTestId('pdf-canvas');
          const previewToolbar = screen.getByTestId('viewer-toolbar-mock');

          // Verify preview viewer is rendered
          expect(previewViewer).toBeInTheDocument();
          expect(previewCanvas).toBeInTheDocument();
          expect(previewToolbar).toBeInTheDocument();

          // Store preview rendering characteristics
          const previewState = {
            hasViewer: !!previewViewer,
            hasCanvas: !!previewCanvas,
            hasToolbar: !!previewToolbar,
            canvasWidth: previewCanvas.getAttribute('width'),
            canvasHeight: previewCanvas.getAttribute('height'),
            viewerClasses: previewViewer.className,
          };

          unmountPreview();

          // Render in "member" context (full features)
          const { unmount: unmountMember } = render(
            <SimpleDocumentViewer
              {...baseProps}
              enableScreenshotPrevention={testData.enableDRMProtection}
              enableReliabilityFeatures={true}
              data-testid="member-viewer"
            />
          );

          // Wait for PDF to load
          await waitFor(() => {
            expect(screen.getByTestId('pdf-viewer-mock')).toBeInTheDocument();
          });

          // Capture member rendering state
          const memberViewer = screen.getByTestId('simple-document-viewer');
          const memberCanvas = screen.getByTestId('pdf-canvas');
          const memberToolbar = screen.getByTestId('viewer-toolbar-mock');

          // Verify member viewer is rendered
          expect(memberViewer).toBeInTheDocument();
          expect(memberCanvas).toBeInTheDocument();
          expect(memberToolbar).toBeInTheDocument();

          // Store member rendering characteristics
          const memberState = {
            hasViewer: !!memberViewer,
            hasCanvas: !!memberCanvas,
            hasToolbar: !!memberToolbar,
            canvasWidth: memberCanvas.getAttribute('width'),
            canvasHeight: memberCanvas.getAttribute('height'),
            viewerClasses: memberViewer.className,
          };

          // Property: Unified rendering consistency
          // The core rendering components should be identical
          expect(previewState.hasViewer).toBe(memberState.hasViewer);
          expect(previewState.hasCanvas).toBe(memberState.hasCanvas);
          expect(previewState.hasToolbar).toBe(memberState.hasToolbar);
          expect(previewState.canvasWidth).toBe(memberState.canvasWidth);
          expect(previewState.canvasHeight).toBe(memberState.canvasHeight);

          // Both should use the same underlying PDF rendering system
          expect(previewState.hasCanvas && memberState.hasCanvas).toBe(true);

          unmountMember();
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  });

  /**
   * Property: Watermark consistency across contexts
   * Watermarks should render identically in both preview and member contexts
   */
  it('should render watermarks consistently across contexts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pdfUrl: fc.webUrl(),
          watermarkText: fc.string({ minLength: 1, maxLength: 50 }),
          watermarkOpacity: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
          watermarkFontSize: fc.integer({ min: 12, max: 48 }),
        }),
        async (testData) => {
          const watermarkSettings = {
            text: testData.watermarkText,
            opacity: testData.watermarkOpacity,
            fontSize: testData.watermarkFontSize,
          };

          const baseProps: SimpleDocumentViewerProps = {
            documentId: testData.documentId,
            documentTitle: testData.documentTitle,
            pdfUrl: testData.pdfUrl,
            watermark: watermarkSettings,
          };

          // Test preview context
          const { unmount: unmountPreview } = render(
            <SimpleDocumentViewer {...baseProps} />
          );

          await waitFor(() => {
            expect(screen.getByTestId('pdf-viewer-mock')).toBeInTheDocument();
          });

          const previewHasWatermark = screen.queryByTestId('watermark-overlay-mock') !== null;
          unmountPreview();

          // Test member context
          const { unmount: unmountMember } = render(
            <SimpleDocumentViewer {...baseProps} enableDRMProtection={true} />
          );

          await waitFor(() => {
            expect(screen.getByTestId('pdf-viewer-mock')).toBeInTheDocument();
          });

          const memberHasWatermark = screen.queryByTestId('watermark-overlay-mock') !== null;
          unmountMember();

          // Property: Watermark consistency
          // Watermarks should be present in both contexts when configured
          expect(previewHasWatermark).toBe(memberHasWatermark);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Navigation consistency across contexts
   * Navigation controls should work identically in both contexts
   */
  it('should provide consistent navigation across contexts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pdfUrl: fc.webUrl(),
          enableFlipbookNavigation: fc.boolean(),
          showPageNumbers: fc.boolean(),
          enableZoom: fc.boolean(),
        }),
        async (testData) => {
          const baseProps: SimpleDocumentViewerProps = {
            documentId: testData.documentId,
            documentTitle: testData.documentTitle,
            pdfUrl: testData.pdfUrl,
            enableFlipbookNavigation: testData.enableFlipbookNavigation,
            showPageNumbers: testData.showPageNumbers,
            enableZoom: testData.enableZoom,
          };

          // Test preview context
          const { unmount: unmountPreview } = render(
            <SimpleDocumentViewer {...baseProps} />
          );

          await waitFor(() => {
            expect(screen.getByTestId('viewer-toolbar-mock')).toBeInTheDocument();
          });

          const previewHasToolbar = screen.queryByTestId('viewer-toolbar-mock') !== null;
          unmountPreview();

          // Test member context
          const { unmount: unmountMember } = render(
            <SimpleDocumentViewer {...baseProps} enableDRMProtection={true} />
          );

          await waitFor(() => {
            expect(screen.getByTestId('viewer-toolbar-mock')).toBeInTheDocument();
          });

          const memberHasToolbar = screen.queryByTestId('viewer-toolbar-mock') !== null;
          unmountMember();

          // Property: Navigation consistency
          // Both contexts should have identical navigation capabilities
          expect(previewHasToolbar).toBe(memberHasToolbar);
          expect(previewHasToolbar).toBe(true); // Both should have toolbars
        }
      ),
      { numRuns: 100 }
    );
  });
});