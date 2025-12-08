import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PagedView from '../PagedView';
import { PageData } from '../SimpleDocumentViewer';

/**
 * Unit tests for PagedView
 * 
 * Tests:
 * - Single page rendering
 * - Page centering
 * - Page transitions
 * 
 * Requirements: 6.2, 6.3
 */
describe('PagedView', () => {
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

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Single Page Rendering', () => {
    it('should render only the current page', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={2}
          zoomLevel={1.0}
        />
      );

      // Verify only page 2 is rendered
      const page2 = screen.getByTestId('page-2');
      expect(page2).toBeInTheDocument();

      // Verify pages 1 and 3 are not rendered
      expect(screen.queryByTestId('page-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('page-3')).not.toBeInTheDocument();
    });

    it('should render page with correct image source', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      const page = screen.getByTestId('page-1');
      const img = page.querySelector('img');
      
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/page1.jpg');
      expect(img).toHaveAttribute('alt', 'Page 1 of document');
    });

    it('should render page with correct dimensions based on zoom level', () => {
      const zoomLevel = 1.5;
      
      render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={zoomLevel}
        />
      );

      const page = screen.getByTestId('page-1');
      const expectedWidth = mockPages[0].dimensions.width * zoomLevel;
      const expectedHeight = mockPages[0].dimensions.height * zoomLevel;

      expect(page).toHaveStyle({
        width: `${expectedWidth}px`,
        height: `${expectedHeight}px`,
      });
    });

    it('should render page with white background and shadow', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      const page = screen.getByTestId('page-1');
      expect(page).toHaveClass('bg-white', 'shadow-2xl');
    });

    it('should render page with max width and height constraints', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      const page = screen.getByTestId('page-1');
      expect(page).toHaveStyle({
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'calc(100vh - 120px)',
      });
    });

    it('should prevent image dragging and context menu', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      const page = screen.getByTestId('page-1');
      const img = page.querySelector('img');
      
      expect(img).toHaveAttribute('draggable', 'false');
      expect(img).toHaveStyle({ userSelect: 'none' });
    });

    it('should handle different page numbers correctly', () => {
      const { rerender } = render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      expect(screen.getByTestId('page-1')).toBeInTheDocument();

      rerender(
        <PagedView
          pages={mockPages}
          currentPage={3}
          zoomLevel={1.0}
        />
      );

      expect(screen.queryByTestId('page-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('page-3')).toBeInTheDocument();
    });

    it('should handle invalid page number gracefully', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={99}
          zoomLevel={1.0}
        />
      );

      const errorView = screen.getByTestId('paged-view-error');
      expect(errorView).toBeInTheDocument();
      expect(errorView).toHaveTextContent('Page not found');
      expect(errorView).toHaveTextContent('Page 99 does not exist');
    });

    it('should handle page number 0 gracefully', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={0}
          zoomLevel={1.0}
        />
      );

      const errorView = screen.getByTestId('paged-view-error');
      expect(errorView).toBeInTheDocument();
    });

    it('should handle negative page number gracefully', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={-1}
          zoomLevel={1.0}
        />
      );

      const errorView = screen.getByTestId('paged-view-error');
      expect(errorView).toBeInTheDocument();
    });
  });

  describe('Page Centering', () => {
    it('should center page horizontally and vertically', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      const container = screen.getByTestId('paged-view');
      expect(container).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('should use full height for centering', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      const container = screen.getByTestId('paged-view');
      expect(container).toHaveClass('h-full');
    });

    it('should have dark background', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      const container = screen.getByTestId('paged-view');
      expect(container).toHaveClass('bg-gray-800');
    });

    it('should have padding around page', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      const container = screen.getByTestId('paged-view');
      expect(container).toHaveClass('p-2', 'md:p-4');
    });

    it('should maintain centering with different zoom levels', () => {
      const { rerender } = render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      let container = screen.getByTestId('paged-view');
      expect(container).toHaveClass('items-center', 'justify-center');

      rerender(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={2.0}
        />
      );

      container = screen.getByTestId('paged-view');
      expect(container).toHaveClass('items-center', 'justify-center');
    });

    it('should maintain centering with different page sizes', () => {
      const pagesWithDifferentSizes: PageData[] = [
        {
          pageNumber: 1,
          pageUrl: 'https://example.com/page1.jpg',
          dimensions: { width: 600, height: 800 },
        },
        {
          pageNumber: 2,
          pageUrl: 'https://example.com/page2.jpg',
          dimensions: { width: 1200, height: 1600 },
        },
      ];

      const { rerender } = render(
        <PagedView
          pages={pagesWithDifferentSizes}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      let container = screen.getByTestId('paged-view');
      expect(container).toHaveClass('items-center', 'justify-center');

      rerender(
        <PagedView
          pages={pagesWithDifferentSizes}
          currentPage={2}
          zoomLevel={1.0}
        />
      );

      container = screen.getByTestId('paged-view');
      expect(container).toHaveClass('items-center', 'justify-center');
    });
  });

  describe('Page Transitions', () => {
    it('should have transition-opacity class for smooth transitions', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      const container = screen.getByTestId('paged-view');
      expect(container).toHaveClass('transition-opacity', 'duration-200');
    });

    it('should trigger fade effect when page changes', () => {
      const { rerender } = render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      // Advance initial timer to complete first render
      vi.advanceTimersByTime(50);

      let container = screen.getByTestId('paged-view');
      
      // After initial render, opacity should be 1
      expect(container).toHaveStyle({ opacity: '1' });

      // Change page
      rerender(
        <PagedView
          pages={mockPages}
          currentPage={2}
          zoomLevel={1.0}
        />
      );

      container = screen.getByTestId('paged-view');
      
      // Should start with opacity 0
      expect(container).toHaveStyle({ opacity: '0' });

      // Advance timers to trigger fade-in
      vi.advanceTimersByTime(50);

      // After fade-in delay, opacity should be 1
      expect(container).toHaveStyle({ opacity: '1' });
    });

    it('should complete transition within expected time', () => {
      const { rerender } = render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      // Complete initial render
      vi.advanceTimersByTime(50);

      rerender(
        <PagedView
          pages={mockPages}
          currentPage={2}
          zoomLevel={1.0}
        />
      );

      // Advance by fade-in delay
      vi.advanceTimersByTime(50);

      const container = screen.getByTestId('paged-view');
      expect(container).toHaveStyle({ opacity: '1' });
    });

    it('should handle rapid page changes gracefully', () => {
      const { rerender } = render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      // Complete initial render
      vi.advanceTimersByTime(50);

      // Rapidly change pages
      rerender(
        <PagedView
          pages={mockPages}
          currentPage={2}
          zoomLevel={1.0}
        />
      );

      vi.advanceTimersByTime(25);

      rerender(
        <PagedView
          pages={mockPages}
          currentPage={3}
          zoomLevel={1.0}
        />
      );

      vi.advanceTimersByTime(50);

      const container = screen.getByTestId('paged-view');
      expect(container).toHaveStyle({ opacity: '1' });

      // Should show page 3
      expect(screen.getByTestId('page-3')).toBeInTheDocument();
    });

    it('should clean up transition timer on unmount', () => {
      const { unmount } = render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      // Change page to trigger timer
      const { rerender } = render(
        <PagedView
          pages={mockPages}
          currentPage={2}
          zoomLevel={1.0}
        />
      );

      // Unmount before timer completes
      unmount();

      // Advance timers - should not cause errors
      vi.advanceTimersByTime(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty pages array', () => {
      render(
        <PagedView
          pages={[]}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      const errorView = screen.getByTestId('paged-view-error');
      expect(errorView).toBeInTheDocument();
    });

    it('should handle single page', () => {
      const singlePage = [mockPages[0]];

      render(
        <PagedView
          pages={singlePage}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      const page = screen.getByTestId('page-1');
      expect(page).toBeInTheDocument();
    });

    it('should handle very small zoom level', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={0.5}
        />
      );

      const page = screen.getByTestId('page-1');
      expect(page).toHaveStyle({
        width: '400px', // 800 * 0.5
        height: '500px', // 1000 * 0.5
      });
    });

    it('should handle very large zoom level', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={3.0}
        />
      );

      const page = screen.getByTestId('page-1');
      expect(page).toHaveStyle({
        width: '2400px', // 800 * 3.0
        height: '3000px', // 1000 * 3.0
      });
    });

    it('should handle pages with different dimensions', () => {
      const mixedPages: PageData[] = [
        {
          pageNumber: 1,
          pageUrl: 'https://example.com/page1.jpg',
          dimensions: { width: 600, height: 800 },
        },
        {
          pageNumber: 2,
          pageUrl: 'https://example.com/page2.jpg',
          dimensions: { width: 1200, height: 1600 },
        },
      ];

      const { rerender } = render(
        <PagedView
          pages={mixedPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      let page = screen.getByTestId('page-1');
      expect(page).toHaveStyle({ width: '600px', height: '800px' });

      rerender(
        <PagedView
          pages={mixedPages}
          currentPage={2}
          zoomLevel={1.0}
        />
      );

      page = screen.getByTestId('page-2');
      expect(page).toHaveStyle({ width: '1200px', height: '1600px' });
    });

    it('should handle zoom level changes on same page', () => {
      const { rerender } = render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      let page = screen.getByTestId('page-1');
      expect(page).toHaveStyle({ width: '800px', height: '1000px' });

      rerender(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={2.0}
        />
      );

      page = screen.getByTestId('page-1');
      expect(page).toHaveStyle({ width: '1600px', height: '2000px' });
    });

    it('should handle pages with unusual aspect ratios', () => {
      const widePages: PageData[] = [
        {
          pageNumber: 1,
          pageUrl: 'https://example.com/page1.jpg',
          dimensions: { width: 2000, height: 500 }, // Very wide
        },
      ];

      render(
        <PagedView
          pages={widePages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      const page = screen.getByTestId('page-1');
      expect(page).toHaveStyle({ width: '2000px', height: '500px' });
      expect(page).toHaveStyle({ maxWidth: 'calc(100vw - 16px)', maxHeight: 'calc(100vh - 120px)' });
    });

    it('should handle pages with very small dimensions', () => {
      const tinyPages: PageData[] = [
        {
          pageNumber: 1,
          pageUrl: 'https://example.com/page1.jpg',
          dimensions: { width: 100, height: 100 },
        },
      ];

      render(
        <PagedView
          pages={tinyPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      const page = screen.getByTestId('page-1');
      expect(page).toHaveStyle({ width: '100px', height: '100px' });
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for images', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={2}
          zoomLevel={1.0}
        />
      );

      const page = screen.getByTestId('page-2');
      const img = page.querySelector('img');
      
      expect(img).toHaveAttribute('alt', 'Page 2 of document');
    });

    it('should prevent text selection on images', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={1}
          zoomLevel={1.0}
        />
      );

      const page = screen.getByTestId('page-1');
      const img = page.querySelector('img');
      
      expect(img).toHaveStyle({ userSelect: 'none' });
    });

    it('should have descriptive error message for invalid pages', () => {
      render(
        <PagedView
          pages={mockPages}
          currentPage={999}
          zoomLevel={1.0}
        />
      );

      expect(screen.getByText('Page not found')).toBeInTheDocument();
      expect(screen.getByText('Page 999 does not exist')).toBeInTheDocument();
    });
  });
});
