import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SimpleDocumentViewer from '../SimpleDocumentViewer';
import ContinuousScrollView from '../ContinuousScrollView';
import PagedView from '../PagedView';
import ViewerToolbar from '../ViewerToolbar';
import LoadingSpinner from '../LoadingSpinner';
import PageLoadError from '../PageLoadError';
import ViewerError from '../ViewerError';

// Mock the hooks
vi.mock('@/hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: vi.fn(),
}));

vi.mock('@/hooks/useTouchGestures', () => ({
  useTouchGestures: vi.fn(),
}));

vi.mock('@/lib/viewer-preferences', () => ({
  loadPreferences: vi.fn(() => ({ viewMode: 'continuous', defaultZoom: 1.0 })),
  updatePreferences: vi.fn(),
  isLocalStorageAvailable: vi.fn(() => true),
}));

describe('Error Handling Tests', () => {
  const mockPages = [
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SimpleDocumentViewer Error Handling', () => {
    it('should display error when no pages are provided', () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={[]}
        />
      );

      expect(screen.getByTestId('viewer-error')).toBeInTheDocument();
      expect(screen.getByText('No pages available to display')).toBeInTheDocument();
    });

    it('should display error when pages have invalid data', () => {
      const invalidPages = [
        {
          pageNumber: 1,
          pageUrl: '', // Invalid: empty URL
          dimensions: { width: 800, height: 1000 },
        },
      ];

      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={invalidPages as any}
        />
      );

      expect(screen.getByTestId('viewer-error')).toBeInTheDocument();
      expect(screen.getByText(/Invalid page data found/)).toBeInTheDocument();
    });

    it('should handle retry functionality', async () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={[]}
        />
      );

      const retryButton = screen.getByTestId('retry-button');
      fireEvent.click(retryButton);

      // Should show loading spinner during retry
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Wait for retry to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should validate page number inputs', () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
          onClose={vi.fn()}
        />
      );

      // Find the page input in the toolbar
      const pageInput = screen.getByTestId('page-input');

      // Test invalid page number (too high)
      fireEvent.change(pageInput, { target: { value: '999' } });
      fireEvent.keyDown(pageInput, { key: 'Enter' });

      // Should clamp to valid range
      expect(pageInput.value).toBe('2'); // Should be clamped to max page
    });
  });

  describe('Page Load Error Handling', () => {
    it('should handle page load failures in continuous view', async () => {
      const mockOnPageError = vi.fn();
      const mockOnPageRetry = vi.fn();
      const pageErrors = new Map([[1, 'Failed to load page image']]);

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={1.0}
          onPageVisible={vi.fn()}
          onPageError={mockOnPageError}
          onPageRetry={mockOnPageRetry}
          pageErrors={pageErrors}
        />
      );

      // Should display error for page 1
      expect(screen.getByTestId('page-error-1')).toBeInTheDocument();
      expect(screen.getByText('Failed to load page 1')).toBeInTheDocument();

      // Should have retry button
      const retryButton = screen.getByTestId('retry-page-1');
      expect(retryButton).toBeInTheDocument();

      // Test retry functionality
      fireEvent.click(retryButton);
      expect(mockOnPageRetry).toHaveBeenCalledWith(1);
    });

    it('should handle page load failures in paged view', async () => {
      const mockOnPageError = vi.fn();
      const mockOnPageRetry = vi.fn();
      const pageErrors = new Map([[1, 'Failed to load page image']]);

      render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
          onPageError={mockOnPageError}
          onPageRetry={mockOnPageRetry}
          pageErrors={pageErrors}
        />
      );

      // Should display error for current page
      expect(screen.getByTestId('page-error-1')).toBeInTheDocument();
      expect(screen.getByText('Failed to Load Page 1')).toBeInTheDocument();

      // Test retry functionality
      const retryButton = screen.getByTestId('retry-page-1');
      fireEvent.click(retryButton);
      expect(mockOnPageRetry).toHaveBeenCalledWith(1);
    });

    it('should simulate image load error', () => {
      const mockOnPageError = vi.fn();
      const mockOnPageRetry = vi.fn();
      const pageErrors = new Map();

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={1.0}
          onPageVisible={vi.fn()}
          onPageError={mockOnPageError}
          onPageRetry={mockOnPageRetry}
          pageErrors={pageErrors}
        />
      );

      // Find the first page image
      const pageImage = screen.getByAltText('Page 1');

      // Simulate image load error
      fireEvent.error(pageImage);

      // Should call onPageError
      expect(mockOnPageError).toHaveBeenCalledWith(1, 'Failed to load page image');
    });
  });

  describe('Invalid Page Number Handling', () => {
    it('should handle invalid page number in toolbar', () => {
      const mockOnPageChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={2}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={mockOnPageChange}
          onViewModeChange={vi.fn()}
          onZoomChange={vi.fn()}
        />
      );

      const pageInput = screen.getByTestId('page-input');

      // Test negative page number - first it calls with -1, then clamps
      fireEvent.change(pageInput, { target: { value: '-1' } });
      expect(mockOnPageChange).toHaveBeenCalledWith(-1); // This will be clamped in the parent

      // Test the keydown behavior
      fireEvent.keyDown(pageInput, { key: 'Enter' });
      expect(pageInput.value).toBe('1'); // Input should be corrected
    });

    it('should handle page number greater than total pages', () => {
      const mockOnPageChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={2}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={mockOnPageChange}
          onViewModeChange={vi.fn()}
          onZoomChange={vi.fn()}
        />
      );

      const pageInput = screen.getByTestId('page-input') as HTMLInputElement;

      // Set the input value to something greater than total pages
      pageInput.value = '10';
      
      // Test the keydown behavior
      fireEvent.keyDown(pageInput, { key: 'Enter' });
      
      // The input should be corrected to the max page (2)
      expect(pageInput.value).toBe('2');
      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('should handle non-numeric input', () => {
      const mockOnPageChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={2}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={mockOnPageChange}
          onViewModeChange={vi.fn()}
          onZoomChange={vi.fn()}
        />
      );

      const pageInput = screen.getByTestId('page-input');

      // Test non-numeric input - this won't trigger onChange since parseInt('abc') is NaN
      fireEvent.change(pageInput, { target: { value: 'abc' } });
      
      // The change handler should not call onPageChange for non-numeric input
      expect(mockOnPageChange).not.toHaveBeenCalled();

      // Test the keydown behavior with non-numeric input
      fireEvent.keyDown(pageInput, { key: 'Enter' });
      expect(pageInput.value).toBe('1'); // Input should be corrected to 1
    });
  });

  describe('Missing Data Handling', () => {
    it('should handle missing page dimensions', () => {
      const invalidPages = [
        {
          pageNumber: 1,
          pageUrl: 'https://example.com/page1.jpg',
          dimensions: null, // Invalid: missing dimensions
        },
      ];

      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={invalidPages as any}
        />
      );

      expect(screen.getByTestId('viewer-error')).toBeInTheDocument();
      expect(screen.getByText(/Invalid page data found/)).toBeInTheDocument();
    });

    it('should handle missing page URL', () => {
      const invalidPages = [
        {
          pageNumber: 1,
          pageUrl: null, // Invalid: missing URL
          dimensions: { width: 800, height: 1000 },
        },
      ];

      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={invalidPages as any}
        />
      );

      expect(screen.getByTestId('viewer-error')).toBeInTheDocument();
      expect(screen.getByText(/Invalid page data found/)).toBeInTheDocument();
    });

    it('should handle missing page number', () => {
      const invalidPages = [
        {
          pageNumber: null, // Invalid: missing page number
          pageUrl: 'https://example.com/page1.jpg',
          dimensions: { width: 800, height: 1000 },
        },
      ];

      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={invalidPages as any}
        />
      );

      expect(screen.getByTestId('viewer-error')).toBeInTheDocument();
      expect(screen.getByText(/Invalid page data found/)).toBeInTheDocument();
    });
  });

  describe('Component Error Displays', () => {
    it('should render LoadingSpinner correctly', () => {
      render(<LoadingSpinner message="Test loading..." size="md" />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
      expect(screen.getByText('Test loading...')).toBeInTheDocument();
    });

    it('should render PageLoadError correctly', () => {
      const mockOnRetry = vi.fn();

      render(
        <PageLoadError
          pageNumber={1}
          error="Test error message"
          onRetry={mockOnRetry}
          compact={false}
        />
      );

      expect(screen.getByTestId('page-error-1')).toBeInTheDocument();
      expect(screen.getByText('Failed to Load Page 1')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();

      const retryButton = screen.getByTestId('retry-page-1');
      fireEvent.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalled();
    });

    it('should render ViewerError correctly', () => {
      const mockOnRetry = vi.fn();
      const mockOnClose = vi.fn();

      render(
        <ViewerError
          error="Test viewer error"
          type="network"
          onRetry={mockOnRetry}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('viewer-error')).toBeInTheDocument();
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Test viewer error')).toBeInTheDocument();

      const retryButton = screen.getByTestId('retry-button');
      const closeButton = screen.getByTestId('close-button');

      fireEvent.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalled();

      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});