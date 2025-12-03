/**
 * Test: Content Type Routing
 * 
 * This test verifies that the PreviewViewerClient correctly routes to the appropriate
 * viewer component based on content type:
 * - PDF routes to flipbook viewer
 * - Image routes to image viewer
 * - Video routes to video player
 * - Link routes to link preview
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { render, screen, waitFor } from '@testing-library/react';
import PreviewViewerClient from '../PreviewViewerClient';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ContentType } from '@/lib/types/content';

// Mock fetch for PDF page loading
global.fetch = vi.fn();

// Mock FlipBookContainerWithDRM
vi.mock('@/components/flipbook/FlipBookContainerWithDRM', () => ({
  FlipBookContainerWithDRM: ({ documentId, pages, watermarkText, userEmail, showWatermark }: any) => (
    <div data-testid="flipbook-viewer">
      <div data-testid="viewer-type">flipbook</div>
      <div data-testid="document-id">{documentId}</div>
      <div data-testid="page-count">{pages.length}</div>
      <div data-testid="watermark-text">{watermarkText}</div>
      <div data-testid="user-email">{userEmail}</div>
      <div data-testid="show-watermark">{showWatermark ? 'true' : 'false'}</div>
    </div>
  ),
}));

// Mock ImageViewer
vi.mock('@/components/viewers/ImageViewer', () => ({
  default: ({ imageUrl, metadata, watermark, title }: any) => (
    <div data-testid="image-viewer">
      <div data-testid="viewer-type">image</div>
      <div data-testid="image-url">{imageUrl}</div>
      <div data-testid="image-width">{metadata.width}</div>
      <div data-testid="image-height">{metadata.height}</div>
      <div data-testid="watermark-enabled">{watermark ? 'true' : 'false'}</div>
      <div data-testid="title">{title}</div>
    </div>
  ),
}));

// Mock VideoPlayer
vi.mock('@/components/viewers/VideoPlayer', () => ({
  default: ({ videoUrl, metadata, watermark, title }: any) => (
    <div data-testid="video-player">
      <div data-testid="viewer-type">video</div>
      <div data-testid="video-url">{videoUrl}</div>
      <div data-testid="video-duration">{metadata.duration}</div>
      <div data-testid="watermark-enabled">{watermark ? 'true' : 'false'}</div>
      <div data-testid="title">{title}</div>
    </div>
  ),
}));

// Mock LinkPreview
vi.mock('@/components/viewers/LinkPreview', () => ({
  default: ({ linkUrl, metadata, title }: any) => (
    <div data-testid="link-preview">
      <div data-testid="viewer-type">link</div>
      <div data-testid="link-url">{linkUrl}</div>
      <div data-testid="link-domain">{metadata.domain}</div>
      <div data-testid="title">{title}</div>
    </div>
  ),
}));

describe('PreviewViewerClient - Content Type Routing', () => {
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
    // Mock successful page fetch for PDF
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
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

  describe('PDF routes to flipbook viewer', () => {
    it('should render FlipBookContainerWithDRM for PDF content type', async () => {
      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      // Wait for pages to load
      await waitFor(() => {
        expect(screen.getByTestId('flipbook-viewer')).toBeInTheDocument();
      });

      expect(screen.getByTestId('viewer-type')).toHaveTextContent('flipbook');
    });

    it('should pass correct props to flipbook viewer', async () => {
      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
          enableWatermark={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('flipbook-viewer')).toBeInTheDocument();
      });

      expect(screen.getByTestId('document-id')).toHaveTextContent('doc-123');
      expect(screen.getByTestId('page-count')).toHaveTextContent('2');
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('Test Watermark');
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('show-watermark')).toHaveTextContent('true');
    });

    it('should fetch pages from API for PDF content', async () => {
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
    });

    it('should show loading state while fetching PDF pages', () => {
      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      expect(screen.getByText('Loading content...')).toBeInTheDocument();
    });

    it('should apply watermark settings to PDF viewer', async () => {
      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
          enableWatermark={true}
          watermarkText="Custom Watermark"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('flipbook-viewer')).toBeInTheDocument();
      });

      expect(screen.getByTestId('watermark-text')).toHaveTextContent('Custom Watermark');
      expect(screen.getByTestId('show-watermark')).toHaveTextContent('true');
    });
  });

  describe('Image routes to image viewer', () => {
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
      expect(screen.getByTestId('viewer-type')).toHaveTextContent('image');
    });

    it('should pass correct props to image viewer', () => {
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

      expect(screen.getByTestId('image-url')).toHaveTextContent('https://example.com/test.jpg');
      expect(screen.getByTestId('image-width')).toHaveTextContent('1920');
      expect(screen.getByTestId('image-height')).toHaveTextContent('1080');
      expect(screen.getByTestId('title')).toHaveTextContent('Test Document');
    });

    it('should apply watermark settings to image viewer', () => {
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

    it('should show error when image URL is missing', () => {
      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.IMAGE}
          metadata={{}}
        />
      );

      expect(screen.getByText('Image URL not provided')).toBeInTheDocument();
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

  describe('Video routes to video player', () => {
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
      expect(screen.getByTestId('viewer-type')).toHaveTextContent('video');
    });

    it('should pass correct props to video player', () => {
      const metadata = {
        duration: 120,
        width: 1920,
        height: 1080,
        fileSize: 10485760,
        mimeType: 'video/mp4',
        codec: 'h264',
      };

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.VIDEO}
          videoUrl="https://example.com/test.mp4"
          metadata={metadata}
        />
      );

      expect(screen.getByTestId('video-url')).toHaveTextContent('https://example.com/test.mp4');
      expect(screen.getByTestId('video-duration')).toHaveTextContent('120');
      expect(screen.getByTestId('title')).toHaveTextContent('Test Document');
    });

    it('should apply watermark settings to video player', () => {
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

    it('should show error when video URL is missing', () => {
      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.VIDEO}
          metadata={{}}
        />
      );

      expect(screen.getByText('Video URL not provided')).toBeInTheDocument();
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

  describe('Link routes to link preview', () => {
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
      expect(screen.getByTestId('viewer-type')).toHaveTextContent('link');
    });

    it('should pass correct props to link preview', () => {
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

      expect(screen.getByTestId('link-url')).toHaveTextContent('https://example.com');
      expect(screen.getByTestId('link-domain')).toHaveTextContent('example.com');
      expect(screen.getByTestId('title')).toHaveTextContent('Test Document');
    });

    it('should show error when link URL is missing', () => {
      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.LINK}
          metadata={{}}
        />
      );

      expect(screen.getByText('Link URL not provided')).toBeInTheDocument();
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

    it('should not apply watermark to link preview', () => {
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
  });

  describe('Content type routing behavior', () => {
    it('should route to different viewers based on content type', () => {
      const { rerender } = render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.IMAGE}
          imageUrl="https://example.com/test.jpg"
          metadata={{ width: 1920, height: 1080, fileSize: 2048000, mimeType: 'image/jpeg' }}
        />
      );

      expect(screen.getByTestId('image-viewer')).toBeInTheDocument();

      rerender(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.VIDEO}
          videoUrl="https://example.com/test.mp4"
          metadata={{ duration: 120, width: 1920, height: 1080, fileSize: 10485760, mimeType: 'video/mp4' }}
        />
      );

      expect(screen.getByTestId('video-player')).toBeInTheDocument();
      expect(screen.queryByTestId('image-viewer')).not.toBeInTheDocument();
    });

    it('should show unsupported content type message for unknown types', () => {
      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={'UNKNOWN' as ContentType}
        />
      );

      expect(screen.getByText('Unsupported Content Type')).toBeInTheDocument();
      expect(screen.getByText(/Content type "UNKNOWN" is not supported/)).toBeInTheDocument();
    });

    it('should apply watermark settings appropriately to each viewer type', async () => {
      const watermarkProps = {
        enableWatermark: true,
        watermarkText: 'Custom Watermark',
        watermarkOpacity: 0.5,
        watermarkSize: 20,
      };

      // Test PDF
      const { rerender } = render(
        <PreviewViewerClient
          {...baseProps}
          {...watermarkProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('flipbook-viewer')).toBeInTheDocument();
      });
      expect(screen.getByTestId('show-watermark')).toHaveTextContent('true');

      // Test Image
      rerender(
        <PreviewViewerClient
          {...baseProps}
          {...watermarkProps}
          contentType={ContentType.IMAGE}
          imageUrl="https://example.com/test.jpg"
          metadata={{ width: 1920, height: 1080, fileSize: 2048000, mimeType: 'image/jpeg' }}
        />
      );

      expect(screen.getByTestId('image-viewer')).toBeInTheDocument();
      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('true');

      // Test Video
      rerender(
        <PreviewViewerClient
          {...baseProps}
          {...watermarkProps}
          contentType={ContentType.VIDEO}
          videoUrl="https://example.com/test.mp4"
          metadata={{ duration: 120, width: 1920, height: 1080, fileSize: 10485760, mimeType: 'video/mp4' }}
        />
      );

      expect(screen.getByTestId('video-player')).toBeInTheDocument();
      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('true');
    });

    it('should handle missing URLs gracefully for each content type', () => {
      // Test IMAGE without URL
      const { rerender } = render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.IMAGE}
          metadata={{}}
        />
      );

      expect(screen.getByText('Image URL not provided')).toBeInTheDocument();

      // Test VIDEO without URL
      rerender(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.VIDEO}
          metadata={{}}
        />
      );

      expect(screen.getByText('Video URL not provided')).toBeInTheDocument();

      // Test LINK without URL
      rerender(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.LINK}
          metadata={{}}
        />
      );

      expect(screen.getByText('Link URL not provided')).toBeInTheDocument();
    });

    it('should pass document title to all viewer types', () => {
      const customTitle = 'My Custom Document';
      const propsWithTitle = { ...baseProps, documentTitle: customTitle };

      // Test Image
      const { rerender } = render(
        <PreviewViewerClient
          {...propsWithTitle}
          contentType={ContentType.IMAGE}
          imageUrl="https://example.com/test.jpg"
          metadata={{ width: 1920, height: 1080, fileSize: 2048000, mimeType: 'image/jpeg' }}
        />
      );

      expect(screen.getByTestId('title')).toHaveTextContent(customTitle);

      // Test Video
      rerender(
        <PreviewViewerClient
          {...propsWithTitle}
          contentType={ContentType.VIDEO}
          videoUrl="https://example.com/test.mp4"
          metadata={{ duration: 120, width: 1920, height: 1080, fileSize: 10485760, mimeType: 'video/mp4' }}
        />
      );

      expect(screen.getByTestId('title')).toHaveTextContent(customTitle);

      // Test Link
      rerender(
        <PreviewViewerClient
          {...propsWithTitle}
          contentType={ContentType.LINK}
          linkUrl="https://example.com"
          metadata={{ url: 'https://example.com', title: 'Example', domain: 'example.com' }}
        />
      );

      expect(screen.getByTestId('title')).toHaveTextContent(customTitle);
    });
  });

  describe('Error handling', () => {
    it('should show error state when PDF page fetch fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Failed to load pages' }),
      });

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Content')).toBeInTheDocument();
      });

      expect(screen.getByText('Failed to load pages')).toBeInTheDocument();
    });

    it('should provide retry button on error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Network error' }),
      });

      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.PDF}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should handle metadata parsing errors gracefully', () => {
      // Test with invalid metadata
      render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.IMAGE}
          imageUrl="https://example.com/test.jpg"
          metadata={null as any}
        />
      );

      // Should still render, even with null metadata
      expect(screen.getByTestId('image-viewer')).toBeInTheDocument();
    });
  });
});
