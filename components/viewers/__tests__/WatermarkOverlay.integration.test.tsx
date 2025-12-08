import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SimpleDocumentViewer from '../SimpleDocumentViewer';
import type { PageData, WatermarkSettings } from '../SimpleDocumentViewer';

// Mock the viewer preferences
vi.mock('@/lib/viewer-preferences', () => ({
  loadPreferences: vi.fn(() => ({
    viewMode: 'continuous',
    defaultZoom: 1.0,
    rememberPosition: true,
  })),
  updatePreferences: vi.fn(),
  isLocalStorageAvailable: vi.fn(() => true),
}));

// Mock keyboard navigation hook
vi.mock('@/hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: vi.fn(),
}));

describe('WatermarkOverlay Integration', () => {
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

  const mockWatermark: WatermarkSettings = {
    text: 'CONFIDENTIAL',
    opacity: 0.3,
    fontSize: 32,
  };

  it('should render watermark when enabled', () => {
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
        watermark={mockWatermark}
      />
    );

    // Watermark should be present
    const watermarkOverlay = screen.getByTestId('watermark-overlay');
    expect(watermarkOverlay).toBeInTheDocument();

    // Should contain the watermark text
    expect(watermarkOverlay).toHaveTextContent('CONFIDENTIAL');

    // Should have correct opacity
    expect(watermarkOverlay).toHaveStyle({ opacity: '0.3' });
  });

  it('should not render watermark when not provided', () => {
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
      />
    );

    // Watermark should not be present
    expect(screen.queryByTestId('watermark-overlay')).not.toBeInTheDocument();
  });

  it('should not interfere with navigation controls', () => {
    const mockOnClose = vi.fn();
    
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
        watermark={mockWatermark}
        onClose={mockOnClose}
      />
    );

    // Watermark should be present
    const watermarkOverlay = screen.getByTestId('watermark-overlay');
    expect(watermarkOverlay).toBeInTheDocument();

    // Watermark should have pointer-events: none
    expect(watermarkOverlay).toHaveStyle({ pointerEvents: 'none' });

    // Navigation controls should still be clickable
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
    
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should position watermark correctly with z-index', () => {
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
        watermark={mockWatermark}
      />
    );

    const watermarkOverlay = screen.getByTestId('watermark-overlay');
    
    // Should be positioned absolutely
    expect(watermarkOverlay).toHaveClass('absolute', 'inset-0');
    
    // Should be centered
    expect(watermarkOverlay).toHaveClass('flex', 'items-center', 'justify-center');
    
    // Should have appropriate z-index (above content but below controls)
    expect(watermarkOverlay).toHaveStyle({ zIndex: '10' });
  });

  it('should handle different watermark settings', () => {
    const customWatermark: WatermarkSettings = {
      text: 'DRAFT',
      opacity: 0.1,
      fontSize: 48,
    };

    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
        watermark={customWatermark}
      />
    );

    const watermarkOverlay = screen.getByTestId('watermark-overlay');
    expect(watermarkOverlay).toHaveTextContent('DRAFT');
    expect(watermarkOverlay).toHaveStyle({ opacity: '0.1' });
    
    // Check font size on the text element
    const textElement = watermarkOverlay.querySelector('div');
    expect(textElement).toHaveStyle({ fontSize: '48px' });
  });

  it('should work in both continuous and paged view modes', () => {
    const { rerender } = render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
        watermark={mockWatermark}
      />
    );

    // Should show watermark in continuous mode
    expect(screen.getByTestId('watermark-overlay')).toBeInTheDocument();

    // Switch to paged mode by clicking the view mode toggle
    const viewModeToggle = screen.getByRole('button', { name: /switch to paged view/i });
    fireEvent.click(viewModeToggle);

    // Should still show watermark in paged mode
    expect(screen.getByTestId('watermark-overlay')).toBeInTheDocument();
  });

  it('should maintain watermark visibility during zoom operations', () => {
    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
        watermark={mockWatermark}
      />
    );

    const watermarkOverlay = screen.getByTestId('watermark-overlay');
    expect(watermarkOverlay).toBeInTheDocument();

    // Zoom in
    const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
    fireEvent.click(zoomInButton);

    // Watermark should still be visible
    expect(screen.getByTestId('watermark-overlay')).toBeInTheDocument();

    // Zoom out
    const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
    fireEvent.click(zoomOutButton);

    // Watermark should still be visible
    expect(screen.getByTestId('watermark-overlay')).toBeInTheDocument();
  });

  it('should not render watermark with empty text', () => {
    const emptyWatermark: WatermarkSettings = {
      text: '',
      opacity: 0.3,
      fontSize: 32,
    };

    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
        watermark={emptyWatermark}
      />
    );

    // Watermark should not be present with empty text
    expect(screen.queryByTestId('watermark-overlay')).not.toBeInTheDocument();
  });

  it('should handle whitespace-only text', () => {
    const whitespaceWatermark: WatermarkSettings = {
      text: '   ',
      opacity: 0.3,
      fontSize: 32,
    };

    render(
      <SimpleDocumentViewer
        documentId="test-doc"
        documentTitle="Test Document"
        pages={mockPages}
        watermark={whitespaceWatermark}
      />
    );

    // Watermark should not be present with whitespace-only text
    expect(screen.queryByTestId('watermark-overlay')).not.toBeInTheDocument();
  });
});