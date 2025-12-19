/**
 * Unit Tests for UnifiedViewer component
 * Validates: Requirements 1.1, 1.2, 2.1, 2.3
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UnifiedViewer from '../UnifiedViewer';
import { ContentType, EnhancedDocument } from '@/lib/types/content';

// Mock the SimpleDocumentViewer component
vi.mock('../SimpleDocumentViewer', () => ({
  default: vi.fn(({ documentId, pdfUrl, onLoadProgress }) => {
    // Simulate successful PDF loading
    if (onLoadProgress) {
      setTimeout(() => {
        onLoadProgress({
          documentId,
          loaded: 100,
          total: 100,
          percentage: 100,
          status: 'complete'
        });
      }, 10);
    }
    return <div data-testid="simple-document-viewer">PDF Viewer: {pdfUrl}</div>;
  })
}));

// Mock other viewers
vi.mock('../ImageViewer', () => ({
  default: () => <div data-testid="image-viewer">Image Viewer</div>
}));

vi.mock('../VideoPlayer', () => ({
  default: () => <div data-testid="video-player">Video Player</div>
}));

vi.mock('../LinkPreview', () => ({
  default: () => <div data-testid="link-preview">Link Preview</div>
}));

describe('UnifiedViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should route PDF content to SimpleDocumentViewer instead of FlipBookWrapper', async () => {
    const document: EnhancedDocument = {
      id: 'test-pdf-1',
      title: 'Test PDF Document',
      filename: 'test.pdf',
      contentType: ContentType.PDF,
      fileUrl: 'https://example.com/test.pdf',
      metadata: {},
      userId: 'test-user',
      storagePath: 'https://example.com/test.pdf',
      mimeType: 'application/pdf',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    render(<UnifiedViewer content={document} />);

    await waitFor(() => {
      expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
    });

    // Verify that SimpleDocumentViewer is used for PDF content
    const viewer = screen.getByTestId('simple-document-viewer');
    expect(viewer).toBeInTheDocument();
    expect(viewer.textContent).toContain('https://example.com/test.pdf');

    // Verify that FlipBookWrapper is NOT used
    expect(screen.queryByTestId('flipbook-wrapper')).not.toBeInTheDocument();
    expect(screen.queryByTestId('conversion-loading')).not.toBeInTheDocument();
  });

  it('should pass watermark settings to SimpleDocumentViewer for PDFs', async () => {
    const document: EnhancedDocument = {
      id: 'test-pdf-2',
      title: 'Test PDF with Watermark',
      filename: 'test.pdf',
      contentType: ContentType.PDF,
      fileUrl: 'https://example.com/test.pdf',
      metadata: {},
      userId: 'test-user',
      storagePath: 'https://example.com/test.pdf',
      mimeType: 'application/pdf',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    render(
      <UnifiedViewer
        content={document}
        watermark={{
          text: 'Test Watermark',
          opacity: 0.5,
          fontSize: 36,
          position: 'center'
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
    });

    // Verify that SimpleDocumentViewer is called with watermark settings
    const SimpleDocumentViewer = await import('../SimpleDocumentViewer');
    expect(SimpleDocumentViewer.default).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'test-pdf-2',
        pdfUrl: 'https://example.com/test.pdf',
        watermark: expect.objectContaining({
          text: 'Test Watermark',
          opacity: 0.5,
          fontSize: 36,
          position: 'center',
          color: 'rgba(0, 0, 0, 0.3)'
        })
      }),
      undefined
    );
  });

  it('should enable DRM and reliability features for PDFs', async () => {
    const document: EnhancedDocument = {
      id: 'test-pdf-3',
      title: 'Test PDF with DRM',
      filename: 'test.pdf',
      contentType: ContentType.PDF,
      fileUrl: 'https://example.com/test.pdf',
      metadata: {},
      userId: 'test-user',
      storagePath: 'https://example.com/test.pdf',
      mimeType: 'application/pdf',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    render(<UnifiedViewer content={document} />);

    await waitFor(() => {
      expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
    });

    // Verify that SimpleDocumentViewer is called with DRM and reliability features enabled
    const SimpleDocumentViewer = await import('../SimpleDocumentViewer');
    expect(SimpleDocumentViewer.default).toHaveBeenCalledWith(
      expect.objectContaining({
        enableReliabilityFeatures: true,
        enableDRMProtection: true,
        enableFlipbookNavigation: true,
        showPageNumbers: true,
        enableZoom: true
      }),
      undefined
    );
  });

  it('should route non-PDF content to appropriate viewers', async () => {
    // Test Image content
    const imageDocument: EnhancedDocument = {
      id: 'test-image-1',
      title: 'Test Image',
      filename: 'test.jpg',
      contentType: ContentType.IMAGE,
      fileUrl: 'https://example.com/test.jpg',
      metadata: {},
      userId: 'test-user',
      storagePath: 'https://example.com/test.jpg',
      mimeType: 'image/jpeg',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const { rerender } = render(<UnifiedViewer content={imageDocument} />);

    await waitFor(() => {
      expect(screen.getByTestId('image-viewer')).toBeInTheDocument();
    });

    // Test Video content
    const videoDocument: EnhancedDocument = {
      id: 'test-video-1',
      title: 'Test Video',
      filename: 'test.mp4',
      contentType: ContentType.VIDEO,
      fileUrl: 'https://example.com/test.mp4',
      metadata: {},
      userId: 'test-user',
      storagePath: 'https://example.com/test.mp4',
      mimeType: 'video/mp4',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    rerender(<UnifiedViewer content={videoDocument} />);

    await waitFor(() => {
      expect(screen.getByTestId('video-player')).toBeInTheDocument();
    });

    // Test Link content
    const linkDocument: EnhancedDocument = {
      id: 'test-link-1',
      title: 'Test Link',
      filename: 'test-link',
      contentType: ContentType.LINK,
      linkUrl: 'https://example.com',
      metadata: {},
      userId: 'test-user',
      storagePath: '',
      mimeType: 'text/html',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    rerender(<UnifiedViewer content={linkDocument} />);

    await waitFor(() => {
      expect(screen.getByTestId('link-preview')).toBeInTheDocument();
    });
  });

  it('should maintain backward compatibility with UniversalViewer interface', async () => {
    const document: EnhancedDocument = {
      id: 'test-pdf-5',
      title: 'Test Compatibility',
      filename: 'test.pdf',
      contentType: ContentType.PDF,
      fileUrl: 'https://example.com/test.pdf',
      metadata: {},
      userId: 'test-user',
      storagePath: 'https://example.com/test.pdf',
      mimeType: 'application/pdf',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Test that UnifiedViewer accepts the same props as UniversalViewer
    render(
      <UnifiedViewer
        content={document}
        watermark={{
          text: 'Test Watermark',
          opacity: 0.3,
          fontSize: 48,
          position: 'center'
        }}
        requireEmail={false}
        shareKey="test-share-key"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
    });

    // Verify that the component renders successfully with UniversalViewer props
    const viewer = screen.getByTestId('simple-document-viewer');
    expect(viewer).toBeInTheDocument();
  });
});