import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SimpleDocumentViewer, { PageData } from '../SimpleDocumentViewer';

/**
 * Unit tests for SimpleDocumentViewer layout
 * 
 * Tests:
 * - Full-screen positioning (fixed inset-0)
 * - Toolbar rendering
 * - Watermark overlay integration
 * 
 * Requirements: 1.1, 1.4
 */
describe('SimpleDocumentViewer Layout', () => {
  const mockPages: PageData[] = [
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
  ];

  it('should render with full-screen positioning (fixed inset-0)', () => {
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
      />
    );

    const viewer = screen.getByTestId('simple-document-viewer');
    expect(viewer).toBeInTheDocument();
    expect(viewer).toHaveClass('fixed', 'inset-0');
  });

  it('should render the toolbar', () => {
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
      />
    );

    const toolbar = screen.getByTestId('viewer-toolbar');
    expect(toolbar).toBeInTheDocument();
  });

  it('should display document title in toolbar', () => {
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="My Test Document"
        pages={mockPages}
      />
    );

    const title = screen.getByTestId('document-title');
    expect(title).toHaveTextContent('My Test Document');
  });

  it('should render document canvas', () => {
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
      />
    );

    const canvas = screen.getByTestId('document-canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveClass('flex-1', 'overflow-auto', 'relative');
  });

  it('should render watermark overlay when watermark is provided', () => {
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
        watermark={{
          text: 'CONFIDENTIAL',
          opacity: 0.3,
          fontSize: 24,
        }}
      />
    );

    const watermark = screen.getByTestId('watermark-overlay');
    expect(watermark).toBeInTheDocument();
    expect(watermark).toHaveTextContent('CONFIDENTIAL');
  });

  it('should not render watermark overlay when watermark is not provided', () => {
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
      />
    );

    const watermark = screen.queryByTestId('watermark-overlay');
    expect(watermark).not.toBeInTheDocument();
  });

  it('should render close button when onClose is provided', () => {
    const onClose = vi.fn();
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
        onClose={onClose}
      />
    );

    const closeButton = screen.getByTestId('close-button');
    expect(closeButton).toBeInTheDocument();
  });

  it('should not render close button when onClose is not provided', () => {
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
      />
    );

    const closeButton = screen.queryByTestId('close-button');
    expect(closeButton).not.toBeInTheDocument();
  });

  it('should have flex-col layout for toolbar and canvas', () => {
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
      />
    );

    const viewer = screen.getByTestId('simple-document-viewer');
    expect(viewer).toHaveClass('flex', 'flex-col');
  });

  it('should render with dark background (bg-gray-900)', () => {
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
      />
    );

    const viewer = screen.getByTestId('simple-document-viewer');
    expect(viewer).toHaveClass('bg-gray-900');
  });

  it('should render page navigation controls in toolbar', () => {
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
      />
    );

    const prevButton = screen.getByTestId('prev-page-button');
    const nextButton = screen.getByTestId('next-page-button');
    const pageInput = screen.getByTestId('page-input');
    const pageCount = screen.getByTestId('page-count');

    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
    expect(pageInput).toBeInTheDocument();
    expect(pageCount).toHaveTextContent('of 2');
  });

  it('should render zoom controls in toolbar', () => {
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
      />
    );

    const zoomInButton = screen.getByTestId('zoom-in-button');
    const zoomOutButton = screen.getByTestId('zoom-out-button');
    const zoomLevel = screen.getByTestId('zoom-level');

    expect(zoomInButton).toBeInTheDocument();
    expect(zoomOutButton).toBeInTheDocument();
    expect(zoomLevel).toHaveTextContent('100%');
  });

  it('should render view mode toggle in toolbar', () => {
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
      />
    );

    const viewModeToggle = screen.getByTestId('view-mode-toggle');
    expect(viewModeToggle).toBeInTheDocument();
  });
});
