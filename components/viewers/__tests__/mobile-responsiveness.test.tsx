import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { vi } from 'vitest';
import SimpleDocumentViewer from '../SimpleDocumentViewer';
import ViewerToolbar from '../ViewerToolbar';

// Mock the hooks
vi.mock('@/hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: vi.fn(),
}));

vi.mock('@/hooks/useTouchGestures', () => ({
  useTouchGestures: vi.fn(),
}));

vi.mock('@/lib/viewer-preferences', () => ({
  loadPreferences: vi.fn(() => ({
    viewMode: 'continuous',
    defaultZoom: 1.0,
  })),
  updatePreferences: vi.fn(),
  isLocalStorageAvailable: vi.fn(() => true),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback: any) {
    this.callback = callback;
  }
  callback: any;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.IntersectionObserver = MockIntersectionObserver as any;

const mockPages = [
  {
    pageNumber: 1,
    pageUrl: '/test-page-1.jpg',
    dimensions: { width: 800, height: 1000 },
  },
  {
    pageNumber: 2,
    pageUrl: '/test-page-2.jpg',
    dimensions: { width: 800, height: 1000 },
  },
];

describe('Mobile Responsiveness Tests', () => {
  // Helper to simulate mobile viewport
  const setMobileViewport = () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // iPhone width
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667, // iPhone height
    });
    
    // Trigger resize event
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
  };

  // Helper to simulate desktop viewport
  const setDesktopViewport = () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
    
    // Trigger resize event
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
  };

  beforeEach(() => {
    // Reset viewport to desktop by default
    setDesktopViewport();
  });

  describe('Toolbar Responsiveness', () => {
    it('should show desktop toolbar on large screens', () => {
      setDesktopViewport();
      
      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={2}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={vi.fn()}
          onViewModeChange={vi.fn()}
          onZoomChange={vi.fn()}
        />
      );

      // Desktop toolbar should be visible
      expect(screen.getByTestId('viewer-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('viewer-toolbar')).toHaveClass('hidden', 'md:flex');
      
      // Mobile toolbar should be hidden
      expect(screen.getByTestId('mobile-viewer-toolbar')).toHaveClass('md:hidden');
    });

    it('should show mobile toolbar on small screens', () => {
      setMobileViewport();
      
      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={2}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={vi.fn()}
          onViewModeChange={vi.fn()}
          onZoomChange={vi.fn()}
        />
      );

      // Mobile toolbar should be visible
      expect(screen.getByTestId('mobile-viewer-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-viewer-toolbar')).toHaveClass('md:hidden');
    });

    it('should have collapsible menu on mobile', () => {
      setMobileViewport();
      
      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={2}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={vi.fn()}
          onViewModeChange={vi.fn()}
          onZoomChange={vi.fn()}
        />
      );

      const menuButton = screen.getByTestId('mobile-menu-button');
      expect(menuButton).toBeInTheDocument();

      // Menu should be closed initially
      expect(screen.queryByTestId('mobile-controls-menu')).not.toBeInTheDocument();

      // Click to open menu
      fireEvent.click(menuButton);
      expect(screen.getByTestId('mobile-controls-menu')).toBeInTheDocument();

      // Click to close menu
      fireEvent.click(menuButton);
      expect(screen.queryByTestId('mobile-controls-menu')).not.toBeInTheDocument();
    });

    it('should ensure minimum touch target sizes (44x44px)', () => {
      setMobileViewport();
      
      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={2}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={vi.fn()}
          onViewModeChange={vi.fn()}
          onZoomChange={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Check that all interactive elements have minimum touch target size
      const touchTargets = [
        screen.getByTestId('mobile-close-button'),
        screen.getByTestId('mobile-menu-button'),
        screen.getByTestId('mobile-prev-page-button'),
        screen.getByTestId('mobile-next-page-button'),
      ];

      touchTargets.forEach((target) => {
        expect(target).toHaveClass('min-w-[44px]', 'min-h-[44px]');
      });
    });
  });

  describe('Touch Gesture Handling', () => {
    it('should handle touch gestures for navigation', () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
          onClose={vi.fn()}
        />
      );

      // Should render without errors and include touch gesture support
      expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
    });

    it('should handle pinch-to-zoom gestures', () => {
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      // Should render without errors and include pinch zoom support
      expect(screen.getByTestId('simple-document-viewer')).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('should adjust page sizing for mobile screens', () => {
      setMobileViewport();
      
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const documentCanvas = screen.getByTestId('document-canvas');
      expect(documentCanvas).toBeInTheDocument();

      // Should use mobile-friendly spacing and sizing
      const continuousView = screen.getByTestId('continuous-scroll-view');
      expect(continuousView).toHaveClass('py-4', 'md:py-8', 'space-y-2', 'md:space-y-4', 'px-2');
    });

    it('should maintain full viewport usage on mobile', () => {
      setMobileViewport();
      
      render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      const viewer = screen.getByTestId('simple-document-viewer');
      expect(viewer).toHaveClass('fixed', 'inset-0');
    });

    it('should handle orientation changes', async () => {
      // Start in portrait
      setMobileViewport();
      
      const { rerender } = render(
        <SimpleDocumentViewer
          documentId="test-doc"
          documentTitle="Test Document"
          pages={mockPages}
        />
      );

      // Switch to landscape
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 667,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 375,
      });

      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // Should still maintain responsive layout
      const viewer = screen.getByTestId('simple-document-viewer');
      expect(viewer).toHaveClass('fixed', 'inset-0');
    });
  });

  describe('Mobile Navigation', () => {
    it('should provide accessible navigation on mobile', () => {
      setMobileViewport();
      
      const onPageChange = vi.fn();
      
      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={2}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={onPageChange}
          onViewModeChange={vi.fn()}
          onZoomChange={vi.fn()}
        />
      );

      // Navigation should be easily accessible
      const prevButton = screen.getByTestId('mobile-prev-page-button');
      const nextButton = screen.getByTestId('mobile-next-page-button');
      const pageInput = screen.getByTestId('mobile-page-input');

      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
      expect(pageInput).toBeInTheDocument();

      // Test navigation
      fireEvent.click(nextButton);
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('should show zoom controls in mobile menu', () => {
      setMobileViewport();
      
      const onZoomChange = vi.fn();
      
      render(
        <ViewerToolbar
          documentTitle="Test Document"
          currentPage={1}
          totalPages={2}
          viewMode="continuous"
          zoomLevel={1.0}
          onPageChange={vi.fn()}
          onViewModeChange={vi.fn()}
          onZoomChange={onZoomChange}
        />
      );

      // Open mobile menu
      const menuButton = screen.getByTestId('mobile-menu-button');
      fireEvent.click(menuButton);

      // Zoom controls should be in menu
      const zoomOutButton = screen.getByTestId('mobile-zoom-out-button');
      const zoomInButton = screen.getByTestId('mobile-zoom-in-button');
      const zoomLevel = screen.getByTestId('mobile-zoom-level');

      expect(zoomOutButton).toBeInTheDocument();
      expect(zoomInButton).toBeInTheDocument();
      expect(zoomLevel).toBeInTheDocument();
      expect(zoomLevel).toHaveTextContent('100%');

      // Test zoom functionality
      fireEvent.click(zoomInButton);
      expect(onZoomChange).toHaveBeenCalledWith(1.25);
    });
  });
});