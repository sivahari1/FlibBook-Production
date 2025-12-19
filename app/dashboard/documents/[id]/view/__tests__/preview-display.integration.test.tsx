/**
 * Integration Tests: Preview Display
 * 
 * End-to-end integration tests for preview display functionality
 * Tests complete preview flow with and without watermarks, URL parameter handling,
 * and full-size display across different viewport sizes
 * 
 * Requirements: 3.1, 3.2, 4.5
 */

import React from 'react';

import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import PreviewViewerClient from '../PreviewViewerClient';
import { ContentType } from '@/lib/types/content';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock FlipBookContainerWithDRM
vi.mock('@/components/flipbook/FlipBookContainerWithDRM', () => ({
  FlipBookContainerWithDRM: ({ 
    documentId, 
    pages, 
    watermarkText, 
    userEmail, 
    showWatermark,
    enableScreenshotPrevention,
    allowTextSelection 
  }: any) => (
    <div 
      data-testid="flipbook-container" 
      className="min-h-screen w-full"
      style={{ minHeight: '100vh', width: '100%' }}
    >
      <div data-testid="document-id">{documentId}</div>
      <div data-testid="page-count">{pages.length}</div>
      <div data-testid="watermark-enabled">{showWatermark ? 'true' : 'false'}</div>
      <div data-testid="watermark-text">{watermarkText || 'none'}</div>
      <div data-testid="user-email">{userEmail}</div>
      <div data-testid="screenshot-prevention">{enableScreenshotPrevention ? 'true' : 'false'}</div>
      <div data-testid="text-selection">{allowTextSelection ? 'true' : 'false'}</div>
      {pages.map((page: any) => (
        <div key={page.pageNumber} data-testid={`page-${page.pageNumber}`}>
          <img src={page.imageUrl} alt={`Page ${page.pageNumber}`} />
        </div>
      ))}
    </div>
  ),
}));

// Mock ImageViewer
vi.mock('@/components/viewers/ImageViewer', () => ({
  default: ({ imageUrl, metadata, watermark, title }: any) => (
    <div 
      data-testid="image-viewer" 
      className="min-h-screen w-full"
      style={{ minHeight: '100vh', width: '100%' }}
    >
      <div data-testid="image-url">{imageUrl}</div>
      <div data-testid="watermark-enabled">{watermark ? 'true' : 'false'}</div>
      <div data-testid="watermark-text">{watermark?.text || 'none'}</div>
      <div data-testid="watermark-opacity">{watermark?.opacity || 0}</div>
      <div data-testid="title">{title}</div>
      <img src={imageUrl} alt={title} style={{ width: '100%', height: 'auto' }} />
    </div>
  ),
}));

// Mock VideoPlayer
vi.mock('@/components/viewers/VideoPlayer', () => ({
  default: ({ videoUrl, metadata, watermark, title }: any) => (
    <div 
      data-testid="video-player" 
      className="min-h-screen w-full"
      style={{ minHeight: '100vh', width: '100%' }}
    >
      <div data-testid="video-url">{videoUrl}</div>
      <div data-testid="watermark-enabled">{watermark ? 'true' : 'false'}</div>
      <div data-testid="watermark-text">{watermark?.text || 'none'}</div>
      <div data-testid="title">{title}</div>
      <video src={videoUrl} style={{ width: '100%', height: 'auto' }} />
    </div>
  ),
}));

// Mock LinkPreview
vi.mock('@/components/viewers/LinkPreview', () => ({
  default: ({ linkUrl, metadata, title }: any) => (
    <div 
      data-testid="link-preview" 
      className="min-h-screen w-full"
      style={{ minHeight: '100vh', width: '100%' }}
    >
      <div data-testid="link-url">{linkUrl}</div>
      <div data-testid="title">{title}</div>
      <a href={linkUrl} target="_blank" rel="noopener noreferrer">
        {metadata.title || title}
      </a>
    </div>
  ),
}));

describe('Preview Display Integration Tests', () => {
  const mockPdfPages = [
    {
      pageNumber: 1,
      pageUrl: 'https://storage.example.com/page1.jpg',
      dimensions: { width: 800, height: 1000 },
    },
    {
      pageNumber: 2,
      pageUrl: 'https://storage.example.com/page2.jpg',
      dimensions: { width: 800, height: 1000 },
    },
    {
      pageNumber: 3,
      pageUrl: 'https://storage.example.com/page3.jpg',
      dimensions: { width: 800, height: 1000 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock for successful PDF page fetch
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ pages: mockPdfPages }),
    });
  });

  describe('End-to-end preview flow without watermark', () => {
    it('should display PDF preview without watermark by default', async () => {
      render(
        <PreviewViewerClient
          documentId="doc-123"
          documentTitle="Test Document"
          contentType={ContentType.PDF}
          userEmail="user@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      // Wait for pages to load
      await waitFor(() => {
        expect(screen.getByTestId('flipbook-container')).toBeInTheDocument();
      });

      // Verify watermark is disabled
      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('false');
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('none');

      // Verify all pages are rendered
      expect(screen.getByTestId('page-count')).toHaveTextContent('3');
      expect(screen.getByTestId('page-1')).toBeInTheDocument();
      expect(screen.getByTestId('page-2')).toBeInTheDocument();
      expect(screen.getByTestId('page-3')).toBeInTheDocument();
    });

    it('should display image preview without watermark', () => {
      render(
        <PreviewViewerClient
          documentId="doc-456"
          documentTitle="Test Image"
          contentType={ContentType.IMAGE}
          userEmail="user@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          imageUrl="https://example.com/test.jpg"
          metadata={{ width: 1920, height: 1080, fileSize: 2048000, mimeType: 'image/jpeg' }}
        />
      );

      expect(screen.getByTestId('image-viewer')).toBeInTheDocument();
      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('false');
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('none');
    });

    it('should display video preview without watermark', () => {
      render(
        <PreviewViewerClient
          documentId="doc-789"
          documentTitle="Test Video"
          contentType={ContentType.VIDEO}
          userEmail="user@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          videoUrl="https://example.com/test.mp4"
          metadata={{ duration: 120, width: 1920, height: 1080, fileSize: 10485760, mimeType: 'video/mp4' }}
        />
      );

      expect(screen.getByTestId('video-player')).toBeInTheDocument();
      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('false');
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('none');
    });

    it('should fetch PDF pages from API', async () => {
      render(
        <PreviewViewerClient
          documentId="doc-123"
          documentTitle="Test Document"
          contentType={ContentType.PDF}
          userEmail="user@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/documents/doc-123/pages');
      });
    });

    it('should show loading state during page fetch', () => {
      render(
        <PreviewViewerClient
          documentId="doc-123"
          documentTitle="Test Document"
          contentType={ContentType.PDF}
          userEmail="user@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      expect(screen.getByText('Loading content...')).toBeInTheDocument();
    });
  });

  describe('End-to-end preview flow with watermark', () => {
    it('should display PDF preview with watermark enabled', async () => {
      render(
        <PreviewViewerClient
          documentId="doc-123"
          documentTitle="Test Document"
          contentType={ContentType.PDF}
          userEmail="user@example.com"
          enableWatermark={true}
          watermarkText="CONFIDENTIAL"
          watermarkOpacity={0.5}
          watermarkSize={24}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('flipbook-container')).toBeInTheDocument();
      });

      // Verify watermark is enabled with correct settings
      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('true');
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('CONFIDENTIAL');
    });

    it('should display image preview with watermark', () => {
      render(
        <PreviewViewerClient
          documentId="doc-456"
          documentTitle="Test Image"
          contentType={ContentType.IMAGE}
          userEmail="user@example.com"
          enableWatermark={true}
          watermarkText="© 2024 Company"
          watermarkOpacity={0.4}
          watermarkSize={20}
          imageUrl="https://example.com/test.jpg"
          metadata={{ width: 1920, height: 1080, fileSize: 2048000, mimeType: 'image/jpeg' }}
        />
      );

      expect(screen.getByTestId('image-viewer')).toBeInTheDocument();
      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('true');
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('© 2024 Company');
      expect(screen.getByTestId('watermark-opacity')).toHaveTextContent('0.4');
    });

    it('should display video preview with watermark', () => {
      render(
        <PreviewViewerClient
          documentId="doc-789"
          documentTitle="Test Video"
          contentType={ContentType.VIDEO}
          userEmail="user@example.com"
          enableWatermark={true}
          watermarkText="INTERNAL USE ONLY"
          watermarkOpacity={0.6}
          watermarkSize={18}
          videoUrl="https://example.com/test.mp4"
          metadata={{ duration: 120, width: 1920, height: 1080, fileSize: 10485760, mimeType: 'video/mp4' }}
        />
      );

      expect(screen.getByTestId('video-player')).toBeInTheDocument();
      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('true');
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('INTERNAL USE ONLY');
    });

    it('should fallback to user email when watermark text is empty', async () => {
      render(
        <PreviewViewerClient
          documentId="doc-123"
          documentTitle="Test Document"
          contentType={ContentType.PDF}
          userEmail="user@example.com"
          enableWatermark={true}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('flipbook-container')).toBeInTheDocument();
      });

      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('true');
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('user@example.com');
    });

    it('should apply custom watermark opacity and size', () => {
      render(
        <PreviewViewerClient
          documentId="doc-456"
          documentTitle="Test Image"
          contentType={ContentType.IMAGE}
          userEmail="user@example.com"
          enableWatermark={true}
          watermarkText="Custom"
          watermarkOpacity={0.8}
          watermarkSize={32}
          imageUrl="https://example.com/test.jpg"
          metadata={{ width: 1920, height: 1080, fileSize: 2048000, mimeType: 'image/jpeg' }}
        />
      );

      expect(screen.getByTestId('watermark-opacity')).toHaveTextContent('0.8');
    });
  });

  describe('URL parameter parsing and application', () => {
    it('should correctly parse and apply watermark=false parameter', async () => {
      // Simulating URL: /view?watermark=false
      render(
        <PreviewViewerClient
          documentId="doc-123"
          documentTitle="Test Document"
          contentType={ContentType.PDF}
          userEmail="user@example.com"
          enableWatermark={false}
          watermarkText="Test"
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('flipbook-container')).toBeInTheDocument();
      });

      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('false');
    });

    it('should correctly parse and apply watermark=true parameter', async () => {
      // Simulating URL: /view?watermark=true&watermarkText=CONFIDENTIAL
      render(
        <PreviewViewerClient
          documentId="doc-123"
          documentTitle="Test Document"
          contentType={ContentType.PDF}
          userEmail="user@example.com"
          enableWatermark={true}
          watermarkText="CONFIDENTIAL"
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('flipbook-container')).toBeInTheDocument();
      });

      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('true');
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('CONFIDENTIAL');
    });

    it('should apply all watermark parameters from URL', () => {
      // Simulating URL: /view?watermark=true&watermarkText=Custom&watermarkOpacity=0.5&watermarkSize=24
      render(
        <PreviewViewerClient
          documentId="doc-456"
          documentTitle="Test Image"
          contentType={ContentType.IMAGE}
          userEmail="user@example.com"
          enableWatermark={true}
          watermarkText="Custom"
          watermarkOpacity={0.5}
          watermarkSize={24}
          imageUrl="https://example.com/test.jpg"
          metadata={{ width: 1920, height: 1080, fileSize: 2048000, mimeType: 'image/jpeg' }}
        />
      );

      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('true');
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('Custom');
      expect(screen.getByTestId('watermark-opacity')).toHaveTextContent('0.5');
    });

    it('should handle missing watermark parameter (default to false)', async () => {
      // Simulating URL: /view (no watermark parameter)
      render(
        <PreviewViewerClient
          documentId="doc-123"
          documentTitle="Test Document"
          contentType={ContentType.PDF}
          userEmail="user@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('flipbook-container')).toBeInTheDocument();
      });

      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('false');
    });

    it('should apply URL parameters consistently across content types', () => {
      const urlParams = {
        enableWatermark: true,
        watermarkText: 'SHARED',
        watermarkOpacity: 0.4,
        watermarkSize: 20,
      };

      // Test with Image
      const { rerender } = render(
        <PreviewViewerClient
          documentId="doc-456"
          documentTitle="Test Image"
          contentType={ContentType.IMAGE}
          userEmail="user@example.com"
          {...urlParams}
          imageUrl="https://example.com/test.jpg"
          metadata={{ width: 1920, height: 1080, fileSize: 2048000, mimeType: 'image/jpeg' }}
        />
      );

      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('true');
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('SHARED');

      // Test with Video
      rerender(
        <PreviewViewerClient
          documentId="doc-789"
          documentTitle="Test Video"
          contentType={ContentType.VIDEO}
          userEmail="user@example.com"
          {...urlParams}
          videoUrl="https://example.com/test.mp4"
          metadata={{ duration: 120, width: 1920, height: 1080, fileSize: 10485760, mimeType: 'video/mp4' }}
        />
      );

      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('true');
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('SHARED');
    });
  });

  describe('Full-size display across viewport sizes', () => {
    it('should render full-screen container for PDF', async () => {
      render(
        <PreviewViewerClient
          documentId="doc-123"
          documentTitle="Test Document"
          contentType={ContentType.PDF}
          userEmail="user@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('flipbook-container')).toBeInTheDocument();
      });

      const container = screen.getByTestId('flipbook-container');
      
      // Verify full-screen classes
      expect(container).toHaveClass('min-h-screen');
      expect(container).toHaveClass('w-full');
      
      // Verify inline styles for full viewport
      expect(container).toHaveStyle({ minHeight: '100vh', width: '100%' });
    });

    it('should render full-screen container for images', () => {
      render(
        <PreviewViewerClient
          documentId="doc-456"
          documentTitle="Test Image"
          contentType={ContentType.IMAGE}
          userEmail="user@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          imageUrl="https://example.com/test.jpg"
          metadata={{ width: 1920, height: 1080, fileSize: 2048000, mimeType: 'image/jpeg' }}
        />
      );

      const container = screen.getByTestId('image-viewer');
      
      expect(container).toHaveClass('min-h-screen');
      expect(container).toHaveClass('w-full');
      expect(container).toHaveStyle({ minHeight: '100vh', width: '100%' });
    });

    it('should render full-screen container for videos', () => {
      render(
        <PreviewViewerClient
          documentId="doc-789"
          documentTitle="Test Video"
          contentType={ContentType.VIDEO}
          userEmail="user@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          videoUrl="https://example.com/test.mp4"
          metadata={{ duration: 120, width: 1920, height: 1080, fileSize: 10485760, mimeType: 'video/mp4' }}
        />
      );

      const container = screen.getByTestId('video-player');
      
      expect(container).toHaveClass('min-h-screen');
      expect(container).toHaveClass('w-full');
      expect(container).toHaveStyle({ minHeight: '100vh', width: '100%' });
    });

    it('should render full-screen container for links', () => {
      render(
        <PreviewViewerClient
          documentId="doc-101"
          documentTitle="Test Link"
          contentType={ContentType.LINK}
          userEmail="user@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          linkUrl="https://example.com"
          metadata={{ url: 'https://example.com', title: 'Example', domain: 'example.com' }}
        />
      );

      const container = screen.getByTestId('link-preview');
      
      expect(container).toHaveClass('min-h-screen');
      expect(container).toHaveClass('w-full');
      expect(container).toHaveStyle({ minHeight: '100vh', width: '100%' });
    });

    it('should maintain full-size display with watermark enabled', async () => {
      render(
        <PreviewViewerClient
          documentId="doc-123"
          documentTitle="Test Document"
          contentType={ContentType.PDF}
          userEmail="user@example.com"
          enableWatermark={true}
          watermarkText="CONFIDENTIAL"
          watermarkOpacity={0.5}
          watermarkSize={24}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('flipbook-container')).toBeInTheDocument();
      });

      const container = screen.getByTestId('flipbook-container');
      
      // Verify full-screen is maintained even with watermark
      expect(container).toHaveClass('min-h-screen');
      expect(container).toHaveClass('w-full');
      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('true');
    });

    it('should display content that fills viewport on different screen sizes', () => {
      // Simulate different viewport sizes
      const viewportSizes = [
        { width: 1920, height: 1080, name: 'Desktop' },
        { width: 1366, height: 768, name: 'Laptop' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' },
      ];

      viewportSizes.forEach(({ width, height, name }) => {
        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: height,
        });

        const { unmount } = render(
          <PreviewViewerClient
            documentId="doc-456"
            documentTitle={`Test on ${name}`}
            contentType={ContentType.IMAGE}
            userEmail="user@example.com"
            enableWatermark={false}
            watermarkText=""
            watermarkOpacity={0.3}
            watermarkSize={16}
            imageUrl="https://example.com/test.jpg"
            metadata={{ width: 1920, height: 1080, fileSize: 2048000, mimeType: 'image/jpeg' }}
          />
        );

        const container = screen.getByTestId('image-viewer');
        
        // Verify full viewport usage regardless of screen size
        expect(container).toHaveClass('min-h-screen');
        expect(container).toHaveClass('w-full');

        unmount();
      });
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle PDF page fetch failure gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Failed to load pages' }),
      });

      render(
        <PreviewViewerClient
          documentId="doc-123"
          documentTitle="Test Document"
          contentType={ContentType.PDF}
          userEmail="user@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Content')).toBeInTheDocument();
      });

      expect(screen.getByText('Failed to load pages')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should handle missing image URL', () => {
      render(
        <PreviewViewerClient
          documentId="doc-456"
          documentTitle="Test Image"
          contentType={ContentType.IMAGE}
          userEmail="user@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          metadata={{ width: 1920, height: 1080, fileSize: 2048000, mimeType: 'image/jpeg' }}
        />
      );

      expect(screen.getByText('Image Not Available')).toBeInTheDocument();
    });

    it('should handle missing video URL', () => {
      render(
        <PreviewViewerClient
          documentId="doc-789"
          documentTitle="Test Video"
          contentType={ContentType.VIDEO}
          userEmail="user@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          metadata={{ duration: 120, width: 1920, height: 1080, fileSize: 10485760, mimeType: 'video/mp4' }}
        />
      );

      expect(screen.getByText('Video Not Available')).toBeInTheDocument();
    });

    it('should handle missing link URL', () => {
      render(
        <PreviewViewerClient
          documentId="doc-101"
          documentTitle="Test Link"
          contentType={ContentType.LINK}
          userEmail="user@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          metadata={{ url: '', title: 'Example', domain: 'example.com' }}
        />
      );

      expect(screen.getByText('Link Not Available')).toBeInTheDocument();
    });

    it('should handle empty pages array for PDF', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pages: [] }),
      });

      // Mock conversion API
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          pageUrls: [
            'https://storage.example.com/converted-page1.jpg',
            'https://storage.example.com/converted-page2.jpg',
          ]
        }),
      });

      render(
        <PreviewViewerClient
          documentId="doc-123"
          documentTitle="Test Document"
          contentType={ContentType.PDF}
          userEmail="user@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      // Should trigger conversion
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/documents/convert', expect.any(Object));
      });

      // Should display converted pages
      await waitFor(() => {
        expect(screen.getByTestId('flipbook-container')).toBeInTheDocument();
      });
    });
  });

  describe('Complete integration scenarios', () => {
    it('should handle complete preview workflow: load -> display -> watermark toggle', async () => {
      const { rerender } = render(
        <PreviewViewerClient
          documentId="doc-123"
          documentTitle="Test Document"
          contentType={ContentType.PDF}
          userEmail="user@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      // Step 1: Loading state
      expect(screen.getByText('Loading content...')).toBeInTheDocument();

      // Step 2: Content loaded without watermark
      await waitFor(() => {
        expect(screen.getByTestId('flipbook-container')).toBeInTheDocument();
      });
      expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('false');

      // Step 3: Enable watermark (simulating URL parameter change)
      rerender(
        <PreviewViewerClient
          documentId="doc-123"
          documentTitle="Test Document"
          contentType={ContentType.PDF}
          userEmail="user@example.com"
          enableWatermark={true}
          watermarkText="CONFIDENTIAL"
          watermarkOpacity={0.5}
          watermarkSize={24}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      // Verify watermark is now enabled
      await waitFor(() => {
        expect(screen.getByTestId('watermark-enabled')).toHaveTextContent('true');
      });
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('CONFIDENTIAL');
    });

    it('should maintain state across content type switches', () => {
      const baseProps = {
        documentId: 'doc-123',
        documentTitle: 'Test Content',
        userEmail: 'user@example.com',
        enableWatermark: true,
        watermarkText: 'SHARED',
        watermarkOpacity: 0.4,
        watermarkSize: 20,
      };

      const { rerender } = render(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.IMAGE}
          imageUrl="https://example.com/test.jpg"
          metadata={{ width: 1920, height: 1080, fileSize: 2048000, mimeType: 'image/jpeg' }}
        />
      );

      expect(screen.getByTestId('image-viewer')).toBeInTheDocument();
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('SHARED');

      rerender(
        <PreviewViewerClient
          {...baseProps}
          contentType={ContentType.VIDEO}
          videoUrl="https://example.com/test.mp4"
          metadata={{ duration: 120, width: 1920, height: 1080, fileSize: 10485760, mimeType: 'video/mp4' }}
        />
      );

      expect(screen.getByTestId('video-player')).toBeInTheDocument();
      expect(screen.getByTestId('watermark-text')).toHaveTextContent('SHARED');
    });
  });
});
