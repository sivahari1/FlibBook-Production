import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import SimpleDocumentViewer, { PageData } from '../SimpleDocumentViewer';
import ViewerToolbar from '../ViewerToolbar';

/**
 * Unit tests for view mode toggle functionality
 * 
 * Requirements: 6.1, 6.4
 * 
 * Tests:
 * - Mode switching
 * - Page preservation
 * - UI updates
 */
describe('View Mode Toggle', () => {
  let mockIntersectionObserver: any;
  let observerCallback: IntersectionObserverCallback;
  let observedElements: Map<Element, IntersectionObserverEntry>;

  beforeEach(() => {
    observedElements = new Map();
    
    // Mock IntersectionObserver
    mockIntersectionObserver = class {
      callback: IntersectionObserverCallback;
      observe = vi.fn((element: Element) => {
        observedElements.set(element, {
          target: element,
          isIntersecting: false,
          intersectionRatio: 0,
          boundingClientRect: element.getBoundingClientRect(),
          intersectionRect: element.getBoundingClientRect(),
          rootBounds: null,
          time: Date.now(),
        } as IntersectionObserverEntry);
      });
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = '';
      thresholds = [];

      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        observerCallback = callback;
      }
    };

    global.IntersectionObserver = mockIntersectionObserver as any;

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

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
    {
      pageNumber: 3,
      pageUrl: 'https://example.com/page3.jpg',
      dimensions: { width: 800, height: 1000 },
    },
  ];

  describe('ViewerToolbar view mode toggle', () => {
    it('should render view mode toggle button', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={3}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const toggleButton = screen.getByTestId('view-mode-toggle');
      expect(toggleButton).toBeInTheDocument();
    });

    it('should show correct icon for continuous mode', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={3}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const toggleButton = screen.getByTestId('view-mode-toggle');
      expect(toggleButton).toHaveAttribute('title', 'Switch to paged view');
    });

    it('should show correct icon for paged mode', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={3}
          viewMode="paged"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const toggleButton = screen.getByTestId('view-mode-toggle');
      expect(toggleButton).toHaveAttribute('title', 'Switch to continuous scroll');
    });

    it('should call onViewModeChange with opposite mode when clicked', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={3}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const toggleButton = screen.getByTestId('view-mode-toggle');
      await user.click(toggleButton);

      expect(onViewModeChange).toHaveBeenCalledTimes(1);
      expect(onViewModeChange).toHaveBeenCalledWith('paged');
    });

    it('should call onViewModeChange with continuous when in paged mode', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={3}
          viewMode="paged"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const toggleButton = screen.getByTestId('view-mode-toggle');
      await user.click(toggleButton);

      expect(onViewModeChange).toHaveBeenCalledTimes(1);
      expect(onViewModeChange).toHaveBeenCalledWith('continuous');
    });

    it('should have proper styling and accessibility attributes', () => {
      const onPageChange = vi.fn();
      const onViewModeChange = vi.fn();
      const onZoomChange = vi.fn();

      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={3}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={onViewModeChange}
          onZoomChange={onZoomChange}
        />
      );

      const toggleButton = screen.getByTestId('view-mode-toggle');
      expect(toggleButton).toHaveClass('p-2');
      expect(toggleButton).toHaveClass('text-gray-400');
      expect(toggleButton).toHaveClass('hover:text-white');
      expect(toggleButton).toHaveClass('transition-colors');
    });
  });

  describe('SimpleDocumentViewer view mode switching', () => {
    it('should start in continuous mode by default', () => {
      const mockLocalStorage = window.localStorage as any;
      mockLocalStorage.getItem.mockReturnValue(null);

      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      expect(screen.getByTestId('continuous-scroll-view')).toBeInTheDocument();
      expect(screen.queryByTestId('paged-view')).not.toBeInTheDocument();
    });

    it('should load saved view mode from localStorage', () => {
      const mockLocalStorage = window.localStorage as any;
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          viewMode: 'paged',
          defaultZoom: 1.0,
          rememberPosition: true,
        })
      );

      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      expect(screen.getByTestId('paged-view')).toBeInTheDocument();
      expect(screen.queryByTestId('continuous-scroll-view')).not.toBeInTheDocument();
    });

    it('should switch from continuous to paged mode when toggle is clicked', async () => {
      const user = userEvent.setup();
      const mockLocalStorage = window.localStorage as any;
      mockLocalStorage.getItem.mockReturnValue(null);

      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      // Initially in continuous mode
      expect(screen.getByTestId('continuous-scroll-view')).toBeInTheDocument();
      expect(screen.queryByTestId('paged-view')).not.toBeInTheDocument();

      // Click toggle button
      const toggleButton = screen.getByTestId('view-mode-toggle');
      await user.click(toggleButton);

      // Should now be in paged mode
      expect(screen.getByTestId('paged-view')).toBeInTheDocument();
      expect(screen.queryByTestId('continuous-scroll-view')).not.toBeInTheDocument();
    });

    it('should switch from paged to continuous mode when toggle is clicked', async () => {
      const user = userEvent.setup();
      const mockLocalStorage = window.localStorage as any;
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({
          viewMode: 'paged',
          defaultZoom: 1.0,
          rememberPosition: true,
        })
      );

      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      // Initially in paged mode
      expect(screen.getByTestId('paged-view')).toBeInTheDocument();
      expect(screen.queryByTestId('continuous-scroll-view')).not.toBeInTheDocument();

      // Click toggle button
      const toggleButton = screen.getByTestId('view-mode-toggle');
      await user.click(toggleButton);

      // Should now be in continuous mode
      expect(screen.getByTestId('continuous-scroll-view')).toBeInTheDocument();
      expect(screen.queryByTestId('paged-view')).not.toBeInTheDocument();
    });

    it('should preserve current page when switching modes', async () => {
      const user = userEvent.setup();
      const mockLocalStorage = window.localStorage as any;
      mockLocalStorage.getItem.mockReturnValue(null);

      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      // Navigate to page 2
      const pageInput = screen.getByTestId('page-input');
      await user.tripleClick(pageInput);
      await user.keyboard('2');

      // Verify we're on page 2
      expect(pageInput).toHaveValue(2);

      // Switch to paged mode
      const toggleButton = screen.getByTestId('view-mode-toggle');
      await user.click(toggleButton);

      // Page should still be 2
      const pageInputAfterSwitch = screen.getByTestId('page-input');
      expect(pageInputAfterSwitch).toHaveValue(2);

      // Switch back to continuous mode
      await user.click(toggleButton);

      // Page should still be 2
      const pageInputAfterSecondSwitch = screen.getByTestId('page-input');
      expect(pageInputAfterSecondSwitch).toHaveValue(2);
    });

    it('should save view mode preference to localStorage when changed', async () => {
      const user = userEvent.setup();
      const mockLocalStorage = window.localStorage as any;
      mockLocalStorage.getItem.mockReturnValue(null);

      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      // Clear any initial setItem calls
      mockLocalStorage.setItem.mockClear();

      // Click toggle button
      const toggleButton = screen.getByTestId('view-mode-toggle');
      await user.click(toggleButton);

      // Verify localStorage.setItem was called with new view mode
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'document-viewer-preferences',
        expect.stringContaining('paged')
      );

      // Verify the saved preferences contain the correct view mode
      const lastCall = mockLocalStorage.setItem.mock.calls[mockLocalStorage.setItem.mock.calls.length - 1];
      const savedPrefs = JSON.parse(lastCall[1]);
      expect(savedPrefs.viewMode).toBe('paged');
    });

    it('should update toolbar button title when mode changes', async () => {
      const user = userEvent.setup();
      const mockLocalStorage = window.localStorage as any;
      mockLocalStorage.getItem.mockReturnValue(null);

      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const toggleButton = screen.getByTestId('view-mode-toggle');

      // Initially in continuous mode
      expect(toggleButton).toHaveAttribute('title', 'Switch to paged view');

      // Click to switch to paged mode
      await user.click(toggleButton);

      // Title should update
      expect(toggleButton).toHaveAttribute('title', 'Switch to continuous scroll');

      // Click to switch back to continuous mode
      await user.click(toggleButton);

      // Title should update back
      expect(toggleButton).toHaveAttribute('title', 'Switch to paged view');
    });
  });

  describe('UI updates', () => {
    it('should render correct view component based on current mode', async () => {
      const user = userEvent.setup();
      const mockLocalStorage = window.localStorage as any;
      mockLocalStorage.getItem.mockReturnValue(null);

      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      // Initially continuous mode
      expect(screen.getByTestId('continuous-scroll-view')).toBeInTheDocument();
      expect(screen.queryByTestId('paged-view')).not.toBeInTheDocument();

      // Switch to paged mode by clicking toggle
      const toggleButton = screen.getByTestId('view-mode-toggle');
      await user.click(toggleButton);

      // Should now show paged view
      expect(screen.getByTestId('paged-view')).toBeInTheDocument();
      expect(screen.queryByTestId('continuous-scroll-view')).not.toBeInTheDocument();

      // Switch back to continuous mode
      await user.click(toggleButton);

      // Should show continuous view again
      expect(screen.getByTestId('continuous-scroll-view')).toBeInTheDocument();
      expect(screen.queryByTestId('paged-view')).not.toBeInTheDocument();
    });

    it('should handle invalid localStorage data gracefully', () => {
      const mockLocalStorage = window.localStorage as any;
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      // Should not throw error and fall back to defaults
      expect(() => {
        render(
          <SimpleDocumentViewer
            documentId="test-doc"
            documentTitle="Test Document"
            pages={mockPages}
          />
        );
      }).not.toThrow();

      // Should default to continuous mode
      expect(screen.getByTestId('continuous-scroll-view')).toBeInTheDocument();
      expect(screen.queryByTestId('paged-view')).not.toBeInTheDocument();
    });

    it('should handle missing localStorage gracefully', () => {
      const mockLocalStorage = window.localStorage as any;
      mockLocalStorage.getItem.mockReturnValue(null);

      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      // Should default to continuous mode
      expect(screen.getByTestId('continuous-scroll-view')).toBeInTheDocument();
      expect(screen.queryByTestId('paged-view')).not.toBeInTheDocument();
    });

    it('should maintain zoom level when switching view modes', async () => {
      const user = userEvent.setup();
      const mockLocalStorage = window.localStorage as any;
      mockLocalStorage.getItem.mockReturnValue(null);

      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      // Change zoom level
      const zoomInButton = screen.getByTestId('zoom-in-button');
      await user.click(zoomInButton);

      // Verify zoom level changed
      const zoomLevel = screen.getByTestId('zoom-level');
      expect(zoomLevel).toHaveTextContent('125%');

      // Switch view mode
      const toggleButton = screen.getByTestId('view-mode-toggle');
      await user.click(toggleButton);

      // Zoom level should be preserved
      const zoomLevelAfterSwitch = screen.getByTestId('zoom-level');
      expect(zoomLevelAfterSwitch).toHaveTextContent('125%');
    });
  });

  describe('Error handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      const user = userEvent.setup();
      const mockLocalStorage = window.localStorage as any;
      
      // Mock localStorage to work initially but throw error on setItem later
      mockLocalStorage.getItem.mockReturnValue(null);

      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      // Now mock setItem to throw error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      // Should still be able to toggle view mode even if saving fails
      const toggleButton = screen.getByTestId('view-mode-toggle');
      
      // This should not throw an error even though localStorage.setItem fails
      await user.click(toggleButton);

      expect(screen.getByTestId('paged-view')).toBeInTheDocument();
    });

    it('should handle empty pages array', () => {
      const mockLocalStorage = window.localStorage as any;
      mockLocalStorage.getItem.mockReturnValue(null);

      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={[]}
        />
      );

      // Should render without error
      expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
      // With empty pages, the viewer should still render but show empty state
      // The toolbar should still be present
      expect(screen.getByTestId('viewer-toolbar')).toBeInTheDocument();
    });
  });
});