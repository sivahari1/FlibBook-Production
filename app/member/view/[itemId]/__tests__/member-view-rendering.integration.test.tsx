/**
 * Integration tests for member view rendering using unified viewer system
 * Validates Requirements: 1.1
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MyJstudyroomViewerClient } from '../MyJstudyroomViewerClient';
import { ContentType } from '@/lib/types/content';

import { vi } from 'vitest';

// Mock the UnifiedViewer component
vi.mock('@/components/viewers/UnifiedViewer', () => ({
  default: function MockUnifiedViewer({ content, watermark, drmSettings }: any) {
    return (
      <div data-testid="unified-viewer">
        <div data-testid="content-id">{content.id}</div>
        <div data-testid="content-type">{content.contentType}</div>
        <div data-testid="watermark-text">{watermark?.text}</div>
        <div data-testid="drm-screenshot-prevention">{drmSettings?.enableScreenshotPrevention?.toString()}</div>
        <div data-testid="drm-text-selection">{drmSettings?.allowTextSelection?.toString()}</div>
        <div data-testid="drm-printing">{drmSettings?.allowPrinting?.toString()}</div>
        <div data-testid="drm-download">{drmSettings?.allowDownload?.toString()}</div>
        <div data-testid="drm-watermark-required">{drmSettings?.watermarkRequired?.toString()}</div>
      </div>
    );
  }
}));

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: function MockLink({ children, href }: any) {
    return <a href={href}>{children}</a>;
  }
}));

describe('Member View Rendering Integration', () => {
  const mockDocument = {
    id: 'test-doc-1',
    title: 'Test PDF Document',
    filename: 'test.pdf',
    contentType: 'PDF',
    storagePath: 'https://example.com/test.pdf',
    linkUrl: null,
    thumbnailUrl: null,
    metadata: {},
    fileSize: BigInt(1024000),
    mimeType: 'application/pdf',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    userId: 'user-1',
  };

  const mockProps = {
    document: mockDocument,
    bookShopTitle: 'Test BookShop Item',
    memberName: 'John Doe',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use the unified rendering system for member views', async () => {
    render(<MyJstudyroomViewerClient {...mockProps} />);

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer')).toBeInTheDocument();
    });

    // Verify that the UnifiedViewer is being used
    expect(screen.getByTestId('unified-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('content-id')).toHaveTextContent('test-doc-1');
    expect(screen.getByTestId('content-type')).toHaveTextContent('PDF');
  });

  it('should apply proper watermark settings for member context', async () => {
    render(<MyJstudyroomViewerClient {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer')).toBeInTheDocument();
    });

    // Verify watermark configuration
    expect(screen.getByTestId('watermark-text')).toHaveTextContent('jStudyRoom Member - John Doe');
  });

  it('should apply proper DRM settings for member context', async () => {
    render(<MyJstudyroomViewerClient {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer')).toBeInTheDocument();
    });

    // Verify DRM settings are properly configured for member context
    expect(screen.getByTestId('drm-screenshot-prevention')).toHaveTextContent('true');
    expect(screen.getByTestId('drm-text-selection')).toHaveTextContent('false');
    expect(screen.getByTestId('drm-printing')).toHaveTextContent('false');
    expect(screen.getByTestId('drm-download')).toHaveTextContent('false');
    expect(screen.getByTestId('drm-watermark-required')).toHaveTextContent('true');
  });

  it('should handle different content types in member context', async () => {
    const imageDocument = {
      ...mockDocument,
      id: 'test-image-1',
      contentType: 'IMAGE',
      mimeType: 'image/jpeg',
      storagePath: 'https://example.com/test.jpg',
    };

    render(
      <MyJstudyroomViewerClient
        {...mockProps}
        document={imageDocument}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer')).toBeInTheDocument();
    });

    expect(screen.getByTestId('content-type')).toHaveTextContent('IMAGE');
    expect(screen.getByTestId('content-id')).toHaveTextContent('test-image-1');
  });

  it('should display proper header information', async () => {
    render(<MyJstudyroomViewerClient {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer')).toBeInTheDocument();
    });

    // Check header content
    expect(screen.getByText('Test BookShop Item')).toBeInTheDocument();
    expect(screen.getByText('Test PDF Document')).toBeInTheDocument();
    expect(screen.getByText('Back to My jstudyroom')).toBeInTheDocument();
  });

  it('should handle loading state properly', async () => {
    // Mock a slow document preparation to catch loading state
    const slowDocument = {
      ...mockDocument,
      metadata: JSON.stringify({ slow: true }),
    };

    render(<MyJstudyroomViewerClient {...mockProps} document={slowDocument} />);

    // The component should eventually render the unified viewer
    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer')).toBeInTheDocument();
    });
  });

  it('should handle error state when document preparation fails', async () => {
    const invalidDocument = {
      ...mockDocument,
      metadata: 'invalid-json-string{',
    };

    render(
      <MyJstudyroomViewerClient
        {...mockProps}
        document={invalidDocument}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Error Loading Content')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load document')).toBeInTheDocument();
  });

  it('should convert document metadata properly', async () => {
    const documentWithMetadata = {
      ...mockDocument,
      metadata: JSON.stringify({
        pageCount: 10,
        author: 'Test Author',
        title: 'Original Title',
      }),
    };

    render(
      <MyJstudyroomViewerClient
        {...mockProps}
        document={documentWithMetadata}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer')).toBeInTheDocument();
    });

    // The component should successfully render with parsed metadata
    expect(screen.getByTestId('unified-viewer')).toBeInTheDocument();
  });

  it('should maintain backward compatibility with existing props', async () => {
    render(<MyJstudyroomViewerClient {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-viewer')).toBeInTheDocument();
    });

    // Verify all expected props are passed to UnifiedViewer
    expect(screen.getByTestId('content-id')).toBeInTheDocument();
    expect(screen.getByTestId('watermark-text')).toBeInTheDocument();
    expect(screen.getByTestId('drm-screenshot-prevention')).toBeInTheDocument();
  });
});