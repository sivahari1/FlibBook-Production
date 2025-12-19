/**
 * PreviewViewerClient Reliability Integration Tests
 * 
 * Tests the integration of reliability features in PreviewViewerClient
 * 
 * Requirements: 1.1, 1.2, 8.1, 2.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PreviewViewerClient from '../PreviewViewerClient';
import { ContentType } from '@/lib/types/content';

// Mock SimpleDocumentViewer
vi.mock('@/components/viewers/SimpleDocumentViewer', () => ({
  default: ({ 
    documentId, 
    documentTitle, 
    pdfUrl, 
    watermark, 
    enableScreenshotPrevention,
    enableReliabilityFeatures,
    onClose,
    onRenderingError 
  }: any) => (
    <div data-testid="simple-document-viewer">
      <div data-testid="document-id">{documentId}</div>
      <div data-testid="document-title">{documentTitle}</div>
      <div data-testid="pdf-url">{pdfUrl}</div>
      <div data-testid="watermark-text">{watermark?.text}</div>
      <div data-testid="watermark-opacity">{watermark?.opacity}</div>
      <div data-testid="watermark-font-size">{watermark?.fontSize}</div>
      <div data-testid="enable-screenshot-prevention">{enableScreenshotPrevention ? 'true' : 'false'}</div>
      <div data-testid="enable-reliability-features">{enableReliabilityFeatures ? 'true' : 'false'}</div>
      <button onClick={onClose} data-testid="close-button">Close</button>
      <button 
        onClick={() => onRenderingError?.(new Error('Test rendering error'), { diagnostics: 'test' })} 
        data-testid="trigger-rendering-error"
      >
        Trigger Rendering Error
      </button>
    </div>
  ),
}));

// Mock ImageViewer
vi.mock('@/components/viewers/ImageViewer', () => ({
  default: ({ imageUrl, metadata, watermark, title }: any) => (
    <div data-testid="image-viewer">
      <div data-testid="image-url">{imageUrl}</div>
      <div data-testid="image-title">{title}</div>
      <div data-testid="image-watermark-text">{watermark?.text}</div>
    </div>
  ),
}));

// Mock VideoPlayer
vi.mock('@/components/viewers/VideoPlayer', () => ({
  default: ({ videoUrl, metadata, watermark, title }: any) => (
    <div data-testid="video-player">
      <div data-testid="video-url">{videoUrl}</div>
      <div data-testid="video-title">{title}</div>
      <div data-testid="video-watermark-text">{watermark?.text}</div>
    </div>
  ),
}));

// Mock LinkPreview
vi.mock('@/components/viewers/LinkPreview', () => ({
  default: ({ linkUrl, metadata, title }: any) => (
    <div data-testid="link-preview">
      <div data-testid="link-url">{linkUrl}</div>
      <div data-testid="link-title">{title}</div>
    </div>
  ),
}));

describe('PreviewViewerClient Reliability Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test 1: PDF Content with Reliability Features
   * 
   * Tests that PDF content uses reliability features correctly
   * 
   * Requirements: 1.1, 1.2, 8.1, 2.1
   */
  describe('PDF Content with Reliability Features', () => {
    it('should enable reliability features by default for PDF content', () => {
      render(
        <PreviewViewerClient
          documentId="test-pdf-1"
          documentTitle="Test PDF Document"
          contentType={ContentType.PDF}
          userEmail="test@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
      expect(screen.getByTestId('enable-reliability-features')).toHaveTextContent('true');
      expect(screen.getByTestId('pdf-url')).toHaveTextContent('https://example.com/test.pdf');
    });

    it('should allow disabling reliability features for PDF content', () => {
      render(
        <PreviewViewerClient
          documentId="test-pdf-2"
          documentTitle="Test PDF Document"
          contentType={ContentType.PDF}
          userEmail="test@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
          enableReliabilityFeatures={false}
        />
      );

      expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
      expect(screen.getByTestId('enable-reliability-features')).toHaveTextContent('false');
    });

    it('should pass watermark configuration correctly to PDF viewer', () => {
      render(
        <PreviewViewerClient
          documentId="test-pdf-3"
          documentTitle="Test PDF Document"
          contentType={ContentType.PDF}
          userEmail="test@example.com"
          enableWatermark={true}
          watermarkText="CONFIDENTIAL"
          watermarkOpacity={0.5}
          watermarkSize={24}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      expect(screen.getByTestId('watermark-text')).toHaveTextContent('CONFIDENTIAL');
      expect(screen.getByTestId('watermark-opacity')).toHaveTextContent('0.5');
      expect(screen.getByTestId('watermark-font-size')).toHaveTextContent('24');
    });

    it('should use user email as fallback watermark text', () => {
      render(
        <PreviewViewerClient
          documentId="test-pdf-4"
          documentTitle="Test PDF Document"
          contentType={ContentType.PDF}
          userEmail="user@example.com"
          enableWatermark={true}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      expect(screen.getByTestId('watermark-text')).toHaveTextContent('user@example.com');
    });

    it('should enable screenshot prevention for PDF content', () => {
      render(
        <PreviewViewerClient
          documentId="test-pdf-5"
          documentTitle="Test PDF Document"
          contentType={ContentType.PDF}
          userEmail="test@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      expect(screen.getByTestId('enable-screenshot-prevention')).toHaveTextContent('true');
    });

    it('should handle missing PDF URL gracefully', () => {
      render(
        <PreviewViewerClient
          documentId="test-pdf-6"
          documentTitle="Test PDF Document"
          contentType={ContentType.PDF}
          userEmail="test@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          // No pdfUrl provided
        />
      );

      // Should show error message for missing PDF URL
      expect(screen.getByText(/PDF Not Available/i)).toBeInTheDocument();
      expect(screen.getByText(/PDF URL could not be generated/i)).toBeInTheDocument();
    });

    it('should validate PDF URL before rendering', () => {
      render(
        <PreviewViewerClient
          documentId="test-pdf-7"
          documentTitle="Test PDF Document"
          contentType={ContentType.PDF}
          userEmail="test@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl=""
        />
      );

      // Should show error for empty PDF URL
      expect(screen.getByText(/PDF Not Available/i)).toBeInTheDocument();
    });
  });

  /**
   * Test 2: Enhanced Error Handling
   * 
   * Tests that enhanced error handling works correctly with reliability features
   * 
   * Requirements: 1.4, 1.5, 2.1, 7.1, 7.2
   */
  describe('Enhanced Error Handling', () => {
    it('should handle rendering errors with diagnostics', async () => {
      const consoleSpy = vi.spyOn(console, 'error');

      render(
        <PreviewViewerClient
          documentId="test-pdf-8"
          documentTitle="Test PDF Document"
          contentType={ContentType.PDF}
          userEmail="test@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      // Trigger rendering error
      const errorButton = screen.getByTestId('trigger-rendering-error');
      errorButton.click();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[PreviewViewerClient] PDF rendering error:',
          expect.objectContaining({
            message: 'Test rendering error',
          })
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          '[PreviewViewerClient] Diagnostics:',
          { diagnostics: 'test' }
        );
      });
    });

    it('should log watermark configuration for debugging', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      render(
        <PreviewViewerClient
          documentId="test-pdf-9"
          documentTitle="Test PDF Document"
          contentType={ContentType.PDF}
          userEmail="test@example.com"
          enableWatermark={true}
          watermarkText="DEBUG"
          watermarkOpacity={0.4}
          watermarkSize={20}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PreviewViewerClient] Watermark Settings:',
        expect.objectContaining({
          enableWatermark: true,
          watermarkText: '***',
          watermarkOpacity: 0.4,
          watermarkSize: 20,
          hasWatermarkImage: false,
          contentType: ContentType.PDF,
        })
      );
    });

    it('should provide helpful error messages for different error scenarios', () => {
      // Test different error scenarios
      const errorScenarios = [
        {
          props: { pdfUrl: undefined },
          expectedText: /PDF Not Available/i,
        },
        {
          props: { pdfUrl: '' },
          expectedText: /PDF Not Available/i,
        },
        {
          props: { imageUrl: undefined, contentType: ContentType.IMAGE },
          expectedText: /Image Not Available/i,
        },
        {
          props: { videoUrl: undefined, contentType: ContentType.VIDEO },
          expectedText: /Video Not Available/i,
        },
        {
          props: { linkUrl: undefined, contentType: ContentType.LINK },
          expectedText: /Link Not Available/i,
        },
      ];

      errorScenarios.forEach(({ props, expectedText }, index) => {
        const { unmount } = render(
          <PreviewViewerClient
            documentId={`test-error-${index}`}
            documentTitle="Test Document"
            contentType={props.contentType || ContentType.PDF}
            userEmail="test@example.com"
            enableWatermark={false}
            watermarkText=""
            watermarkOpacity={0.3}
            watermarkSize={16}
            {...props}
          />
        );

        expect(screen.getByText(expectedText)).toBeInTheDocument();
        unmount();
      });
    });
  });

  /**
   * Test 3: Multi-Content Type Support
   * 
   * Tests that reliability features work across different content types
   * 
   * Requirements: 3.2, 3.3, 4.1, 4.2, 4.3, 4.4
   */
  describe('Multi-Content Type Support', () => {
    it('should render image content with watermark support', () => {
      render(
        <PreviewViewerClient
          documentId="test-image-1"
          documentTitle="Test Image"
          contentType={ContentType.IMAGE}
          userEmail="test@example.com"
          enableWatermark={true}
          watermarkText="SAMPLE"
          watermarkOpacity={0.3}
          watermarkSize={16}
          imageUrl="https://example.com/test.jpg"
          metadata={{ width: 800, height: 600, fileSize: 1024, mimeType: 'image/jpeg' }}
        />
      );

      expect(screen.getByTestId('image-viewer')).toBeInTheDocument();
      expect(screen.getByTestId('image-url')).toHaveTextContent('https://example.com/test.jpg');
      expect(screen.getByTestId('image-watermark-text')).toHaveTextContent('SAMPLE');
    });

    it('should render video content with watermark support', () => {
      render(
        <PreviewViewerClient
          documentId="test-video-1"
          documentTitle="Test Video"
          contentType={ContentType.VIDEO}
          userEmail="test@example.com"
          enableWatermark={true}
          watermarkText="PROTECTED"
          watermarkOpacity={0.4}
          watermarkSize={18}
          videoUrl="https://example.com/test.mp4"
          metadata={{ 
            duration: 120, 
            width: 1920, 
            height: 1080, 
            fileSize: 10485760, 
            mimeType: 'video/mp4' 
          }}
        />
      );

      expect(screen.getByTestId('video-player')).toBeInTheDocument();
      expect(screen.getByTestId('video-url')).toHaveTextContent('https://example.com/test.mp4');
      expect(screen.getByTestId('video-watermark-text')).toHaveTextContent('PROTECTED');
    });

    it('should render link content without watermark', () => {
      render(
        <PreviewViewerClient
          documentId="test-link-1"
          documentTitle="Test Link"
          contentType={ContentType.LINK}
          userEmail="test@example.com"
          enableWatermark={true}
          watermarkText="LINK"
          watermarkOpacity={0.3}
          watermarkSize={16}
          linkUrl="https://example.com"
          metadata={{ 
            url: 'https://example.com',
            title: 'Example Site',
            description: 'An example website',
            domain: 'example.com'
          }}
        />
      );

      expect(screen.getByTestId('link-preview')).toBeInTheDocument();
      expect(screen.getByTestId('link-url')).toHaveTextContent('https://example.com');
    });

    it('should handle unsupported content types gracefully', () => {
      render(
        <PreviewViewerClient
          documentId="test-unsupported-1"
          documentTitle="Unsupported Content"
          contentType={'UNSUPPORTED' as ContentType}
          userEmail="test@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
        />
      );

      expect(screen.getByText(/Unsupported Content Type/i)).toBeInTheDocument();
    });
  });

  /**
   * Test 4: Watermark Configuration
   * 
   * Tests that watermark configuration works correctly across content types
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  describe('Watermark Configuration', () => {
    it('should apply watermark settings consistently across content types', () => {
      const watermarkSettings = {
        enableWatermark: true,
        watermarkText: 'CONSISTENT',
        watermarkOpacity: 0.6,
        watermarkSize: 22,
      };

      const contentTypes = [
        { type: ContentType.PDF, url: 'pdfUrl', value: 'https://example.com/test.pdf' },
        { type: ContentType.IMAGE, url: 'imageUrl', value: 'https://example.com/test.jpg' },
        { type: ContentType.VIDEO, url: 'videoUrl', value: 'https://example.com/test.mp4' },
      ];

      contentTypes.forEach(({ type, url, value }, index) => {
        const { unmount } = render(
          <PreviewViewerClient
            documentId={`test-watermark-${index}`}
            documentTitle="Test Document"
            contentType={type}
            userEmail="test@example.com"
            {...watermarkSettings}
            {...{ [url]: value }}
          />
        );

        // Each content type should receive the same watermark configuration
        const watermarkTextElement = screen.getByTestId(
          type === ContentType.PDF ? 'watermark-text' :
          type === ContentType.IMAGE ? 'image-watermark-text' :
          'video-watermark-text'
        );
        expect(watermarkTextElement).toHaveTextContent('CONSISTENT');

        unmount();
      });
    });

    it('should disable watermark when enableWatermark is false', () => {
      render(
        <PreviewViewerClient
          documentId="test-no-watermark"
          documentTitle="Test PDF Document"
          contentType={ContentType.PDF}
          userEmail="test@example.com"
          enableWatermark={false}
          watermarkText="SHOULD_NOT_APPEAR"
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      // Watermark text should be empty when disabled
      expect(screen.getByTestId('watermark-text')).toBeEmptyDOMElement();
    });

    it('should handle watermark image configuration', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      render(
        <PreviewViewerClient
          documentId="test-watermark-image"
          documentTitle="Test PDF Document"
          contentType={ContentType.PDF}
          userEmail="test@example.com"
          enableWatermark={true}
          watermarkText="TEXT"
          watermarkOpacity={0.3}
          watermarkSize={16}
          watermarkImage="https://example.com/watermark.png"
          pdfUrl="https://example.com/test.pdf"
        />
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PreviewViewerClient] Watermark Settings:',
        expect.objectContaining({
          hasWatermarkImage: true,
        })
      );
    });
  });

  /**
   * Test 5: Performance and Reliability
   * 
   * Tests that the component performs well and handles edge cases
   * 
   * Requirements: 6.3, 6.4, 8.1
   */
  describe('Performance and Reliability', () => {
    it('should handle rapid prop changes without issues', () => {
      const { rerender } = render(
        <PreviewViewerClient
          documentId="test-perf-1"
          documentTitle="Test Document"
          contentType={ContentType.PDF}
          userEmail="test@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test1.pdf"
        />
      );

      // Rapidly change props
      for (let i = 2; i <= 10; i++) {
        rerender(
          <PreviewViewerClient
            documentId={`test-perf-${i}`}
            documentTitle={`Test Document ${i}`}
            contentType={ContentType.PDF}
            userEmail="test@example.com"
            enableWatermark={i % 2 === 0}
            watermarkText={`TEXT${i}`}
            watermarkOpacity={0.3 + (i * 0.1)}
            watermarkSize={16 + i}
            pdfUrl={`https://example.com/test${i}.pdf`}
          />
        );
      }

      // Should handle changes without errors
      expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
    });

    it('should not cause memory leaks when unmounting', () => {
      const { unmount } = render(
        <PreviewViewerClient
          documentId="test-memory"
          documentTitle="Test Document"
          contentType={ContentType.PDF}
          userEmail="test@example.com"
          enableWatermark={true}
          watermarkText="MEMORY_TEST"
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
          enableReliabilityFeatures={true}
        />
      );

      // Should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });

    it('should handle loading state gracefully', () => {
      // Mock loading state
      const { rerender } = render(
        <PreviewViewerClient
          documentId="test-loading"
          documentTitle="Test Document"
          contentType={ContentType.PDF}
          userEmail="test@example.com"
          enableWatermark={false}
          watermarkText=""
          watermarkOpacity={0.3}
          watermarkSize={16}
          pdfUrl="https://example.com/test.pdf"
        />
      );

      // Component should render without loading state by default
      expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
    });

    it('should maintain consistent behavior across browser environments', () => {
      // Test with different user agents (simulated)
      const originalUserAgent = navigator.userAgent;
      
      try {
        // Simulate different browsers
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        });

        render(
          <PreviewViewerClient
            documentId="test-browser-1"
            documentTitle="Test Document"
            contentType={ContentType.PDF}
            userEmail="test@example.com"
            enableWatermark={false}
            watermarkText=""
            watermarkOpacity={0.3}
            watermarkSize={16}
            pdfUrl="https://example.com/test.pdf"
          />
        );

        expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
      } finally {
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: originalUserAgent,
        });
      }
    });
  });
});