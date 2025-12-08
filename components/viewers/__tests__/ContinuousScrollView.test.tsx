import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ContinuousScrollView from '../ContinuousScrollView';
import { PageData } from '../SimpleDocumentViewer';

/**
 * Unit tests for ContinuousScrollView
 * 
 * Tests:
 * - Page rendering in vertical layout
 * - Lazy loading behavior
 * - IntersectionObserver integration
 * 
 * Requirements: 2.1, 2.3, 2.4
 */
describe('ContinuousScrollView', () => {
  let mockIntersectionObserver: any;
  let observerCallback: IntersectionObserverCallback;
  let observedElements: Map<Element, IntersectionObserverEntry>;

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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper to simulate page becoming visible
   */
  const simulatePageVisible = (pageNumber: number, intersectionRatio: number = 0.5) => {
    const element = Array.from(observedElements.keys()).find(
      (el) => el.getAttribute('data-page') === String(pageNumber)
    );

    if (element && observerCallback) {
      const entry = observedElements.get(element)!;
      observerCallback(
        [
          {
            ...entry,
            isIntersecting: true,
            intersectionRatio,
          },
        ],
        {} as IntersectionObserver
      );
    }
  };

  describe('Page Rendering in Vertical Layout', () => {
    it('should render all pages in vertical layout', () => {
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // Verify container exists
      const container = screen.getByTestId('continuous-scroll-view');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('flex', 'flex-col', 'items-center');

      // Verify all pages are rendered
      mockPages.forEach((page) => {
        const pageElement = screen.getByTestId(`page-${page.pageNumber}`);
        expect(pageElement).toBeInTheDocument();
        expect(pageElement).toHaveAttribute('data-page', String(page.pageNumber));
      });
    });

    it('should render pages with correct dimensions based on zoom level', () => {
      const onPageVisible = vi.fn();
      const zoomLevel = 1.5;

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={zoomLevel}
          onPageVisible={onPageVisible}
        />
      );

      mockPages.forEach((page) => {
        const pageElement = screen.getByTestId(`page-${page.pageNumber}`);
        const expectedWidth = page.dimensions.width * zoomLevel;
        const expectedHeight = page.dimensions.height * zoomLevel;

        expect(pageElement).toHaveStyle({
          width: `${expectedWidth}px`,
          height: `${expectedHeight}px`,
        });
      });
    });

    it('should render pages with white background and shadow', () => {
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      mockPages.forEach((page) => {
        const pageElement = screen.getByTestId(`page-${page.pageNumber}`);
        expect(pageElement).toHaveClass('bg-white', 'shadow-2xl');
      });
    });

    it('should render pages with spacing between them', () => {
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      const container = screen.getByTestId('continuous-scroll-view');
      expect(container).toHaveClass('space-y-2', 'md:space-y-4');
    });

    it('should render container with dark background', () => {
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      const container = screen.getByTestId('continuous-scroll-view');
      expect(container).toHaveStyle({ backgroundColor: '#1f2937' });
    });
  });

  describe('Lazy Loading Behavior', () => {
    it('should initially show placeholder for non-visible pages', () => {
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // Page 1 is visible by default (initial state)
      // Pages 2 and 3 should show placeholders initially
      const page2 = screen.getByTestId('page-2');
      const page3 = screen.getByTestId('page-3');

      // Check for placeholder text
      expect(page2).toHaveTextContent('Loading page 2...');
      expect(page3).toHaveTextContent('Loading page 3...');
    });

    it('should load page image when page becomes visible', async () => {
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // Simulate page 2 becoming visible
      simulatePageVisible(2, 0.1);

      await waitFor(() => {
        const page2 = screen.getByTestId('page-2');
        const img = page2.querySelector('img');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://example.com/page2.jpg');
      });
    });

    it('should set loading="lazy" on page images', async () => {
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // Simulate page becoming visible
      simulatePageVisible(1, 0.5);

      await waitFor(() => {
        const page1 = screen.getByTestId('page-1');
        const img = page1.querySelector('img');
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });

    it('should prevent image dragging and context menu', async () => {
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // Simulate page becoming visible
      simulatePageVisible(1, 0.5);

      await waitFor(() => {
        const page1 = screen.getByTestId('page-1');
        const img = page1.querySelector('img');
        expect(img).toHaveAttribute('draggable', 'false');
        expect(img).toHaveStyle({ userSelect: 'none' });
      });
    });
  });

  describe('IntersectionObserver Integration', () => {
    it('should create IntersectionObserver on mount', () => {
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // Verify that IntersectionObserver was instantiated by checking observedElements
      expect(observedElements.size).toBeGreaterThan(0);
    });

    it('should observe all page elements', () => {
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // Verify observe was called for each page
      expect(observedElements.size).toBe(mockPages.length);
    });

    it('should call onPageVisible when page reaches 50% visibility', async () => {
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // Simulate page 2 becoming 50% visible
      simulatePageVisible(2, 0.5);

      await waitFor(() => {
        expect(onPageVisible).toHaveBeenCalledWith(2);
      });
    });

    it('should not call onPageVisible when page is less than 50% visible', async () => {
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      // Clear any initial calls
      onPageVisible.mockClear();

      // Simulate page 2 becoming only 30% visible
      simulatePageVisible(2, 0.3);

      // Wait a bit to ensure callback is not called
      await new Promise((resolve) => setTimeout(resolve, 50));

      // onPageVisible should not be called for < 50% visibility
      expect(onPageVisible).not.toHaveBeenCalled();
    });

    it('should disconnect observer on unmount', () => {
      const onPageVisible = vi.fn();
      let disconnectSpy: any;

      // Capture the disconnect method
      const OriginalObserver = global.IntersectionObserver;
      global.IntersectionObserver = class extends (OriginalObserver as any) {
        constructor(callback: IntersectionObserverCallback) {
          super(callback);
          disconnectSpy = vi.spyOn(this, 'disconnect');
        }
      } as any;

      const { unmount } = render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      unmount();

      expect(disconnectSpy).toHaveBeenCalled();

      // Restore
      global.IntersectionObserver = OriginalObserver;
    });

    it('should use correct threshold values', () => {
      const onPageVisible = vi.fn();
      let capturedOptions: any;

      // Capture constructor options
      const OriginalObserver = global.IntersectionObserver;
      global.IntersectionObserver = class {
        constructor(callback: IntersectionObserverCallback, options?: any) {
          capturedOptions = options;
          return new (OriginalObserver as any)(callback, options);
        }
      } as any;

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      expect(capturedOptions.threshold).toEqual([0.1, 0.5]);

      // Restore
      global.IntersectionObserver = OriginalObserver;
    });

    it('should use correct rootMargin for preloading', () => {
      const onPageVisible = vi.fn();
      let capturedOptions: any;

      // Capture constructor options
      const OriginalObserver = global.IntersectionObserver;
      global.IntersectionObserver = class {
        constructor(callback: IntersectionObserverCallback, options?: any) {
          capturedOptions = options;
          return new (OriginalObserver as any)(callback, options);
        }
      } as any;

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      expect(capturedOptions.rootMargin).toBe('100px');

      // Restore
      global.IntersectionObserver = OriginalObserver;
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty pages array', () => {
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={[]}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      const container = screen.getByTestId('continuous-scroll-view');
      expect(container).toBeInTheDocument();
      expect(container.children.length).toBe(0);
    });

    it('should handle single page', () => {
      const onPageVisible = vi.fn();
      const singlePage = [mockPages[0]];

      render(
        <ContinuousScrollView
          pages={singlePage}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      const page = screen.getByTestId('page-1');
      expect(page).toBeInTheDocument();
    });

    it('should handle very small zoom level', () => {
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={0.5}
          onPageVisible={onPageVisible}
        />
      );

      const page1 = screen.getByTestId('page-1');
      expect(page1).toHaveStyle({
        width: '400px', // 800 * 0.5
        height: '500px', // 1000 * 0.5
      });
    });

    it('should handle very large zoom level', () => {
      const onPageVisible = vi.fn();

      render(
        <ContinuousScrollView
          pages={mockPages}
          zoomLevel={3.0}
          onPageVisible={onPageVisible}
        />
      );

      const page1 = screen.getByTestId('page-1');
      expect(page1).toHaveStyle({
        width: '2400px', // 800 * 3.0
        height: '3000px', // 1000 * 3.0
      });
    });

    it('should handle pages with different dimensions', () => {
      const onPageVisible = vi.fn();
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

      render(
        <ContinuousScrollView
          pages={mixedPages}
          zoomLevel={1.0}
          onPageVisible={onPageVisible}
        />
      );

      const page1 = screen.getByTestId('page-1');
      const page2 = screen.getByTestId('page-2');

      expect(page1).toHaveStyle({ width: '600px', height: '800px' });
      expect(page2).toHaveStyle({ width: '1200px', height: '1600px' });
    });
  });
});
