/**
 * Integration Tests: PreviewViewerClient
 * 
 * Tests the integration between PreviewViewerClient and different viewer components
 * including SimpleDocumentViewer for PDFs.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PreviewViewerClient from '../PreviewViewerClient';
import { ContentType } from '@/lib/types/content';
import '@testing-library/jest-dom';

// Mock fetch for PDF pages
global.fetch = vi.fn();

// Mock SimpleDocumentViewer with realistic behavior
vi.mock('@/components/viewers/SimpleDocumentViewer', () => ({
  default: ({ documentId, documentTitle, pages, watermark, onClose }: any) => {
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [actualPages, setActualPages] = React.useState<any[]>([]);

    React.useEffect(() => {
      // Simulate fetching pages
      const fetchPages = async () => {
        try {
          const response = await fetch(`/api/documents/${documentId}/pages`);
          if (!response.ok) {
            throw new Error('Failed to Load Content');
          }
          const data = await response.json();
          setActualPages(data.pages || []);
          setIsLoading(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to Load Content');
          setIsLoading(false);
        }
      };

      if (documentId) {
        fetchPages();
      }
    }, [documentId]);

    if (isLoading) {
      return <div>Loading content...</div>;
    }

    if (error) {
      return <div>{error}</div>;
    }

    if (actualPages.length === 0) {
      return <div>No Pages Available</div>;
    }

    return (
      <div data-testid="simple-document-viewer">
        <div data-testid="document-id">{documentId}</div>
        <div data-testid="document-title">{documentTitle}</div>
        <div data-testid="page-count">{actualPages.length}</div>
        <div data-testid="watermark-enabled">{watermark ? 'true' : 'false'}</div>
        <div data-testid="watermark-text">{watermark?.text || 'none'}</div>
        <div data-testid="watermark-opacity">{watermark?.opacity || 0}</div>
        <div data-testid="watermark-font-size">{watermark?.fontSize || 0}</div>
        <button data-testid="close-button" onClick={onClose}>Close</button>
      </div>
    );
  },
}));

// Mock ImageViewer
vi.mock('@/components/viewers/ImageViewer', () => ({
  default: ({ imageUrl, metadata, watermark, title }: any) => (
    <div data-testid="image-viewer">
      <div data-testid="image-url">{imageUrl}</div>
      <div data-testid="title">{title}</div>
      <div data-testid="watermark-enabled">{watermark ? 'true' : 'false'}</div>
      <div data-testid="image-width">{metadata.width}</div>
      <div data-testid="image-height">{metadata.height}</div>
    </div>
  ),
}));

// Mock VideoPlayer
vi.mock('@/components/viewers/VideoPlayer', () => ({
  default: ({ videoUrl, metadata, watermark, title }: any) => (
    <div data-testid="video-player">
      <div data-testid="video-url">{videoUrl}</div>
      <div data-testid="title">{title}</div>
      <div data-testid="watermark-enabled">{watermark ? 'true' : 'false'}</div>
      <div data-testid="video-duration">{metadata.duration}</div>
    </div>
  ),
}));

// Mock LinkPreview
vi.mock('@/components/viewers/LinkPreview', () => ({
  default: ({ linkUrl, metadata, title }: any) => (
    <div data-testid="link-preview">
      <div data-testid="link-url">{linkUrl}</div>
      <div data-testid="title">{title}</div>
      <div data-testid="link-domain">{metadata.domain}</div>
    </div>
  ),
}));

describe('PreviewViewerClient Integration Tests', () => {
  const baseProps = {
    documentId: 'doc-123',
    documentTitle: 'Test Document',
    userEmail: 'test@example.com',
    enableWatermark: false,
    watermarkText: 'Test Watermark',
    watermarkOpacity: 0.3,
    watermarkSize: 16,
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

  describe('PDF rendering with SimpleDocumentViewer', () => {
    it('should render SimpleDocumentViewer for PDF content type', async () => {
      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
      });

      expect(screen.getByTestId('document-id')).toHaveTextContent('doc-123');
      expect(screen.getByTestId('document-title')).toHaveTextContent('Test Document');
      expect(screen.getByTestId('page-count')).toHaveTextContent('2');
    });

    it('should fetch page data from API for PDF documents', async () => {
      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/documents/doc-123/pages');
      });

      expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
    });

    it('should pass watermark settings to SimpleDocumentViewer', async () => {
      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
          enableWatermark={true}
          watermarkText="Custom Watermark"
          watermarkOpacity={0.5}
          watermarkSize={20}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
      });

      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('true');
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('Custom Watermark');
      expect(screen.getByTestId('watermark-opacity')).toHaveTextContent('0.5');
      expect(screen.getByTestId('watermark-font-size')).toHaveTextContent('20');
    });

    it('should handle PDF page loading errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should show no pages available when API returns empty pages', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          pages: [],
        }),
      });

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No Pages Available')).toBeInTheDocument();
      });
    });

    it('should handle close button click in SimpleDocumentViewer', async () => {
      const mockLocation = { href: '' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('close-button'));
      expect(mockLocation.href).toBe('/dashboard');
    });
  });

  describe('Image rendering', () => {
    it('should render ImageViewer for IMAGE content type', () => {
      const metadata = {
        width: 1920,
        height: 1080,
        fileSize: 2048000,
        mimeType: 'image/jpeg',
      };

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.IMAGE}
          imageUrl="https://example.com/test.jpg"
          metadata={metadata}
        />
      );

      expect(screen.getByTestId('image-viewer')).toBeInTheDocument();
      expect(screen.getByTestId('image-url')).toHaveTextContent('https://example.com/test.jpg');
      expect(screen.getByTestId('title')).toHaveTextContent('Test Document');
      expect(screen.getByTestId('image-width')).toHaveTextContent('1920');
      expect(screen.getByTestId('image-height')).toHaveTextContent('1080');
    });

    it('should pass watermark settings to ImageViewer', () => {
      const metadata = {
        width: 1920,
        height: 1080,
        fileSize: 2048000,
        mimeType: 'image/jpeg',
      };

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.IMAGE}
          imageUrl="https://example.com/test.jpg"
          metadata={metadata}
          enableWatermark={true}
        />
      );

      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('true');
    });

    it('should not fetch pages for IMAGE content type', () => {
      const metadata = {
        width: 1920,
        height: 1080,
        fileSize: 2048000,
        mimeType: 'image/jpeg',
      };

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.IMAGE}
          imageUrl="https://example.com/test.jpg"
          metadata={metadata}
        />
      );

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Video rendering', () => {
    it('should render VideoPlayer for VIDEO content type', () => {
      const metadata = {
        duration: 120,
        width: 1920,
        height: 1080,
        fileSize: 10485760,
        mimeType: 'video/mp4',
      };

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.VIDEO}
          videoUrl="https://example.com/test.mp4"
          metadata={metadata}
        />
      );

      expect(screen.getByTestId('video-player')).toBeInTheDocument();
      expect(screen.getByTestId('video-url')).toHaveTextContent('https://example.com/test.mp4');
      expect(screen.getByTestId('title')).toHaveTextContent('Test Document');
      expect(screen.getByTestId('video-duration')).toHaveTextContent('120');
    });

    it('should pass watermark settings to VideoPlayer', () => {
      const metadata = {
        duration: 120,
        width: 1920,
        height: 1080,
        fileSize: 10485760,
        mimeType: 'video/mp4',
      };

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.VIDEO}
          videoUrl="https://example.com/test.mp4"
          metadata={metadata}
          enableWatermark={true}
        />
      );

      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('true');
    });

    it('should not fetch pages for VIDEO content type', () => {
      const metadata = {
        duration: 120,
        width: 1920,
        height: 1080,
        fileSize: 10485760,
        mimeType: 'video/mp4',
      };

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.VIDEO}
          videoUrl="https://example.com/test.mp4"
          metadata={metadata}
        />
      );

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Link rendering', () => {
    it('should render LinkPreview for LINK content type', () => {
      const metadata = {
        url: 'https://example.com',
        title: 'Example Website',
        description: 'An example website',
        domain: 'example.com',
      };

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.LINK}
          linkUrl="https://example.com"
          metadata={metadata}
        />
      );

      expect(screen.getByTestId('link-preview')).toBeInTheDocument();
      expect(screen.getByTestId('link-url')).toHaveTextContent('https://example.com');
      expect(screen.getByTestId('title')).toHaveTextContent('Test Document');
      expect(screen.getByTestId('link-domain')).toHaveTextContent('example.com');
    });

    it('should not pass watermark to LinkPreview (not supported)', () => {
      const metadata = {
        url: 'https://example.com',
        title: 'Example Website',
        domain: 'example.com',
      };

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.LINK}
          linkUrl="https://example.com"
          metadata={metadata}
          enableWatermark={true}
        />
      );

      // Link preview doesn't have watermark support
      expect(screen.queryByTestId('watermark-enabled')).not.toBeInTheDocument();
    });

    it('should not fetch pages for LINK content type', () => {
      const metadata = {
        url: 'https://example.com',
        title: 'Example Website',
        domain: 'example.com',
      };

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.LINK}
          linkUrl="https://example.com"
          metadata={metadata}
        />
      );

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Watermark configuration', () => {
    it('should create correct watermark config when enabled', async () => {
      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
          enableWatermark={true}
          watermarkText="Custom Text"
          watermarkOpacity={0.7}
          watermarkSize={24}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
      });

      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('true');
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('Custom Text');
      expect(screen.getByTestId('watermark-opacity')).toHaveTextContent('0.7');
      expect(screen.getByTestId('watermark-font-size')).toHaveTextContent('24');
    });

    it('should use user email as fallback when watermark text is empty', async () => {
      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
          enableWatermark={true}
          watermarkText=""
          userEmail="user@example.com"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
      });

      expect(screen.getByTestId('watermark-text')).toHaveTextContent('user@example.com');
    });

    it('should not create watermark config when disabled', async () => {
      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
          enableWatermark={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
      });

      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('false');
    });
  });

  describe('Error handling', () => {
    it('should show loading state while fetching PDF pages', () => {
      // Mock a slow response
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      expect(screen.getByText('Loading content...')).toBeInTheDocument();
    });

    it('should handle API error responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          message: 'Document not found',
        }),
      });

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No Pages Available')).toBeInTheDocument();
      });
    });

    it('should show appropriate error for missing URLs', () => {
      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.IMAGE}
          // Intentionally omit imageUrl
          metadata={{}}
        />
      );

      expect(screen.getByText('Image Not Available')).toBeInTheDocument();
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain existing behavior for non-PDF content types', () => {
      // Test that existing image, video, and link viewers still work as before
      const imageMetadata = {
        width: 1920,
        height: 1080,
        fileSize: 2048000,
        mimeType: 'image/jpeg',
      };

      const { rerender } = render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.IMAGE}
          imageUrl="https://example.com/test.jpg"
          metadata={imageMetadata}
        />
      );

      expect(screen.getByTestId('image-viewer')).toBeInTheDocument();

      const videoMetadata = {
        duration: 120,
        width: 1920,
        height: 1080,
        fileSize: 10485760,
        mimeType: 'video/mp4',
      };

      rerender(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.VIDEO}
          videoUrl="https://example.com/test.mp4"
          metadata={videoMetadata}
        />
      );

      expect(screen.getByTestId('video-player')).toBeInTheDocument();

      const linkMetadata = {
        url: 'https://example.com',
        title: 'Example Website',
        domain: 'example.com',
      };

      rerender(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.LINK}
          linkUrl="https://example.com"
          metadata={linkMetadata}
        />
      );

      expect(screen.getByTestId('link-preview')).toBeInTheDocument();
    });

    it('should not break existing watermark behavior for supported content types', () => {
      const imageMetadata = {
        width: 1920,
        height: 1080,
        fileSize: 2048000,
        mimeType: 'image/jpeg',
      };

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.IMAGE}
          imageUrl="https://example.com/test.jpg"
          metadata={imageMetadata}
          enableWatermark={true}
        />
      );

      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('true');
    });
  });
});