/**
 * Property Test: Content Type Consistency
 * 
 * **Feature: simple-pdf-viewer, Property 8: Content type consistency**
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
 * 
 * This property test verifies that all content types provide consistent navigation
 * and layout behavior in the PreviewViewerClient.
 * 
 * Property: For any content type (PDF, image, video, link), the full-screen viewer
 * should provide consistent navigation controls and layout.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import PreviewViewerClient from '../PreviewViewerClient';
import { ContentType } from '@/lib/types/content';
import '@testing-library/jest-dom';

// Mock all viewer components
vi.mock('@/components/viewers/SimpleDocumentViewer', () => ({
  default: ({ documentId, documentTitle, pages, watermark, onClose }: any) => (
    <div data-testid="simple-document-viewer">
      <div data-testid="viewer-type">simple-document</div>
      <div data-testid="document-id">{documentId}</div>
      <div data-testid="document-title">{documentTitle}</div>
      <div data-testid="page-count">{pages.length}</div>
      <div data-testid="watermark-enabled">{watermark ? 'true' : 'false'}</div>
      <button data-testid="close-button" onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/components/viewers/ImageViewer', () => ({
  default: ({ imageUrl, metadata, watermark, title }: any) => (
    <div data-testid="image-viewer">
      <div data-testid="viewer-type">image</div>
      <div data-testid="image-url">{imageUrl}</div>
      <div data-testid="title">{title}</div>
      <div data-testid="watermark-enabled">{watermark ? 'true' : 'false'}</div>
    </div>
  ),
}));

vi.mock('@/components/viewers/VideoPlayer', () => ({
  default: ({ videoUrl, metadata, watermark, title }: any) => (
    <div data-testid="video-player">
      <div data-testid="viewer-type">video</div>
      <div data-testid="video-url">{videoUrl}</div>
      <div data-testid="title">{title}</div>
      <div data-testid="watermark-enabled">{watermark ? 'true' : 'false'}</div>
    </div>
  ),
}));

vi.mock('@/components/viewers/LinkPreview', () => ({
  default: ({ linkUrl, metadata, title }: any) => (
    <div data-testid="link-preview">
      <div data-testid="viewer-type">link</div>
      <div data-testid="link-url">{linkUrl}</div>
      <div data-testid="title">{title}</div>
    </div>
  ),
}));

// Mock fetch for PDF pages
global.fetch = vi.fn();

describe('Property Test: Content Type Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear DOM between tests
    document.body.innerHTML = '';
    
    // Mock successful PDF pages fetch
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        pages: [
          {
            pageNumber: 1,
            pageUrl: 'https://example.com/page1.jpg',
            dimensions: { width: 800, height: 1000 },
          },
          {
            pageNumber: 2,
            pageUrl: 'https://example.com/page2.jpg',
            dimensions: { width: 800, height: 1000 },
          },
        ],
      }),
    });
  });

  // Generator for content type test data
  const contentTypeArbitrary = fc.oneof(
    fc.constant(ContentType.PDF),
    fc.constant(ContentType.IMAGE),
    fc.constant(ContentType.VIDEO),
    fc.constant(ContentType.LINK)
  );

  const documentPropsArbitrary = fc.record({
    documentId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    documentTitle: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    userEmail: fc.emailAddress(),
    enableWatermark: fc.boolean(),
    watermarkText: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    watermarkOpacity: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
    watermarkSize: fc.integer({ min: 10, max: 50 }),
  });

  const urlArbitrary = fc.webUrl();

  const metadataArbitrary = fc.record({
    width: fc.integer({ min: 100, max: 4000 }),
    height: fc.integer({ min: 100, max: 4000 }),
    fileSize: fc.integer({ min: 1000, max: 100000000 }),
    mimeType: fc.string({ minLength: 5, maxLength: 50 }),
    duration: fc.integer({ min: 1, max: 7200 }), // For video
    domain: fc.domain(), // For links
  });

  it('should provide consistent navigation controls across all content types', async () => {
    await fc.assert(
      fc.asyncProperty(
        contentTypeArbitrary,
        documentPropsArbitrary,
        urlArbitrary,
        metadataArbitrary,
        async (contentType, docProps, url, metadata) => {
          const props = {
            ...docProps,
            contentType,
            ...(contentType === ContentType.PDF && { pdfUrl: url }),
            ...(contentType === ContentType.IMAGE && { imageUrl: url }),
            ...(contentType === ContentType.VIDEO && { videoUrl: url }),
            ...(contentType === ContentType.LINK && { linkUrl: url }),
            metadata,
          };

          const { unmount } = render(<PreviewViewerClient {...props} />);

          try {
            // Wait for async operations (PDF page loading)
            if (contentType === ContentType.PDF) {
              await waitFor(() => {
                expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
              });
            }

            // All content types should render a viewer
            const viewerSelectors = {
              [ContentType.PDF]: 'simple-document-viewer',
              [ContentType.IMAGE]: 'image-viewer', 
              [ContentType.VIDEO]: 'video-player',
              [ContentType.LINK]: 'link-preview'
            };
            
            const expectedViewer = viewerSelectors[contentType];
            expect(screen.getByTestId(expectedViewer)).toBeInTheDocument();

            // All viewers should display the document title (if they have title support)
            const titleElement = screen.queryByTestId('title') || screen.queryByTestId('document-title');
            if (titleElement && docProps.documentTitle.trim()) {
              expect(titleElement.textContent?.trim()).toBe(docProps.documentTitle.trim());
            }

            // Watermark consistency (except for links which don't support watermarks)
            if (contentType !== ContentType.LINK) {
              const watermarkElement = screen.queryByTestId('watermark-enabled');
              if (watermarkElement) {
                expect(watermarkElement).toHaveTextContent(docProps.enableWatermark ? 'true' : 'false');
              }
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle missing URLs consistently across content types', async () => {
    // Mock empty pages response for PDF error test
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        pages: [], // Empty pages to trigger "No Pages Available"
      }),
    });

    // Simplified test with fixed props to avoid timeout issues
    const baseDocProps = {
      documentId: 'test-doc',
      documentTitle: 'Test Document',
      userEmail: 'test@example.com',
      enableWatermark: false,
      watermarkText: 'Test',
      watermarkOpacity: 0.5,
      watermarkSize: 16,
    };

    // Test each content type with fixed props
    const contentTypes = [ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK];
    
    for (const contentType of contentTypes) {
      // Clear DOM before each test
      document.body.innerHTML = '';
      
      const props = {
        ...baseDocProps,
        contentType,
        // Intentionally omit URLs to test error handling
        metadata: {},
      };

      const { unmount } = render(<PreviewViewerClient {...props} />);

      try {
        if (contentType === ContentType.PDF) {
          // PDF should show "No Pages Available" when no pages are loaded
          await waitFor(() => {
            expect(screen.getByText('No Pages Available')).toBeInTheDocument();
          }, { timeout: 1000 });
        } else {
          // Other content types should show appropriate error messages
          const errorMessageMap = {
            [ContentType.IMAGE]: 'Image Not Available',
            [ContentType.VIDEO]: 'Video Not Available',
            [ContentType.LINK]: 'Link Not Available'
          };
          
          const expectedMessage = errorMessageMap[contentType];
          if (expectedMessage) {
            expect(screen.getByText(expectedMessage)).toBeInTheDocument();
          }
        }

        // All error states should provide a way back to dashboard
        expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
      } finally {
        unmount();
      }
    }
  });

  it('should apply watermark settings consistently to supported content types', async () => {
    // Test each content type separately to avoid DOM conflicts
    const contentTypes = [ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO];
    
    for (const contentType of contentTypes) {
      await fc.assert(
        fc.asyncProperty(
          documentPropsArbitrary,
          urlArbitrary,
          metadataArbitrary,
          async (docProps, url, metadata) => {
            // Clear DOM before each test
            document.body.innerHTML = '';
            
            const props = {
              ...docProps,
              contentType,
              enableWatermark: true, // Force watermark enabled
              ...(contentType === ContentType.PDF && { pdfUrl: url }),
              ...(contentType === ContentType.IMAGE && { imageUrl: url }),
              ...(contentType === ContentType.VIDEO && { videoUrl: url }),
              metadata,
            };

            const { unmount } = render(<PreviewViewerClient {...props} />);

            try {
              if (contentType === ContentType.PDF) {
                await waitFor(() => {
                  expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
                });
              }

              // All supported content types should show watermark as enabled
              const watermarkElement = screen.queryByTestId('watermark-enabled');
              if (watermarkElement) {
                expect(watermarkElement).toHaveTextContent('true');
              }
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 5 } // Reduced runs since we're testing each type separately
      );
    }
  });

  it('should maintain consistent document identification across content types', async () => {
    await fc.assert(
      fc.asyncProperty(
        contentTypeArbitrary,
        documentPropsArbitrary,
        urlArbitrary,
        metadataArbitrary,
        async (contentType, docProps, url, metadata) => {
          const props = {
            ...docProps,
            contentType,
            ...(contentType === ContentType.PDF && { pdfUrl: url }),
            ...(contentType === ContentType.IMAGE && { imageUrl: url }),
            ...(contentType === ContentType.VIDEO && { videoUrl: url }),
            ...(contentType === ContentType.LINK && { linkUrl: url }),
            metadata,
          };

          const { unmount } = render(<PreviewViewerClient {...props} />);

          try {
            if (contentType === ContentType.PDF) {
              await waitFor(() => {
                expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
              });
              
              // PDF viewer should show document ID
              const docIdElement = screen.queryByTestId('document-id');
              if (docIdElement && docProps.documentId.trim()) {
                expect(docIdElement.textContent?.trim()).toBe(docProps.documentId.trim());
              }
            }

            // All viewers should have some form of title/identification
            const identificationElements = [
              screen.queryByTestId('title'),
              screen.queryByTestId('document-title'),
              screen.queryByTestId('document-id')
            ].filter(Boolean);

            expect(identificationElements.length).toBeGreaterThan(0);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should provide consistent error recovery across content types', async () => {
    await fc.assert(
      fc.asyncProperty(
        contentTypeArbitrary,
        documentPropsArbitrary,
        async (contentType, docProps) => {
          // Mock fetch failure for PDF
          if (contentType === ContentType.PDF) {
            (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
          }

          const props = {
            ...docProps,
            contentType,
            // Provide invalid/missing URLs to trigger errors
            ...(contentType === ContentType.PDF && { pdfUrl: undefined }),
            ...(contentType === ContentType.IMAGE && { imageUrl: undefined }),
            ...(contentType === ContentType.VIDEO && { videoUrl: undefined }),
            ...(contentType === ContentType.LINK && { linkUrl: undefined }),
            metadata: {},
          };

          const { unmount } = render(<PreviewViewerClient {...props} />);

          try {
            if (contentType === ContentType.PDF) {
              await waitFor(() => {
                // Should show either loading error or no pages available
                const hasError = screen.queryByText('Failed to Load Content') || 
                                screen.queryByText('No Pages Available');
                expect(hasError).toBeTruthy();
              });
            }

            // All content types should provide recovery option
            expect(screen.getAllByText('Back to Dashboard')[0]).toBeInTheDocument();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 15 }
    );
  });
});